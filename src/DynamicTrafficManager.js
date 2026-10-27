import * as THREE from 'three';
import { makeCar, makeOkada, makeBus } from './LowPolyLibrary.js';

export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 6;
    this.carModel = null;
    this.okadaModel = null;
    this.ready = false;
  }

  async init() {
    // Preload GLBs first (short race), then spawn
    try {
      const [car, okada] = await Promise.race([
        Promise.all([
          this.assets.loadGLB('/assets/models/traffic_vehicle.glb', { scale: 1.1 }),
          this.assets.loadGLB('/assets/models/okada.glb', { scale: 1.0 })
        ]),
        new Promise((r) => setTimeout(() => r([null, null]), 4000))
      ]);
      this.carModel = car;
      this.okadaModel = okada;
    } catch (e) {}

    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;
  }

  _meshFor(kind) {
    if (kind === 'okada' && this.okadaModel) return this.okadaModel.clone(true);
    if (kind === 'car' && this.carModel) return this.carModel.clone(true);
    if (kind === 'okada') return makeOkada();
    if (kind === 'bus') return makeBus();
    return makeCar();
  }

  _spawn(initial) {
    const roll = Math.random();
    const kind = roll > 0.78 ? 'okada' : roll > 0.92 ? 'bus' : 'car';
    const mesh = this._meshFor(kind);
    const lane = Math.random() > 0.5 ? -3.5 : 3.5;
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 20 + Math.random() * 200 : playerZ + 140 + Math.random() * 80;
    const opposite = Math.random() > 0.45;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    this.vehicles.push({
      mesh,
      speed: opposite ? -(8 + Math.random() * 12) : (6 + Math.random() * 11),
      laneX: lane
    });
  }

  update(delta, horn) {
    if (!this.ready) return;
    const playerZ = this.player.group.position.z;
    const dt = Math.min(delta, 0.05);
    this.vehicles.forEach((v) => {
      v.mesh.position.z += v.speed * dt;
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 30) {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX * 1.7, 0.1);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.04);
      }
      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 160;
      if (v.mesh.position.z < playerZ - 40 || v.mesh.position.z > playerZ + 280) {
        v.mesh.position.z = playerZ + 150 + Math.random() * 70;
        v.mesh.position.x = v.laneX;
        v.mesh.visible = true;
      }
    });
  }
}
