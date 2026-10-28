import * as THREE from 'three';

/**
 * Dense Kano street world – textured road, varied compounds, market life
 */
export class InfiniteRoadSystem {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.chunkLength = 56;
    this.visibleChunks = 7;
    this.chunks = [];
    this.roadTexture = null;

    this.rng = (seed) => {
      let s = (Math.abs(seed | 0) % 2147483646) + 1;
      return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };
  }

  async init() {
    for (let i = 0; i < this.visibleChunks; i++) {
      const chunk = this._createChunk(i * this.chunkLength);
      this.chunks.push(chunk);
      this.scene.add(chunk);
    }
    this._loadTexture();
    this._tryRoadTile();
  }

  async _tryRoadTile() {
    try {
      const model = await this.assets.loadGLB('/assets/models/environment/road_tile.glb', {
        scale: 1,
        castShadow: false,
        receiveShadow: true
      });
      if (!model) return;
      this.roadTileModel = model;
      this.chunks.forEach((chunk) => this._applyRoadTile(chunk));
    } catch (e) {}
  }

  _applyRoadTile(chunk) {
    if (!this.roadTileModel || !chunk) return;
    if (chunk.userData.hasRoadTile) return;
    try {
      const tile = this.roadTileModel.clone(true);
      tile.position.set(0, 0.02, this.chunkLength * 0.5);
      // Fit roughly along chunk
      tile.scale.set(1.2, 1, this.chunkLength / 18);
      chunk.add(tile);
      chunk.userData.hasRoadTile = true;
    } catch (e) {}
  }

  async _loadTexture() {
    try {
      const tex = await this.assets.loadTexture('/assets/models/textures/road_diffuse.jpg', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        anisotropy: 8
      });
      if (!tex) return;
      this.roadTexture = tex;
      this.chunks.forEach((chunk) => {
        const road = chunk.userData.roadMesh;
        if (road?.material) {
          road.material.map = tex;
          road.material.map.repeat.set(2, this.chunkLength / 8);
          road.material.needsUpdate = true;
        }
      });
    } catch (e) {}
  }

  _createChunk(zBase) {
    const group = new THREE.Group();
    group.position.z = zBase;
    const rand = this.rng(Math.floor(zBase * 17.13 + 91));

    // --- Road ---
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.88,
      metalness: 0.08,
      map: this.roadTexture
    });
    if (this.roadTexture) {
      roadMat.map = this.roadTexture;
      roadMat.map.repeat.set(2, this.chunkLength / 8);
    }
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, this.chunkLength, 1, 4), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);
    group.userData.roadMesh = road;

    // Sidewalks
    const walkMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.95 });
    for (const x of [-9.5, 9.5]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(3.2, this.chunkLength), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.04, 0);
      walk.receiveShadow = true;
      group.add(walk);
    }

    // Lane markings
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffc107 });
    const white = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    for (let z = -this.chunkLength / 2 + 2; z < this.chunkLength / 2; z += 7) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 3.2), yellow);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.03, z);
      group.add(dash);
    }
    for (const x of [-7.2, 7.2]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.18, this.chunkLength), white);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(x, 0.025, 0);
      group.add(edge);
    }

    // Gutters / drainage
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 });
    for (const x of [-8.1, 8.1]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, this.chunkLength), gutterMat);
      g.position.set(x, 0.05, 0);
      group.add(g);
    }

    // Side world – denser
    for (const side of [-1, 1]) {
      const baseX = side * 12.5;
      // Compounds / shops – sparse for mobile FPS
      for (let i = 0; i < 2; i++) {
        if (rand() > 0.35) {
          const b = this._makeBuilding(rand, side);
          b.position.set(
            baseX + side * (1.5 + rand() * 5),
            0,
            -this.chunkLength / 2 + 8 + i * 20 + rand() * 3
          );
          group.add(b);
        }
      }
      // Trees
      for (let i = 0; i < 2; i++) {
        if (rand() > 0.45) {
          const t = this._makeTree(rand);
          t.position.set(
            baseX + side * (0.8 + rand() * 6),
            0,
            -this.chunkLength / 2 + 6 + i * 22 + rand() * 4
          );
          group.add(t);
        }
      }
      // Poles
      if (rand() > 0.25) {
        const pole = this._makePole();
        pole.position.set(baseX + side * 0.6, 0, (rand() - 0.5) * this.chunkLength * 0.7);
        group.add(pole);
      }
      // Market stalls
      if (rand() > 0.7) {
        const stall = this._makeStall(rand);
        stall.position.set(baseX + side * (0.5 + rand()), 0, (rand() - 0.5) * this.chunkLength * 0.55);
        group.add(stall);
      }
      // Billboards / signs
      if (rand() > 0.8) {
        const sign = this._makeSign(rand);
        sign.position.set(baseX + side * 2, 0, (rand() - 0.5) * 20);
        group.add(sign);
      }
    }

    // Street lights – off road
    for (let i = 0; i < 2; i++) {
      if (rand() > 0.3) {
        const light = this._makeStreetLight();
        const side = rand() > 0.5 ? 1 : -1;
        light.position.set(side * (8.2 + rand()), 0, -this.chunkLength / 2 + 12 + i * 22);
        group.add(light);
      }
    }

    // Occasional speed bump
    if (rand() > 0.7) {
      const bump = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.12, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.7 })
      );
      bump.position.set(0, 0.06, (rand() - 0.5) * 20);
      bump.castShadow = true;
      group.add(bump);
    }

    return group;
  }

  _makeBuilding(rand, side) {
    const g = new THREE.Group();
    const w = 3.5 + rand() * 6;
    const d = 3 + rand() * 5;
    const floors = 1 + Math.floor(rand() * 3);
    const h = floors * (2.6 + rand() * 0.4);
    const palette = [0xd4b896, 0xc9a66b, 0xe8d5b5, 0xa1887f, 0xbcaaa4, 0xffcc80, 0x90caf9, 0xce93d8, 0x80cbc4];
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: palette[Math.floor(rand() * palette.length)], roughness: 0.9 })
    );
    wall.position.y = h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, 0.28, d + 0.5),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.85 })
    );
    roof.position.y = h + 0.12;
    roof.castShadow = true;
    g.add(roof);

    // Windows
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x1a237e,
      emissive: 0x0d47a1,
      emissiveIntensity: 0.15,
      roughness: 0.3
    });
    for (let f = 0; f < floors; f++) {
      for (let wi = 0; wi < Math.min(2, Math.floor(w / 2.2)); wi++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), winMat);
        win.position.set(-w / 2 + 1.2 + wi * 1.6, 1.2 + f * 2.5, d / 2 + 0.02);
        g.add(win);
      }
    }

    // Door
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.8 })
    );
    door.position.set(0, 0.9, d / 2 + 0.03);
    g.add(door);

    // Awning for shops
    if (rand() > 0.45) {
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.9, 0.08, 1.2),
        new THREE.MeshStandardMaterial({
          color: [0xc62828, 0x1565c0, 0x2e7d32, 0xf9a825][Math.floor(rand() * 4)],
          roughness: 0.7
        })
      );
      awning.position.set(0, 2.3, d / 2 + 0.5);
      g.add(awning);
    }

    g.rotation.y = side > 0 ? (rand() - 0.5) * 0.15 : Math.PI + (rand() - 0.5) * 0.15;
    return g;
  }

  _makeTree(rand) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 + rand() * 0.1, 0.25 + rand() * 0.1, 2.4 + rand(), 7),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
    );
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    g.add(trunk);
    const layers = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < layers; i++) {
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.3 + rand() * 0.7 - i * 0.15, 8, 6),
        new THREE.MeshStandardMaterial({
          color: [0x2e7d32, 0x388e3c, 0x1b5e20, 0x558b2f][Math.floor(rand() * 4)],
          roughness: 0.85
        })
      );
      foliage.position.y = 2.6 + i * 0.7 + rand() * 0.3;
      foliage.castShadow = true;
      g.add(foliage);
    }
    return g;
  }

  _makePole() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.5, roughness: 0.5 })
    );
    pole.position.y = 4;
    pole.castShadow = true;
    g.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.07, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x546e7a, metalness: 0.6 })
    );
    arm.position.y = 7.6;
    g.add(arm);
    // wires suggestion
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 3, 4),
      new THREE.MeshBasicMaterial({ color: 0x212121 })
    );
    wire.rotation.z = Math.PI / 2;
    wire.position.set(1.2, 7.55, 0);
    g.add(wire);
    return g;
  }

  _makeStall(rand) {
    const g = new THREE.Group();
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.12, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.85 })
    );
    table.position.y = 0.95;
    table.castShadow = true;
    g.add(table);
    // Legs
    for (const [x, z] of [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.95, 5),
        new THREE.MeshStandardMaterial({ color: 0x5d4037 })
      );
      leg.position.set(x, 0.47, z);
      g.add(leg);
    }
    for (const x of [-1.1, 1.1]) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5),
        new THREE.MeshStandardMaterial({ color: 0x5d4037 })
      );
      p.position.set(x, 1.2, 0);
      g.add(p);
    }
    const colors = [0xc62828, 0x1565c0, 0xf9a825, 0x6a1b9a, 0x00838f];
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.06, 1.7),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)], roughness: 0.65 })
    );
    canopy.position.y = 2.35;
    canopy.castShadow = true;
    g.add(canopy);
    // Goods on table
    for (let i = 0; i < 3; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.25, 0.35),
        new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)] })
      );
      box.position.set(-0.7 + i * 0.7, 1.15, 0);
      g.add(box);
    }
    return g;
  }

  _makeSign(rand) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 3.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x37474f })
    );
    post.position.y = 1.75;
    g.add(post);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 0.1),
      new THREE.MeshStandardMaterial({
        color: [0xc62828, 0x1565c0, 0x2e7d32, 0xf57f17][Math.floor(rand() * 4)],
        roughness: 0.6
      })
    );
    board.position.y = 3.2;
    board.castShadow = true;
    g.add(board);
    return g;
  }

  _makeStreetLight() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.55, roughness: 0.4 })
    );
    pole.position.y = 3.5;
    pole.castShadow = true;
    g.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5 })
    );
    arm.position.set(0.6, 6.8, 0);
    g.add(arm);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.18, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x546e7a, emissive: 0xffe0b2, emissiveIntensity: 0.2 })
    );
    head.position.set(1.1, 6.7, 0);
    g.add(head);
    const light = new THREE.PointLight(0xffe0b2, 0, 22, 2);
    light.position.set(1.1, 6.5, 0);
    light.name = 'streetLight';
    g.add(light);
    return g;
  }

  update(playerZ) {
    this.chunks.forEach((chunk) => {
      if (chunk.position.z + this.chunkLength < playerZ - this.chunkLength * 1.8) {
        const maxZ = Math.max(...this.chunks.map((c) => c.position.z));
        chunk.position.z = maxZ + this.chunkLength;
        chunk.userData.hasRoadTile = false;
        this._applyRoadTile(chunk);
      }
    });
  }

  setNightMode(isNight) {
    this.scene.traverse((obj) => {
      if (obj.name === 'streetLight' && obj.isLight) obj.intensity = isNight ? 3.5 : 0;
      if (obj.isMesh && obj.material && obj.material.emissive) {
        obj.material.emissiveIntensity = isNight ? 0.85 : 0.15;
      }
    });
  }
}
