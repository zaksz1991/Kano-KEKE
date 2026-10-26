import * as THREE from 'three';

/**
 * Kano landmarks – rich procedural + optional GLB enhancement (LOD-friendly)
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
      {
        name: "Gidan Rumfa – Emir's Palace Gate",
        z: 180,
        x: -14,
        glb: '/assets/models/landmarks/palace_gate.glb',
        fallback: () => this._palace(180, -14)
      },
      {
        name: 'Kofar Mata Dye Pits',
        z: 420,
        x: 16,
        glb: '/assets/models/landmarks/dye_pits.glb',
        fallback: () => this._dyePits(420, 16)
      },
      {
        name: 'Ancient Kano City Walls',
        z: 680,
        x: -18,
        glb: '/assets/models/landmarks/city_walls.glb',
        fallback: () => this._walls(680)
      },
      {
        name: 'Kurmi Market Wheels',
        z: 950,
        x: 12,
        glb: '/assets/models/landmarks/wheels.glb',
        fallback: () => this._wheels(950, 12)
      },
      {
        name: 'Central Mosque Minaret',
        z: 1100,
        x: 15,
        glb: null,
        fallback: () => this._mosque(1100, 15)
      },
      {
        name: 'Petrol Station – NNPC Style',
        z: 300,
        x: -15,
        glb: null,
        fallback: () => this._petrol(300, -15)
      }
    ];

    for (const def of defs) {
      const group = def.fallback();
      this.landmarks.push({ name: def.name, zPos: def.z, group, visited: false, def });
    }
    this.loaded = true;

    // Background GLB upgrades (never block)
    this._upgradeGLBs(defs);
  }

  async _upgradeGLBs(defs) {
    for (const def of defs) {
      if (!def.glb || !this.assets) continue;
      try {
        const model = await this.assets.loadGLB(def.glb, {
          scale: def.scale || 1,
          castShadow: true,
          receiveShadow: true
        });
        if (!model) continue;
        const entry = this.landmarks.find((l) => l.name === def.name);
        if (!entry) continue;
        // Replace procedural with GLB
        if (entry.group) this.scene.remove(entry.group);
        const g = new THREE.Group();
        g.add(model);
        g.position.set(def.x || 0, 0, def.z);
        this.scene.add(g);
        entry.group = g;
      } catch (e) {
        // keep procedural
      }
    }
  }

  _palace(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.88 });
    for (const tx of [-5, 5]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 2.4), mat);
      tower.position.set(tx, 5.5, 0);
      tower.castShadow = true;
      g.add(tower);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 })
      );
      dome.position.set(tx, 11.5, 0);
      g.add(dome);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(8, 1.8, 2), mat);
    arch.position.set(0, 8.5, 0);
    g.add(arch);
    // Gate opening
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(4, 5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 })
    );
    gate.position.set(0, 2.5, 0.5);
    g.add(gate);
    this.scene.add(g);
    return g;
  }

  _dyePits(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const colors = [0x1a237e, 0x0d47a1, 0x311b92, 0x004d40];
    for (let i = 0; i < 10; i++) {
      const pit = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 0.95, 0.55, 12),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.55, metalness: 0.1 })
      );
      pit.position.set((i % 5) * 2.8 - 5.6, 0.25, Math.floor(i / 5) * 3.2);
      pit.receiveShadow = true;
      g.add(pit);
    }
    // Shelter poles
    for (const px of [-6, 6]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 3.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x5d4037 })
      );
      pole.position.set(px, 1.75, 0);
      g.add(pole);
    }
    this.scene.add(g);
    return g;
  }

  _walls(z) {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 7, 80),
      new THREE.MeshStandardMaterial({ color: 0xb57e48, roughness: 0.95 })
    );
    wall.position.set(-16, 3.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    // Crenellations
    for (let i = 0; i < 12; i++) {
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 1.2, 3),
        new THREE.MeshStandardMaterial({ color: 0xa06c3a, roughness: 0.95 })
      );
      merlon.position.set(-16, 7.5, z - 35 + i * 6.5);
      g.add(merlon);
    }
    this.scene.add(g);
    return g;
  }

  _wheels(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, metalness: 0.35, roughness: 0.55 });
    for (let i = 0; i < 2; i++) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.22, 8, 24), rimMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.set(i * 1.2, 2.2, 0);
      rim.castShadow = true;
      g.add(rim);
    }
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x6d4c41 })
    );
    base.position.y = 0.75;
    g.add(base);
    this.scene.add(g);
    return g;
  }

  _mosque(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(6, 5, 6),
      new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.85 })
    );
    body.position.y = 2.5;
    body.castShadow = true;
    g.add(body);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.3, roughness: 0.4 })
    );
    dome.position.y = 6.2;
    g.add(dome);
    const minaret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 })
    );
    minaret.position.set(3.5, 6, 3.5);
    minaret.castShadow = true;
    g.add(minaret);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd54f })
    );
    cap.position.set(3.5, 12.5, 3.5);
    g.add(cap);
    this.scene.add(g);
    return g;
  }

  _petrol(z, x) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.6 })
    );
    canopy.position.y = 4.2;
    canopy.castShadow = true;
    g.add(canopy);
    for (const px of [-3.5, 3.5]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5 })
      );
      post.position.set(px, 2, 0);
      g.add(post);
    }
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.8, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 })
    );
    pump.position.set(0, 0.9, 1.5);
    g.add(pump);
    this.scene.add(g);
    return g;
  }

  update(playerZ, hudCallback) {
    this.landmarks.forEach((lm) => {
      if (!lm.visited && Math.abs(playerZ - lm.zPos) < 24) {
        lm.visited = true;
        if (hudCallback) hudCallback(`📍 ${lm.name}`);
      }
      // Simple LOD: hide detail when far
      if (lm.group) {
        const dist = Math.abs(playerZ - lm.zPos);
        lm.group.visible = dist < 220;
      }
    });
  }
}
