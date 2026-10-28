import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

export class KanoLandmarkManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.landmarks = [];
    this.loaded = false;
  }

  async init() {
    const defs = ASSET_MANIFEST.landmarks || [];
    for (const def of defs) {
      try {
        const model = await this.assets.loadGLB(def.path, { scale: 1, castShadow: false });
        if (!model) continue;
        const group = new THREE.Group();
        group.add(model);
        group.position.set(def.x || 0, 0, def.z || 0);
        this.scene.add(group);
        this.landmarks.push({ name: def.name, zPos: def.z, group, visited: false });
      } catch (e) {
        console.warn('Landmark skip', def.name);
      }
    }
    this.loaded = true;
  }

  update(playerZ, hudCallback) {
    this.landmarks.forEach((lm) => {
      if (!lm.visited && Math.abs(playerZ - lm.zPos) < 28) {
        lm.visited = true;
        if (hudCallback) hudCallback(`📍 ${lm.name}`);
      }
      if (lm.group) lm.group.visible = Math.abs(playerZ - lm.zPos) < 200;
    });
  }
}
