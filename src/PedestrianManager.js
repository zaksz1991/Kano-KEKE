import * as THREE from 'three';

/** Pedestrians – ONLY pedestrian.glb (no box/capsule people) */
export class PedestrianManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.model = null;
    this.pedestrians = [];
    this.maxPeds = 8;
    this.ready = false;
  }

  async init() {
    try {
      this.model = await this.assets.loadGLB('/assets/models/pedestrian.glb', { scale: 1.0 });
    } catch (e) {
      this.model = null;
    }
    if (!this.model) {
      console.warn('pedestrian.glb missing – pedestrians disabled');
      this.ready = true;
      return;
    }
    for (let i = 0; i < this.maxPeds; i++) this._spawn(true);
    this.ready = true;
  }

  _spawn(initial) {
    if (!this.model) return;
    const mesh = this.model.clone(true);
    mesh.scale.setScalar(0.9 + Math.random() * 0.2);
    const side = Math.random() > 0.5 ? 1 : -1;
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 15 + Math.random() * 180 : playerZ + 120 + Math.random() * 60;
    mesh.position.set(side * (8 + Math.random() * 2), 0, z);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    this.pedestrians.push({ mesh, side, speed: 0.6 + Math.random() * 0.8, z });
  }

  update(delta) {
    if (!this.ready || !this.pedestrians.length) return;
    const playerZ = this.player.group.position.z;
    const dt = Math.min(delta, 0.05);
    this.pedestrians.forEach((p) => {
      p.mesh.position.z += (Math.random() > 0.5 ? 1 : -1) * p.speed * dt * 0.3;
      const dist = Math.abs(p.mesh.position.z - playerZ);
      p.mesh.visible = dist < 140;
      if (p.mesh.position.z < playerZ - 30 || p.mesh.position.z > playerZ + 220) {
        p.mesh.position.z = playerZ + 100 + Math.random() * 50;
        p.mesh.visible = true;
      }
    });
  }
}
