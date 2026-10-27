import * as THREE from 'three';

/**
 * Landmarks – prefer your real .glb files only
 */
export class KanoLandmarkManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.landmarks = [];
    this.loaded = false;
  }

  async init() {
    const defs = [
      { name: "Gidan Rumfa – Emir's Palace Gate", z: 180, x: -12, glb: '/assets/models/landmarks/palace_gate.glb', scale: 1 },
      { name: 'Kofar Mata Dye Pits', z: 420, x: 14, glb: '/assets/models/landmarks/dye_pits.glb', scale: 1 },
      { name: 'Ancient Kano City Walls', z: 680, x: -16, glb: '/assets/models/landmarks/city_walls.glb', scale: 1 },
      { name: 'Kurmi Market Wheels', z: 950, x: 12, glb: '/assets/models/landmarks/wheels.glb', scale: 1 }
    ];

    for (const def of defs) {
      let group = null;
      try {
        const model = await this.assets.loadGLB(def.glb, {
          scale: def.scale || 1,
          castShadow: false,
          receiveShadow: true
        });
        if (model) {
          group = new THREE.Group();
          group.add(model);
          group.position.set(def.x || 0, 0, def.z);
          this.scene.add(group);
        }
      } catch (e) {
        console.warn('Landmark skip', def.name, e);
      }
      if (group) {
        this.landmarks.push({ name: def.name, zPos: def.z, group, visited: false });
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
      if (lm.group) {
        lm.group.visible = Math.abs(playerZ - lm.zPos) < 200;
      }
    });
  }
}
