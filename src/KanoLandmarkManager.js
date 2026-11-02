import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/** Landmarks load only after delay – never block start */
export class KanoLandmarkManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.landmarks = [];
  }

  async init() {
    // Defer 12s so first drive is free of heavy landmark GLBs
    setTimeout(() => this._loadAll(), 12000);
  }

  async _loadAll() {
    const list = ASSET_MANIFEST.landmarks || [];
    for (const def of list) {
      try {
        const model = await Promise.race([
          this.assets.loadGLB(def.path, { scale: 1.25, castShadow: false }),
          new Promise((r) => setTimeout(() => r(null), 4000))
        ]);
        if (!model) continue;
        model.position.set(def.x || -12, 0, def.z || 200);
        this.scene.add(model);
        this.landmarks.push({ mesh: model, z: def.z, name: def.name });
      } catch (e) {}
    }
  }

  update(playerZ, hudCallback) {
    this.landmarks.forEach((lm) => {
      if (!lm.mesh) return;
      const dist = Math.abs((lm.z || 0) - playerZ);
      lm.mesh.visible = dist < 200;
    });
  }
}
