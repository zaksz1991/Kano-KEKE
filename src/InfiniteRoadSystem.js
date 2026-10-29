import * as THREE from 'three';

/**
 * Dense Kano street world – textured road, varied compounds, market life
 */
export class InfiniteRoadSystem {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.chunkLength = 64;
    this.visibleChunks = 6;
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
      tile.position.set(0, 0.06, this.chunkLength * 0.5);
      tile.scale.set(1.15, 1, this.chunkLength / 18);
      tile.traverse((n) => {
        if (n.isMesh && n.material) {
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach((m) => {
            if (!m) return;
            m.polygonOffset = true;
            m.polygonOffsetFactor = -1;
            m.polygonOffsetUnits = -1;
            m.needsUpdate = true;
          });
        }
      });
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
    const L = this.chunkLength;

    // === Kano dual carriageway (photo ref: median, yellow lines, black asphalt) ===
    const asphalt = new THREE.MeshStandardMaterial({
      color: 0x242424,
      roughness: 0.92,
      metalness: 0.04,
      map: this.roadTexture || null
    });
    if (this.roadTexture) {
      asphalt.map = this.roadTexture;
      asphalt.map.repeat.set(1.5, L / 10);
    }

    // Two carriageways (left / right of median)
    for (const x of [-4.6, 4.6]) {
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, L, 1, 2), asphalt.clone());
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(x, 0, 0);
      lane.receiveShadow = true;
      group.add(lane);
      if (x > 0) group.userData.roadMesh = lane;
    }

    // Central median island
    const medianMat = new THREE.MeshStandardMaterial({ color: 0x6b5b3a, roughness: 1 });
    const median = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, L * 0.92), medianMat);
    median.position.set(0, 0.1, 0);
    group.add(median);
    // Sparse dry grass on median
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x7a8f4a, roughness: 1 });
    for (let z = -L / 2 + 8; z < L / 2; z += 18) {
      if (rand() > 0.5) {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.4 + rand() * 0.2, 4, 3), grassMat);
        g.position.set((rand() - 0.5) * 0.35, 0.28, z);
        g.scale.y = 0.45;
        group.add(g);
      }
    }
    // Solid median edge – white continuous (no stripe blink)
    const curbW = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    for (const x of [-0.85, 0.85]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, L * 0.95), curbW);
      c.position.set(x, 0.12, 0);
      group.add(c);
    }

    // Yellow continuous lines next to median
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffc107 });
    for (const x of [-1.15, 1.15]) {
      const yline = new THREE.Mesh(new THREE.PlaneGeometry(0.14, L * 0.95), yellow);
      yline.rotation.x = -Math.PI / 2;
      yline.position.set(x, 0.035, 0);
      group.add(yline);
    }

    // White dashed lane marks on each carriageway
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const laneX of [-4.6, 4.6]) {
      for (let z = -L / 2 + 2; z < L / 2; z += 6.5) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 2.8), white);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(laneX, 0.035, z);
        group.add(dash);
      }
      // Outer edge solid white
      const edgeX = laneX > 0 ? 8.1 : -8.1;
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.16, L), white);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(edgeX, 0.03, 0);
      group.add(edge);
    }

    // Sidewalks / shoulders
    const walkMat = new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 0.96 });
    for (const x of [-10.2, 10.2]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.8, L), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.05, 0);
      group.add(walk);
    }

    // Solid outer kerbs – no alternating colours (stops blink on chunk move)
    const kerbMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (const side of [-1, 1]) {
      const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, L * 0.98), kerbMat);
      kerb.position.set(side * 8.55, 0.09, 0);
      group.add(kerb);
    }

    // Solar street lights down the median (photo style)
    for (let i = 0; i < 2; i++) {
      if (rand() > 0.25) {
        const light = this._makeStreetLight();
        light.position.set(0, 0, -L / 2 + 14 + i * 28 + rand() * 4);
        group.add(light);
      }
    }

    // Trees along sides (Kano roadside)
    for (const side of [-1, 1]) {
      if (rand() > 0.32) {
        const tree = this._makeTree(rand);
        tree.position.set(side * (11.5 + rand() * 2), 0, (rand() - 0.5) * L * 0.6);
        group.add(tree);
      }
      if (rand() > 0.5) {
        const pole = this._makePole();
        pole.position.set(side * 11.2, 0, (rand() - 0.5) * L * 0.5);
        group.add(pole);
      }
      if (rand() > 0.55) {
        const pl = this._makePowerLine(side);
        pl.position.set(side * 12.0, 0, (rand() - 0.5) * L * 0.5);
        group.add(pl);
      }
    }

    // Sparse facade strip (photo: peach/pink low-rise shops) – max 1 per side
    const facadeColors = [0xe8c4a8, 0xf5d0c0, 0xd4b896, 0xc9a66b, 0xe0d5c5];
    for (const side of [-1, 1]) {
      if (rand() > 0.45) {
        const h = 2.8 + rand() * 2.2;
        const w = 4 + rand() * 5;
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 2.2),
          new THREE.MeshStandardMaterial({
            color: facadeColors[Math.floor(rand() * facadeColors.length)],
            roughness: 0.92
          })
        );
        wall.position.set(side * (13.5 + rand()), h / 2, (rand() - 0.5) * L * 0.4);
        group.add(wall);
        // Simple dark window strip
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.4 })
        );
        win.position.set(side * (13.5 + rand() - side * 1.12), 1.6, (rand() - 0.5) * L * 0.4);
        win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        group.add(win);
      }
    }
    // Occasional minaret cue (left side, rare)
    if (rand() > 0.88) {
      const minaret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 7, 8),
        new THREE.MeshStandardMaterial({ color: 0xf0e6d8, roughness: 0.9 })
      );
      minaret.position.set(-15 - rand() * 2, 3.5, (rand() - 0.5) * 20);
      group.add(minaret);
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xc9a66b, roughness: 0.7 })
      );
      top.position.set(minaret.position.x, 7.6, minaret.position.z);
      group.add(top);
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
          color: [0x2e7d32, 0x43a047, 0x1b5e20, 0x66bb6a][Math.floor(rand() * 4)],
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
    // Solar dual-head pole matching Kano dual carriageway photo
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 8.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.55, roughness: 0.4 })
    );
    pole.position.y = 4.25;
    g.add(pole);
    // Cross arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5 })
    );
    arm.position.set(0, 8.2, 0);
    g.add(arm);
    // Two lamp heads
    for (const x of [-1.4, 1.4]) {
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.12, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x546e7a, emissive: 0xffe0b2, emissiveIntensity: 0.15 })
      );
      head.position.set(x, 8.05, 0);
      g.add(head);
      // Solar panel flat on top
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.04, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.6, roughness: 0.3 })
      );
      panel.position.set(x, 8.2, 0);
      g.add(panel);
    }
    const light = new THREE.PointLight(0xffe0b2, 0, 26, 2);
    light.position.set(0, 7.8, 0);
    light.name = 'streetLight';
    g.add(light);
    return g;
  }

  _makePowerLine(side) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.4, roughness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6.5, 5), mat);
    pole.position.y = 3.25;
    g.add(pole);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), mat);
    cross.position.set(0, 6.2, 0);
    g.add(cross);
    return g;
  }

  update(playerZ) {
    this.chunks.forEach((chunk) => {
      if (chunk.position.z + this.chunkLength < playerZ - this.chunkLength * 2.2) {
        const maxZ = Math.max(...this.chunks.map((c) => c.position.z));
        chunk.position.z = maxZ + this.chunkLength;
        // Do not rebuild tiles – just move chunk (avoids blink / z-fight stack)
      }
    });
  }

  setNightMode(isNight) {
    // Only real street lamp lights – do NOT touch every emissive (causes road blink)
    this.scene.traverse((obj) => {
      if (obj.name === 'streetLight' && obj.isLight) {
        obj.intensity = isNight ? 3.5 : 0;
      }
    });
  }
}
