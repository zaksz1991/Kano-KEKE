import * as THREE from 'three';

/**
 * Landmarks – procedural immediately, optional GLB enhancement later
 */
export class KanoLandmarkManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.landmarks = [];
    this.loaded = false;
  }

  async init() {
    // Instant procedural landmarks so world is never empty
    const defs = [
      { name: "Gidan Rumfa – Emir's Palace Gate", z: 180, x: -14, fallback: () => this._createPalaceGate(180, -14) },
      { name: 'Kofar Mata Traditional Dye Pits', z: 420, x: 16, fallback: () => this._createDyePits(420, 16) },
      { name: 'Ancient Kano City Walls (Ganuwa)', z: 680, x: -18, fallback: () => this._createCityWalls(680) },
      { name: 'Kurmi Market Wheels Monument', z: 950, x: 12, fallback: () => this._createWheels(950, 12) }
    ];

    for (const def of defs) {
      const group = def.fallback();
      if (group) {
        this.landmarks.push({ name: def.name, zPos: def.z, group, visited: false });
      }
    }
    this.loaded = true;

    // Optional: try to swap in real GLBs in background (skip on slow networks)
    // Disabled by default to avoid long "loading wheels.glb" on mobile
  }

  _createPalaceGate(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.9 });
    for (const tx of [-4, 4]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.2), mat);
      tower.position.set(tx, 4.5, 0);
      tower.castShadow = true;
      g.add(tower);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.5, 1.8), mat);
    arch.position.set(0, 7.5, 0);
    g.add(arch);
    this.scene.add(g);
    return g;
  }

  _createDyePits(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.6 });
    for (let i = 0; i < 8; i++) {
      const pit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 0.6, 12), pitMat);
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

  _createWheels(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
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
