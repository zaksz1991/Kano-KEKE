import * as THREE from 'three';

/**
 * High-performance Infinite Road + Kano Side-World System
 * - Tiled road with high-quality diffuse
 * - Procedural buildings, trees, poles, market stalls, street lights
 * - Object pooling + distance recycling
 * - Compatible with real road_tile.glb when available
 */
export class InfiniteRoadSystem {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;

    this.chunkLength = 48;
    this.visibleChunks = 9;
    this.chunks = [];
    this.roadTexture = null;
    this.roadTileModel = null;

    // Side world pools
    this.buildingPool = [];
    this.treePool = [];
    this.polePool = [];
    this.stallPool = [];
    this.lightPool = [];

    this.rng = (seed) => {
      let s = seed % 2147483647;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
  }

  async init() {
    // Try to load road diffuse
    try {
      this.roadTexture = await this.assets.loadTexture(
        '/assets/models/textures/road_diffuse.jpg',
        {
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping,
          repeat: { x: 1, y: 4 },
          anisotropy: 8
        }
      );
    } catch (e) {
      console.warn('Road texture missing – using procedural asphalt');
    }

    // Optional high-detail road tile
    try {
      this.roadTileModel = await this.assets.loadGLB('/assets/models/environment/road_tile.glb', {
        scale: 1,
        castShadow: false,
        receiveShadow: true
      });
    } catch (e) {
      this.roadTileModel = null;
    }

    for (let i = 0; i < this.visibleChunks; i++) {
      const chunk = this._createChunk(i * this.chunkLength);
      this.chunks.push(chunk);
      this.scene.add(chunk);
    }
  }

  _createChunk(zBase) {
    const group = new THREE.Group();
    group.position.z = zBase;
    group.userData.zBase = zBase;

    const rand = this.rng(Math.floor(zBase * 13.37 + 42));

    // === ROAD SURFACE ===
    if (this.roadTileModel) {
      const tile = this.roadTileModel.clone(true);
      tile.position.set(0, 0, 0);
      // Scale to fit chunk if needed – assume model is roughly correct
      group.add(tile);
    } else {
      const roadGeo = new THREE.PlaneGeometry(14, this.chunkLength, 1, 4);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.92,
        metalness: 0.05,
        map: this.roadTexture || null
      });
      if (this.roadTexture) {
        roadMat.map.repeat.set(1, this.chunkLength / 12);
      }
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      group.add(road);

