import * as THREE from 'three';

/**
 * Landmark Manager – loads real GLB landmarks when available,
 * falls back to high-quality procedural Kano landmarks.
 */
export class KanoLandmarkManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.landmarks = [];
    this.loaded = false;
  }

  async init() {
    // Landmark definitions with approximate Z positions along the main route
    const defs = [
      {
        name: 'Gidan Rumfa – Emir’s Palace Gate',
        path: '/assets/models/landmarks/palace_gate.glb',
        z: 180,
        scale: 1.4,
        x: -14,
        fallback: () => this._createPalaceGate(180)
      },
      {
        name: 'Kofar Mata Traditional Dye Pits',
        path: '/assets/models/landmarks/dye_pits.glb',
        z: 420,
        scale: 1.2,
        x: 16,
        fallback: () => this._createDyePits(420)
      },
      {
        name: 'Ancient Kano City Walls (Ganuwa)',
        path: '/assets/models/landmarks/city_walls.glb',
        z: 680,
        scale: 1.0,
        x: -18,
        fallback: () => this._createCityWalls(680)
      },
      {
        name: 'Kurmi Market Wheels Monument',
        path: '/assets/models/landmarks/wheels.glb',
        z: 950,
        scale: 1.3,
        x: 12,
        fallback: () => this._createWheels(950)
      }
    ];

    for (const def of defs) {
      let group = null;
      try {
        const model = await this.assets.loadGLB(def.path, {
          scale: def.scale,
          castShadow: true,
          receiveShadow: true
        });
        group = new THREE.Group();
        group.add(model);
        group.position.set(def.x, 0, def.z);
      } catch (e) {
        console.warn(`Landmark GLB missing (${def.name}), using procedural`);
        group = def.fallback();
      }

      if (group) {
        this.scene.add(group);
        this.landmarks.push({
          name: def.name,
          zPos: def.z,
          group,
          visited: false
        });
      }
    }
    this.loaded = true;
  }

  _createPalaceGate(z) {
    const g = new THREE.Group();
    g.position.z = z;
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.9 });
    // Twin towers
    for (const x of [-4, 4]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.2), mat);
      tower.position.set(x, 4.5, 0);
      tower.castShadow = true;
      g.add(tower);
    }
    // Arch
    const arch = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.5, 1.8), mat);
    arch.position.set(0, 7.5, 0);
    g.add(arch);
    this.scene.add(g);
    return g;
  }

  _createDyePits(z) {
    const g = new THREE.Group();
    g.position.z = z;
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.6 });
    for (let i = 0; i < 8; i++) {
      const pit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.0, 0.6, 12),
        pitMat
      );
      pit.position.set((i % 4) * 3.2 - 4.8, 0.3, Math.floor(i / 4) * 3.5);
      pit.receiveShadow = true;
      g.add(pit);
    }
    this.scene.add(g);
    return g;
  }

  _createCityWalls(z) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 6.5, 70),
      new THREE.MeshStandardMaterial({ color: 0xb57e48, roughness: 0.95 })
    );
    wall.position.set(-16, 3.25, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
    return wall;
  }

  _createWheels(z) {
    const g = new THREE.Group();
    g.position.set(12, 0, z);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.25, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, metalness: 0.3 })
    );
    rim.rotation.y = Math.PI / 2;
    rim.position.y = 2.4;
    g.add(rim);
    this.scene.add(g);
    return g;
  }

  update(playerZ, hudCallback) {
    this.landmarks.forEach((lm) => {
      if (!lm.visited && Math.abs(playerZ - lm.zPos) < 22) {
        lm.visited = true;
        if (hudCallback) hudCallback(`📍 LANDMARK DISCOVERED: ${lm.name}`);
      }
    });
  }
}
