import * as THREE from 'three';

/**
 * Dense Kano roadside props – bus stops, vendors, pumps, small mosques, crowds
 * Spawned along the infinite road relative to player Z
 */
export class KanoRoadsideLife {
  constructor(scene) {
    this.scene = scene;
    this.props = [];
    this.maxProps = 8;
    this._spawnedUntil = 0;
    this.rng = (seed) => {
      let s = (Math.abs(seed | 0) % 2147483646) + 1;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
  }

  init() {
    for (let i = 0; i < 8; i++) {
      this._spawnAt(40 + i * 70);
    }
    this._spawnedUntil = 40 + 7 * 70;
  }

  _spawnAt(z) {
    const rand = this.rng(Math.floor(z * 19.7 + 3));
    const side = rand() > 0.5 ? 1 : -1;
    const x = side * (9.5 + rand() * 3);
    const roll = rand();
    let mesh;
    if (roll < 0.2) mesh = this._busStop(rand);
    else if (roll < 0.4) mesh = this._vendor(rand);
    else if (roll < 0.55) mesh = this._pump(rand);
    else if (roll < 0.7) mesh = this._miniMosque(rand);
    else if (roll < 0.85) mesh = this._waterTank(rand);
    else mesh = this._billboard(rand);

    mesh.position.set(x, 0, z);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 + (rand() - 0.5) * 0.2 : Math.PI / 2 + (rand() - 0.5) * 0.2;
    this.scene.add(mesh);
    this.props.push({ mesh, z });
  }

  _busStop(rand) {
    const g = new THREE.Group();
    // Shelter roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6 })
    );
    roof.position.y = 2.4;
    roof.castShadow = true;
    g.add(roof);
    // Posts
    for (const px of [-1.4, 1.4]) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.4 })
      );
      p.position.set(px, 1.2, 0.5);
      g.add(p);
    }
    // Bench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    bench.position.set(0, 0.55, 0.3);
    g.add(bench);
    // Sign
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.5, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xf9a825 })
    );
    sign.position.set(0, 2.7, 0);
    g.add(sign);
    // Waiting person
    if (rand() > 0.3) {
      const person = this._person(rand);
      person.position.set((rand() - 0.5) * 1.5, 0, 0.6);
      g.add(person);
    }
    return g;
  }

  _vendor(rand) {
    const g = new THREE.Group();
    const colors = [0xc62828, 0x1565c0, 0x2e7d32, 0xf9a825, 0x6a1b9a];
    // Table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x6d4c41 })
    );
    table.position.y = 0.85;
    table.castShadow = true;
    g.add(table);
    for (const [x, z] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.85, 5),
        new THREE.MeshStandardMaterial({ color: 0x5d4037 })
      );
      leg.position.set(x, 0.42, z);
      g.add(leg);
    }
    // Umbrella
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x455a64 })
    );
    pole.position.y = 1.1;
    g.add(pole);
    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 0.35, 10),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)], roughness: 0.7 })
    );
    umbrella.position.y = 2.25;
    umbrella.castShadow = true;
    g.add(umbrella);
    // Goods
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.2, 0.25),
        new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)] })
      );
      box.position.set(-0.7 + i * 0.45, 1.05, 0);
      g.add(box);
    }
    // Vendor
    const vendor = this._person(rand);
    vendor.position.set(0.3, 0, -0.7);
    g.add(vendor);
    return g;
  }

  _pump(rand) {
    const g = new THREE.Group();
    // Canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.25, 4),
      new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.55 })
    );
    canopy.position.y = 4.0;
    canopy.castShadow = true;
    g.add(canopy);
    for (const px of [-2, 2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5 })
      );
      post.position.set(px, 2, 0);
      g.add(post);
    }
    // Pump unit
    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.45 })
    );
    pump.position.set(0, 0.8, 1.2);
    pump.castShadow = true;
    g.add(pump);
    const display = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x212121, emissive: 0x00e676, emissiveIntensity: 0.3 })
    );
    display.position.set(0, 1.35, 1.46);
    g.add(display);
    return g;
  }

  _miniMosque(rand) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.85 })
    );
    body.position.y = 1.6;
    body.castShadow = true;
    g.add(body);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.25, roughness: 0.4 })
    );
    dome.position.y = 4.0;
    g.add(dome);
    const minaret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.35, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5 })
    );
    minaret.position.set(2.2, 3, 2.2);
    minaret.castShadow = true;
    g.add(minaret);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd54f })
    );
    cap.position.set(2.2, 6.3, 2.2);
    g.add(cap);
    return g;
  }

  _waterTank(rand) {
    const g = new THREE.Group();
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.95, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x00838f, roughness: 0.5, metalness: 0.2 })
    );
    tank.position.y = 2.4;
    tank.castShadow = true;
    g.add(tank);
    // Stand
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.4, 5),
        new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.5 })
      );
      leg.position.set(x, 0.7, z);
      g.add(leg);
    }
    return g;
  }

  _billboard(rand) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 5, 6),
      new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.4 })
    );
    post.position.y = 2.5;
    g.add(post);
    const colors = [0xc62828, 0x1565c0, 0x2e7d32, 0xf57f17, 0x6a1b9a];
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.8, 0.12),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)], roughness: 0.55 })
    );
    board.position.y = 5.2;
    board.castShadow = true;
    g.add(board);
    return g;
  }

  _person(rand) {
    const g = new THREE.Group();
    const colors = [0x1565c0, 0xc62828, 0x2e7d32, 0x6a1b9a, 0xef6c00, 0xffffff];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.7, 0.3),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(rand() * colors.length)], roughness: 0.75 })
    );
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd7ccc8 })
    );
    head.position.y = 1.5;
    g.add(head);
    return g;
  }

  update(playerZ) {
    // Recycle far props ahead
    this.props.forEach((p) => {
      if (p.z < playerZ - 60) {
        this.scene.remove(p.mesh);
        p.dead = true;
      }
      // LOD
      if (p.mesh) p.mesh.visible = Math.abs(p.z - playerZ) < 180;
    });
    this.props = this.props.filter((p) => !p.dead);

    while (this._spawnedUntil < playerZ + 250 && this.props.length < this.maxProps) {
      this._spawnedUntil += 55 + Math.random() * 40;
      this._spawnAt(this._spawnedUntil);
    }
  }
}
