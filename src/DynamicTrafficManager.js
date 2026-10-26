import * as THREE from 'three';

export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 16;
    this.carModel = null;
    this.okadaModel = null;
    this.ready = false;
  }

  async init() {
    // Spawn procedural immediately
    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;

    // Upgrade to real GLBs when ready
    const [car, okada] = await Promise.all([
      this.assets.loadGLB('/assets/models/traffic_vehicle.glb', { scale: 1.15, castShadow: true }),
      this.assets.loadGLB('/assets/models/okada.glb', { scale: 1.05, castShadow: true })
    ]);
    this.carModel = car;
    this.okadaModel = okada;

    // Respawn a few with real models
    if (car || okada) {
      for (let i = 0; i < 6 && i < this.vehicles.length; i++) {
        const v = this.vehicles[i];
        this.scene.remove(v.mesh);
        this.vehicles.splice(i, 1);
        this._spawn(false);
      }
    }
  }

  _fallback(isOkada) {
    const g = new THREE.Group();
    if (isOkada) {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.95, 1.7),
        new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.45, metalness: 0.2 })
      );
      body.position.y = 0.65;
      body.castShadow = true;
      g.add(body);
      const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      for (const [x, z] of [[0, 0.55], [0, -0.55]]) {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.28, z);
        g.add(w);
      }
    } else {
      const colors = [0xe53935, 0x1e88e5, 0xffffff, 0x43a047, 0xffb300, 0x6d4c41];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.2, 4.0),
        new THREE.MeshStandardMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          roughness: 0.4,
          metalness: 0.3
        })
      );
      body.position.y = 0.75;
      body.castShadow = true;
      g.add(body);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.7, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.3, metalness: 0.4 })
      );
      cabin.position.set(0, 1.45, -0.3);
      cabin.castShadow = true;
      g.add(cabin);
    }
    return g;
  }

  _spawn(initial) {
    const isOkada = Math.random() > 0.5;
    let mesh;
    if (isOkada && this.okadaModel) mesh = this.okadaModel.clone(true);
    else if (!isOkada && this.carModel) mesh = this.carModel.clone(true);
    else mesh = this._fallback(isOkada);

    const lane = Math.random() > 0.5 ? -3.6 : 3.6;
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 30 + Math.random() * 300 : playerZ + 160 + Math.random() * 120;
    const opposite = Math.random() > 0.4;
    mesh.position.set(lane + (Math.random() - 0.5), 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    this.vehicles.push({
      mesh,
      speed: opposite ? -(10 + Math.random() * 12) : (8 + Math.random() * 10),
      laneX: lane
    });
  }

  update(delta, horn) {
    if (!this.ready) return;
    const playerZ = this.player.group.position.z;
    const dt = Math.min(delta, 0.05);
    this.vehicles.forEach((v) => {
      v.mesh.position.z += v.speed * dt;
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 22) {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX * 1.6, 0.06);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.03);
      }
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 340) {
        v.mesh.position.z = playerZ + 170 + Math.random() * 90;
        v.mesh.position.x = v.laneX;
      }
    });
  }
}
