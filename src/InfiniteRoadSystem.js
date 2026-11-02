import * as THREE from 'three';

/**
 * Kano dual carriageway – matched to real reference photos:
 * median, yellow edge lines, white dashes, B/W kerbs, side barriers, solar lights
 */
export class InfiniteRoadSystem {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.chunkLength = 72;
    this.visibleChunks = 6;
    this.chunks = [];
    this.roadTexture = null;
    this.roadTileModel = null;
    this.roadMode = 'dual'; // 'dual' | 'single'
  }

  setRoadMode(mode) {
    this.roadMode = mode === 'single' ? 'single' : 'dual';
  }

  rng(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  async init() {
    // Instant procedural road only – no textures / no 11MB road_tile at boot
    this.billboardTex = null;
    this.billboardTex2 = null;
    this.billboardTex3 = null;
    this.roadTexture = null;
    this.roadTileModel = null;
    for (let i = 0; i < this.visibleChunks; i++) {
      const chunk = this._createChunk(i * this.chunkLength);
      this.scene.add(chunk);
      this.chunks.push(chunk);
    }
    // Optional textures much later (desktop only)
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
    // textures permanently skipped for fast boot
  }

  _applyRoadTile(chunk) {
    if (!this.roadTileModel || !chunk || chunk.userData.hasRoadTile) return;
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
        anisotropy: 4
      });
      if (!tex) return;
      this.roadTexture = tex;
      this.chunks.forEach((chunk) => {
        const roads = chunk.userData.roadMeshes || [];
        roads.forEach((road) => {
          if (road?.material) {
            road.material.map = tex;
            road.material.map.repeat.set(1.2, this.chunkLength / 12);
            road.material.needsUpdate = true;
          }
        });
      });
    } catch (e) {}
  }

  _createChunk(zBase) {
    const group = new THREE.Group();
    group.position.z = zBase;
    const rand = this.rng(Math.floor(zBase * 17.13 + 91));
    const L = this.chunkLength;
    group.userData.roadMeshes = [];

    // Ground / dusty shoulder (Kano sand-tan outside road)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, L), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    group.add(ground);

    // Asphalt – dual carriageway (photo: dark grey)
    const asphalt = new THREE.MeshStandardMaterial({
      color: 0x353535,
      roughness: 0.78,
      metalness: 0.08,
      map: this.roadTexture || null
    });

    const yellow = new THREE.MeshBasicMaterial({ color: 0xffb300 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dual = this.roadMode !== 'single';

    if (dual) {
      // Dual carriageway
      for (const x of [-5.0, 5.0]) {
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(8.6, L, 1, 2), asphalt.clone());
        if (this.roadTexture) {
          lane.material.map = this.roadTexture;
          lane.material.map.repeat.set(1.2, L / 12);
        }
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(x, 0.01, 0);
        group.add(lane);
        group.userData.roadMeshes.push(lane);
      }
      const median = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.16, L * 0.96),
        new THREE.MeshStandardMaterial({ color: 0x5d4e37, roughness: 1 })
      );
      median.position.set(0, 0.09, 0);
      group.add(median);
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 1 });
      for (let z = -L / 2 + 6; z < L / 2; z += 14) {
        if (rand() > 0.4) {
          const bush = new THREE.Mesh(new THREE.SphereGeometry(0.35, 4, 3), grassMat);
          bush.position.set((rand() - 0.5) * 0.3, 0.28, z);
          bush.scale.y = 0.5;
          group.add(bush);
        }
      }
      for (const x of [-0.95, 0.95]) {
        const yl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, L * 0.96), yellow);
        yl.rotation.x = -Math.PI / 2;
        yl.position.set(x, 0.04, 0);
        group.add(yl);
      }
      for (const x of [-8.7, 8.7]) {
        const yl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, L * 0.96), yellow);
        yl.rotation.x = -Math.PI / 2;
        yl.position.set(x, 0.04, 0);
        group.add(yl);
      }
      for (const laneX of [-5.0, 5.0]) {
        for (let z = -L / 2 + 2; z < L / 2; z += 7) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 3.0), white);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(laneX, 0.04, z);
          group.add(dash);
        }
      }
    } else {
      // One-way single carriageway (3 lanes)
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(11.5, L, 1, 2), asphalt.clone());
      if (this.roadTexture) {
        lane.material.map = this.roadTexture;
        lane.material.map.repeat.set(1.5, L / 12);
      }
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(0, 0.01, 0);
      group.add(lane);
      group.userData.roadMeshes.push(lane);
      for (const x of [-5.5, 5.5]) {
        const yl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, L * 0.96), yellow);
        yl.rotation.x = -Math.PI / 2;
        yl.position.set(x, 0.04, 0);
        group.add(yl);
      }
      for (const laneX of [-2.5, 0, 2.5]) {
        for (let z = -L / 2 + 2; z < L / 2; z += 7) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3.0), white);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(laneX, 0.04, z);
          group.add(dash);
        }
      }
    }

    // Black/white kerb blocks (photo style – longer segments, less flicker)
    const kW = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
    const kB = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (const side of [-1, 1]) {
      // Outer kerb
      for (let z = -L / 2 + 1.2; z < L / 2; z += 3.2) {
        const mat = Math.floor((z + L) / 3.2) % 2 === 0 ? kW : kB;
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 2.9), mat);
        kerb.position.set(side * 9.0, 0.1, z);
        group.add(kerb);
      }
      // Median kerb
      for (let z = -L / 2 + 1.2; z < L / 2; z += 3.2) {
        const mat = Math.floor((z + L) / 3.2) % 2 === 0 ? kW : kB;
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 2.9), mat);
        kerb.position.set(side * 0.78, 0.12, z);
        group.add(kerb);
      }
    }

    // Green barrier walls (flyover photo style) – occasional
    if (rand() > 0.55) {
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.85 });
      const greenTop = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.7 });
      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, L * 0.5), wallMat);
        wall.position.set(side * 10.5, 0.7, (rand() - 0.5) * 20);
        group.add(wall);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, L * 0.5), greenTop);
        top.position.set(side * 10.5, 1.5, wall.position.z);
        group.add(top);
      }
    }

    // Sidewalks
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xbcaaa4, roughness: 0.95 });
    for (const x of [-11.2, 11.2]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, L), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(x, 0.05, 0);
      group.add(walk);
    }

    // Solar street lights on median (photo)
    for (let i = 0; i < 2; i++) {
      if (rand() > 0.2) {
        group.add(this._makeStreetLight(0, -L / 2 + 16 + i * 32 + rand() * 4));
      }
    }

    // Roadside trees
    for (const side of [-1, 1]) {
      if (rand() > 0.3) {
        const tree = this._makeTree(rand);
        tree.position.set(side * (12.5 + rand() * 2), 0, (rand() - 0.5) * L * 0.5);
        group.add(tree);
      }
    }

    // Colorful Kano facades (photo: pink, blue, yellow, red shops)
    const facadeColors = [0xe8a090, 0x90caf9, 0xffe082, 0xef9a9a, 0xa5d6a7, 0xffcc80, 0xce93d8, 0x80cbc4];
    for (const side of [-1, 1]) {
      if (rand() > 0.35) {
        const h = 3.2 + rand() * 3.5;
        const w = 5 + rand() * 6;
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 2.4),
          new THREE.MeshStandardMaterial({
            color: facadeColors[Math.floor(rand() * facadeColors.length)],
            roughness: 0.9
          })
        );
        wall.position.set(side * (14 + rand() * 2), h / 2, (rand() - 0.5) * L * 0.35);
        group.add(wall);
        // Roof strip
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.3, 0.25, 2.7),
          new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.8 })
        );
        roof.position.set(wall.position.x, h + 0.1, wall.position.z);
        group.add(roof);
      }
    }

    // Underpass / flyover wall (Kano photo ref) – rare
    if (rand() > 0.82) {
      const concrete = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.9 });
      const redWhite = new THREE.MeshBasicMaterial({ color: 0xc62828 });
      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 18), concrete);
        wall.position.set(side * 9.8, 1.6, 0);
        group.add(wall);
      }
      // Red/white curb stripe feel
      for (const side of [-1, 1]) {
        for (let z = -8; z < 8; z += 2.2) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.35, 1.8),
            Math.floor((z + 10) / 2.2) % 2 === 0 ? redWhite : new THREE.MeshBasicMaterial({ color: 0xfafafa })
          );
          stripe.position.set(side * 9.5, 0.2, z);
          group.add(stripe);
        }
      }
      // Overhead beam
      const beam = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 3), concrete);
      beam.position.set(0, 3.6, 0);
      group.add(beam);
    }

    // Distance marker posts so progress is obvious (not identical void)
    if (Math.floor(zBase / L) % 2 === 0) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.8, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffeb3b })
      );
      post.position.set(-10.5, 0.9, 0);
      group.add(post);
    }

    // Photo billboard (real Kano ref) – sparse
    const pool = [this.billboardTex, this.billboardTex2, this.billboardTex3].filter(Boolean);
    const btex = pool.length ? pool[Math.floor(rand() * pool.length)] : null;
    if (btex && rand() > 0.65) {
      const side = rand() > 0.5 ? 1 : -1;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(7.2, 4.0),
        new THREE.MeshBasicMaterial({ map: btex, side: THREE.DoubleSide })
      );
      board.position.set(side * 16.5, 2.4, (rand() - 0.5) * L * 0.3);
      board.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(board);
    }

    // Rare minaret
    if (rand() > 0.9) {
      const minaret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.9 })
      );
      minaret.position.set(-16 - rand() * 2, 4, (rand() - 0.5) * 15);
      group.add(minaret);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xc9a66b })
      );
      dome.position.set(minaret.position.x, 8.3, minaret.position.z);
      group.add(dome);
    }

    return group;
  }

  _makeStreetLight(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 9, 6),
      new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.5, roughness: 0.4 })
    );
    pole.position.y = 4.5;
    g.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.07, 0.07),
      new THREE.MeshStandardMaterial({ color: 0x37474f })
    );
    arm.position.set(0, 8.8, 0);
    g.add(arm);
    for (const lx of [-1.2, 1.2]) {
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x546e7a, emissive: 0xffe0b2, emissiveIntensity: 0.2 })
      );
      head.position.set(lx, 8.65, 0);
      g.add(head);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.04, 0.35),
        new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.6 })
      );
      panel.position.set(lx, 8.85, 0);
      g.add(panel);
    }
    const light = new THREE.PointLight(0xffe0b2, 0, 28, 2);
    light.position.set(0, 8.4, 0);
    light.name = 'streetLight';
    g.add(light);
    return g;
  }

  _makeTree(rand) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 2.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    trunk.position.y = 1.1;
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.9 - i * 0.15, 6, 5),
        new THREE.MeshStandardMaterial({
          color: [0x2e7d32, 0x43a047, 0x1b5e20, 0x66bb6a][Math.floor(rand() * 4)],
          roughness: 1
        })
      );
      foliage.position.y = 2.6 + i * 0.55 + rand() * 0.2;
      g.add(foliage);
    }
    return g;
  }

  _makePole() {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 5.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x455a64 })
    );
    pole.position.y = 2.75;
    g.add(pole);
    return g;
  }

  _makePowerLine() {
    return this._makePole();
  }

  update(playerZ) {
    this.chunks.forEach((chunk) => {
      if (chunk.position.z + this.chunkLength < playerZ - this.chunkLength * 2.2) {
        const maxZ = Math.max(...this.chunks.map((c) => c.position.z));
        chunk.position.z = maxZ + this.chunkLength;
      }
    });
  }

  setNightMode(isNight) {
    this.scene.traverse((obj) => {
      if (obj.name === 'streetLight' && obj.isLight) {
        obj.intensity = isNight ? 6.5 : 0;
      }
    });
  }
}