      // Lane markings
      const markMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      for (let z = -this.chunkLength / 2 + 3; z < this.chunkLength / 2; z += 7) {
        const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3.2), markMat);
        mark.rotation.x = -Math.PI / 2;
        mark.position.set(0, 0.02, z);
        group.add(mark);
      }

      // Side lines
      const sideMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
      [-6.2, 6.2].forEach(x => {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.18, this.chunkLength), sideMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.015, 0);
        group.add(line);
      });
    }

    // === SIDE WORLD – LEFT & RIGHT ===
    for (const side of [-1, 1]) {
      const baseX = side * 11.5;

      // Buildings / compounds
      for (let i = 0; i < 3; i++) {
        if (rand() > 0.35) {
          const b = this._makeBuilding(rand);
          b.position.set(
            baseX + side * (2 + rand() * 4),
            0,
            -this.chunkLength / 2 + 8 + i * 14 + rand() * 4
          );
          b.rotation.y = side > 0 ? -0.1 + rand() * 0.2 : Math.PI + (-0.1 + rand() * 0.2);
          group.add(b);
        }
      }

      // Trees / neem
      for (let i = 0; i < 4; i++) {
        if (rand() > 0.4) {
          const t = this._makeTree(rand);
          t.position.set(
            baseX + side * (1.5 + rand() * 6),
            0,
            -this.chunkLength / 2 + 4 + i * 11 + rand() * 5
          );
          group.add(t);
        }
      }

      // Electricity poles
      if (rand() > 0.25) {
        const pole = this._makePole();
        pole.position.set(baseX + side * 0.8, 0, (rand() - 0.5) * this.chunkLength * 0.7);
        group.add(pole);
      }

      // Market stalls / kiosks
      if (rand() > 0.55) {
        const stall = this._makeStall(rand);
        stall.position.set(
          baseX + side * (1.2 + rand() * 2),
          0,
          (rand() - 0.5) * this.chunkLength * 0.6
        );
        group.add(stall);
      }
    }

    // Street lights (center-ish)
    if (rand() > 0.3) {
      const light = this._makeStreetLight();
      light.position.set((rand() - 0.5) * 4, 0, (rand() - 0.5) * this.chunkLength * 0.5);
      group.add(light);
    }

    // Occasional pothole / rough patch
    if (rand() > 0.7) {
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.9 + rand() * 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 })
      );
      hole.rotation.x = -Math.PI / 2;
      hole.position.set((rand() - 0.5) * 5, 0.03, (rand() - 0.5) * 20);
      group.add(hole);
    }

    return group;
  }

  _makeBuilding(rand) {
    const g = new THREE.Group();
    const w = 4 + rand() * 5;
    const d = 3.5 + rand() * 4;
    const h = 2.8 + rand() * 4.5;

    // Mud / cement block walls – classic Kano palette
    const colors = [0xc4a484, 0xb08968, 0xd4b483, 0x8d6e63, 0xa1887f, 0xe8d5b7];
    const wallMat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(rand() * colors.length)],
      roughness: 0.95
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Flat roof with slight overhang
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.4, 0.25, d + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
    );
    roof.position.y = h + 0.1;
    roof.castShadow = true;
    g.add(roof);

    // Simple window
    if (h > 3.5) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.0),
        new THREE.MeshBasicMaterial({ color: 0x1a237e })
      );
      win.position.set(0, h * 0.55, d / 2 + 0.02);
      g.add(win);
    }

    return g;
  }

  _makeTree(rand) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.9 })
    );
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    g.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 + rand() * 0.8, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 })
    );
    foliage.position.y = 3.0 + rand() * 0.5;
    foliage.castShadow = true;
    g.add(foliage);
    return g;
  }

  _makePole() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 7.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.7, metalness: 0.4 })
    );
    pole.position.y = 3.75;
    pole.castShadow = true;
    g.add(pole);
    // Cross arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x455a64 })
    );
    arm.position.y = 7.1;
    g.add(arm);
    return g;
  }

  _makeStall(rand) {
    const g = new THREE.Group();
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.15, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.85 })
    );
    table.position.y = 0.9;
    table.castShadow = true;
    g.add(table);

    // Simple canopy poles
    for (const x of [-1.0, 1.0]) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x5d4037 })
      );
      p.position.set(x, 1.1, 0);
      g.add(p);
    }
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.7 })
    );
    canopy.position.y = 2.2;
    g.add(canopy);
    return g;
  }

  _makeStreetLight() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 6.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.5 })
    );
    pole.position.y = 3.25;
    g.add(pole);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.15, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x37474f })
    );
    head.position.set(0.4, 6.4, 0);
    g.add(head);

    // Actual light (dim during day, stronger at night – controlled externally)
    const light = new THREE.PointLight(0xffe0b2, 0, 18, 2);
    light.position.set(0.4, 6.2, 0);
    light.name = 'streetLight';
    g.add(light);
    return g;
  }

  update(playerZ) {
    // Recycle chunks that are far behind + simple distance LOD
    this.chunks.forEach((chunk) => {
      if (chunk.position.z + this.chunkLength < playerZ - this.chunkLength * 1.5) {
        const maxZ = Math.max(...this.chunks.map(c => c.position.z));
        chunk.position.z = maxZ + this.chunkLength;
      }

      // Simple LOD: hide detailed side objects when far
      const dist = Math.abs(chunk.position.z - playerZ);
      const detailVisible = dist < this.chunkLength * 3.2;
      chunk.children.forEach((child, idx) => {
        // keep road surface (first child) always visible
        if (idx === 0) return;
        child.visible = detailVisible;
      });
    });
  }

  /** Call from atmosphere to turn street lights on/off */
  setNightMode(isNight) {
    this.scene.traverse((obj) => {
      if (obj.name === 'streetLight' && obj.isLight) {
        obj.intensity = isNight ? 1.8 : 0;
      }
    });
  }
}
