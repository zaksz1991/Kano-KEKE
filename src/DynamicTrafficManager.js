import * as THREE from 'three';

/**
 * Dynamic Traffic Manager with object pooling + real GLB support
 * - Cars / okadas driving opposite or same direction
 * - Horn reaction (swerve)
 * - Recycling far behind player
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 14;
    this.ready = false;

    this.carModel = null;
    this.okadaModel = null;
  }

  async init() {
    // Spawn procedural traffic immediately
    for (let i = 0; i < this.maxVehicles; i++) {
      this._spawnVehicle(true);
    }
    this.ready = true;

    // Optional real models in background
    this.assets.loadGLB('/assets/models/traffic_vehicle.glb', { scale: 1.1, castShadow: true })
      .then((m) => { if (m) this.carModel = m; })
      .catch(() => {});
    this.assets.loadGLB('/assets/models/okada.glb', { scale: 1.0, castShadow: true })
      .then((m) => { if (m) this.okadaModel = m; })
      .catch(() => {});
  }

  _createFallbackVehicle(isOkada) {
    const g = new THREE.Group();
    if (isOkada) {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 1.1, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6 })
      );
      body.position.y = 0.7;
      body.castShadow = true;
      g.add(body);
    } else {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.3, 4.2),
        new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.5 })
      );
      body.position.y = 0.85;
      body.castShadow = true;
      g.add(body);
    }
    return g;
  }

  _spawnVehicle(initial = false) {
    const isOkada = Math.random() > 0.55;
    let mesh;
    if (isOkada && this.okadaModel) {
      mesh = this.okadaModel.clone(true);
    } else if (!isOkada && this.carModel) {
      mesh = this.carModel.clone(true);
    } else {
      mesh = this._createFallbackVehicle(isOkada);
    }

    const lane = Math.random() > 0.5 ? -3.8 : 3.8;
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial
      ? playerZ + 40 + Math.random() * 280
      : playerZ + 180 + Math.random() * 120;

    mesh.position.set(lane + (Math.random() - 0.5) * 1.2, 0, z);
    // Face the direction of travel (traffic coming toward player = opposite)
    const opposite = Math.random() > 0.35;
    mesh.rotation.y = opposite ? Math.PI : 0;

    this.scene.add(mesh);

    this.vehicles.push({
      mesh,
      speed: opposite ? -(8 + Math.random() * 10) : (6 + Math.random() * 9),
      laneX: lane,
      isOkada
    });
  }

  update(delta, playerHornActive = false) {
    if (!this.ready) return;
    const playerZ = this.player.group.position.z;
    const dt = Math.min(delta, 0.05);

    this.vehicles.forEach((v) => {
      v.mesh.position.z += v.speed * dt;

      // Horn reaction – gentle swerve
      if (playerHornActive && Math.abs(v.mesh.position.z - playerZ) < 25) {
        const targetX = v.laneX * 1.55;
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, targetX, 0.04);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.02);
      }

      // Recycle
      if (v.mesh.position.z < playerZ - 45 || v.mesh.position.z > playerZ + 320) {
        v.mesh.position.z = playerZ + 160 + Math.random() * 100;
        v.mesh.position.x = v.laneX;
        // occasional direction flip on recycle
        if (Math.random() > 0.7) {
          v.speed = -Math.abs(v.speed);
          v.mesh.rotation.y = Math.PI;
        } else if (Math.random() > 0.5) {
          v.speed = Math.abs(v.speed);
          v.mesh.rotation.y = 0;
        }
      }
    });
  }
}
