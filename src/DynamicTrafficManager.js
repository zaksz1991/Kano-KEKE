import * as THREE from 'three';

export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 14;
    this.carModel = null;
    this.okadaModel = null;
    this.ready = false;
  }

  async init() {
    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;

    const [car, okada] = await Promise.all([
      this.assets.loadGLB('/assets/models/traffic_vehicle.glb', { scale: 1.15, castShadow: true }),
      this.assets.loadGLB('/assets/models/okada.glb', { scale: 1.05, castShadow: true })
    ]);
    this.carModel = car;
    this.okadaModel = okada;
    if (car || okada) {
      // Replace first few fallbacks with real models
      for (let i = 0; i < Math.min(5, this.vehicles.length); i++) {
        const v = this.vehicles[i];
        this.scene.remove(v.mesh);
        this.vehicles.splice(i, 1);
        this._spawn(false);
      }
    }
  }

  _fallbackCar() {
    const g = new THREE.Group();
    const colors = [0xe53935, 0x1e88e5, 0xffffff, 0x43a047, 0xffb300, 0x6d4c41, 0x37474f];
    const bodyCol = colors[Math.floor(Math.random() * colors.length)];
    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.55, 4.0),
      new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.4, metalness: 0.25 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.65, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.35, metalness: 0.3 })
    );
    cabin.position.set(0, 1.1, -0.2);
    cabin.castShadow = true;
    g.add(cabin);
    // Windows (slightly inset)
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.45, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.45, roughness: 0.15 })
    );
    glass.position.set(0, 1.15, -0.15);
    g.add(glass);
    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    for (const [x, z] of [[-0.75, 1.2], [0.75, 1.2], [-0.75, -1.2], [0.75, -1.2]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.32, z);
      g.add(w);
    }
    // Headlights
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.15, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xffe082, emissiveIntensity: 0.5 })
    );
    hl.position.set(-0.5, 0.55, 2.0);
    g.add(hl);
    const hl2 = hl.clone();
    hl2.position.x = 0.5;
    g.add(hl2);
    return g;
  }

  _fallbackOkada() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x00acc1, roughness: 0.4, metalness: 0.3 })
    );
    body.position.y = 0.7;
    body.castShadow = true;
    g.add(body);
    const tank = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x00838f })
    );
    tank.position.set(0, 1.0, 0.2);
    g.add(tank);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const z of [0.55, -0.55]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.28, z);
      g.add(w);
    }
    // Rider
    const rider = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1565c0 })
    );
    rider.position.set(0, 1.15, -0.1);
    g.add(rider);
    return g;
  }

  _fallbackBus() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 7),
      new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.55 })
    );
    body.position.y = 1.2;
    body.castShadow = true;
    g.add(body);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.25, 0.25, 7.05),
      new THREE.MeshStandardMaterial({ color: 0xc62828 })
    );
    stripe.position.y = 1.5;
    g.add(stripe);
    return g;
  }

  _spawn(initial) {
    const roll = Math.random();
    let kind = 'car';
    if (roll > 0.72) kind = 'okada';
    else if (roll > 0.9) kind = 'bus';

    let mesh;
    if (kind === 'okada' && this.okadaModel) mesh = this.okadaModel.clone(true);
    else if (kind === 'car' && this.carModel) mesh = this.carModel.clone(true);
    else if (kind === 'okada') mesh = this._fallbackOkada();
    else if (kind === 'bus') mesh = this._fallbackBus();
    else mesh = this._fallbackCar();

    const lane = Math.random() > 0.5 ? -3.6 : 3.6;
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 25 + Math.random() * 280 : playerZ + 150 + Math.random() * 100;
    const opposite = Math.random() > 0.45;
    mesh.position.set(lane + (Math.random() - 0.5) * 0.3, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    this.vehicles.push({
      mesh,
      speed: opposite ? -(9 + Math.random() * 14) : (7 + Math.random() * 12),
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
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX * 1.55, 0.06);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.03);
      }
      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 200;
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 340) {
        v.mesh.position.z = playerZ + 170 + Math.random() * 90;
        v.mesh.position.x = v.laneX;
        v.mesh.visible = true;
      }
    });
  }
}
