import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/** Sidewalk walkers – pedestrian.glb only */
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
      this.model = await this.assets.loadGLB(ASSET_MANIFEST.characters.pedestrian, { scale: 1.2 });
      if (this.model) {
        this.model.traverse((n) => {
          if (n.isMesh && n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => {
              if (!m) return;
              if (m.map) {
                try { m.map.colorSpace = THREE.SRGBColorSpace; } catch (e) {}
              }
              if (m.emissive) {
                m.emissive.setHex(0x222222);
                m.emissiveIntensity = 0.3;
              }
              m.needsUpdate = true;
            });
          }
        });
        console.log('[Peds] pedestrian.glb ready');
      }
    } catch (e) {
      this.model = null;
    }
    if (!this.model) {
      console.warn('[Peds] pedestrian.glb missing');
      this.ready = true;
      return;
    }
    for (let i = 0; i < this.maxPeds; i++) this._spawn(true);
    this.ready = true;
  }

  _spawn(initial) {
    if (!this.model) return;
    const mesh = this.model.clone(true);
    mesh.scale.setScalar(1.3 + Math.random() * 0.25);
    const side = Math.random() > 0.5 ? 1 : -1;
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 20 + Math.random() * 160 : playerZ + 100 + Math.random() * 60;
    mesh.position.set(side * (10 + Math.random() * 1.5), 0, z);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    this.pedestrians.push({ mesh, side, speed: 0.5 + Math.random() * 0.7 });
  }

  update(delta) {
    if (!this.ready || !this.pedestrians.length) return;
    const playerZ = this.player.group.position.z;
    const dt = Math.min(delta, 0.05);
    this.pedestrians.forEach((p) => {
      p.mesh.position.z += (p.side > 0 ? -1 : 1) * p.speed * dt * 0.4;
      const dist = Math.abs(p.mesh.position.z - playerZ);
      p.mesh.visible = dist < 150;
      if (p.mesh.position.z < playerZ - 40 || p.mesh.position.z > playerZ + 200) {
        p.mesh.position.z = playerZ + 90 + Math.random() * 50;
        p.mesh.visible = true;
      }
    });
  }
}
