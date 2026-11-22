import * as THREE from 'three';

/**
 * Kano traffic mix (real street share):
 *  ~50% Keke NAPEP · ~20% okada/motorcycle · ~30% cars / pickup / truck / bicycle
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = /Android|iPhone|Mobile/i.test(navigator.userAgent) ? 8 : 12;
    this.ready = false;
    this.raceMode = false;
    this.templates = { keke: [], okada: [], car: [], truck: [], bike: [] };
    this._kekeTpl = null;
  }

  _proxy(kind) {
    const g = new THREE.Group();
    if (kind === 'okada' || kind === 'bike') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.7, 1.7),
        new THREE.MeshStandardMaterial({
          color: kind === 'bike' ? 0x37474f : 0x1a237e,
          roughness: 0.55
        })
      );
      body.position.y = 0.55;
      g.add(body);
      const wheel = () => {
        const w = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10),
          new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        w.rotation.z = Math.PI / 2;
        return w;
      };
      const w1 = wheel();
      w1.position.set(0, 0.28, 0.55);
      const w2 = wheel();
      w2.position.set(0, 0.28, -0.55);
      g.add(w1, w2);
    } else if (kind === 'truck') {
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 1.5, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 })
      );
      cab.position.set(0, 1.0, 1.2);
      g.add(cab);
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 1.4, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.7 })
      );
      bed.position.set(0, 1.1, -1.5);
      g.add(bed);
    } else if (kind === 'car' || kind === 'pickup') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 1.15, 4.0),
        new THREE.MeshStandardMaterial({
          color: [0x1565c0, 0xffffff, 0x212121, 0xf9a825, 0x2e7d32][Math.floor(Math.random() * 5)],
          roughness: 0.45,
          metalness: 0.2
        })
      );
      body.position.y = 0.75;
      g.add(body);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.7, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x90caf9, transparent: true, opacity: 0.55 })
      );
      cabin.position.set(0, 1.45, -0.2);
      g.add(cabin);
    } else {
      // keke NAPEP yellow
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 1.35, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.45, metalness: 0.2 })
      );
      body.position.y = 0.95;
      g.add(body);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.12, 2.55),
        new THREE.MeshStandardMaterial({ color: 0xf57f17 })
      );
      roof.position.y = 1.7;
      g.add(roof);
    }
    return g;
  }

  /** Weighted pick matching Kano roads */
  _pickKind(preferKeke = false) {
    if (this.raceMode || preferKeke) return 'keke';
    const r = Math.random();
    if (r < 0.5) return 'keke';
    if (r < 0.7) return 'okada';
    if (r < 0.88) return 'car';
    if (r < 0.95) return 'truck';
    return 'bike';
  }

  _meshFor(preferKeke = false) {
    const kind = this._pickKind(preferKeke);
    // Prefer GLB pool for that kind
    const pool =
      kind === 'keke'
        ? this.templates.keke
        : kind === 'okada' || kind === 'bike'
          ? this.templates.okada.length
            ? this.templates.okada
            : this.templates.bike
          : kind === 'truck'
            ? this.templates.truck.length
              ? this.templates.truck
              : this.templates.car
            : this.templates.car;

    if (kind === 'keke' && this._kekeTpl) {
      try {
        return { mesh: this._kekeTpl.clone(true), kind: 'keke' };
      } catch (e) {}
    }
    if (pool && pool.length) {
      try {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { mesh: pick.clone(true), kind };
      } catch (e) {}
    }
    return { mesh: this._proxy(kind), kind };
  }

  init() {
    this.ready = true;
    for (let i = 0; i < 6; i++) this._spawn(true);
  }

  async loadRealModels() {
    if (!this.assets) return;
    this.assets.enableNetwork?.();
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;

    // Always try keke + okada (core Kano mix) even on mobile
    const core = [
      { path: '/assets/models/keke.glb', kind: 'keke', scale: 0.95 },
      { path: '/assets/models/okada.glb', kind: 'okada', scale: 2.4 },
      { path: '/assets/models/Mitsubishi_L200.glb', kind: 'car', scale: 2.8 },
      { path: '/assets/models/Car.glb', kind: 'car', scale: 2.6 },
      { path: '/assets/models/Taxi.glb', kind: 'car', scale: 2.6 },
      { path: '/assets/models/SUV.glb', kind: 'car', scale: 2.5 },
      { path: '/assets/models/police_car.glb', kind: 'car', scale: 2.6 },
      { path: '/assets/models/car_2.glb', kind: 'car', scale: 2.6 },
      { path: '/assets/models/sports_car.glb', kind: 'car', scale: 2.4 },
      { path: '/assets/models/sports_car2.glb', kind: 'car', scale: 2.4 },
      { path: '/assets/models/traffic_vehicle%20(2).glb', kind: 'car', scale: 2.6 },
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 2.6 }
    ];
    // Mobile still loads core mix (keke/okada/cars) — slice only if needed
    const list = isMobile ? core.slice(0, 6) : core;


    for (const c of list) {
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: c.scale, timeoutMs: 14000 });
        if (!mesh) continue;
        if (c.kind === 'keke') {
          this._kekeTpl = mesh;
          this.templates.keke.push(mesh);
        } else if (c.kind === 'okada') {
          this.templates.okada.push(mesh);
        } else {
          this.templates.car.push(mesh);
        }
      } catch (e) {}
    }

    // Replace proxy fleet with real models
    this.vehicles.forEach((v) => {
      try {
        const next = this._meshFor(v.rival);
        const pos = v.mesh.position.clone();
        const rotY = v.mesh.rotation.y;
        this.scene.remove(v.mesh);
        v.mesh = next.mesh;
        v.kind = next.kind;
        v.mesh.position.copy(pos);
        v.mesh.rotation.y = rotY;
        this.scene.add(v.mesh);
      } catch (e) {}
    });
  }

  startRace(count = 7) {
    this.raceMode = true;
    this.maxVehicles = Math.max(this.maxVehicles, count);
    this.vehicles.forEach((v) => {
      try {
        this.scene.remove(v.mesh);
      } catch (e) {}
    });
    this.vehicles = [];
    for (let i = 0; i < count; i++) this._spawn(true);
  }

  _spawn(initial) {
    const prefer = this.raceMode || false;
    const { mesh, kind } = this._meshFor(prefer);
    const opposite = this.raceMode ? false : Math.random() < 0.08;
    let lane = opposite
      ? Math.random() > 0.5
        ? -5.2
        : -3.0
      : Math.random() > 0.5
        ? 3.0
        : 5.4;
    const playerZ = this.player?.group?.position.z || 0;
    const px = this.player?.group?.position.x || 0;
    if (Math.abs(lane - px) < 2.0) lane = px >= 0 ? px + 2.8 : px - 2.8;
    const z = initial ? playerZ + 25 + Math.random() * 80 : playerZ + 90 + Math.random() * 60;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base =
      kind === 'okada' || kind === 'bike'
        ? 14
        : kind === 'keke'
          ? 11
          : kind === 'truck'
            ? 7
            : 9;
    this.vehicles.push({
      mesh,
      kind,
      speed: opposite ? -(base + Math.random() * 5) : base + Math.random() * 7,
      laneX: lane,
      opposite,
      rival: this.raceMode
    });
  }

  update(delta, horn) {
    if (!this.ready) return;
    while (this.vehicles.length < Math.min(this.maxVehicles, this.raceMode ? 8 : 10)) {
      this._spawn(false);
    }
    const playerZ = this.player.group.position.z;
    const pSpeed = this.player.currentSpeed || 0;
    const dt = Math.min(delta, 0.05);
    this.vehicles.forEach((v) => {
      if (v.rival && this.raceMode) {
        const target = 10 + Math.min(12, pSpeed * 0.42) + (Math.random() - 0.5);
        v.speed += (target - v.speed) * 0.03;
      }
      v.mesh.position.z += v.speed * dt;
      const pz = this.player.group.position.z;
      const px = this.player.group.position.x;
      if (pSpeed < 1.2 && Math.abs(v.mesh.position.z - pz) < 14 && Math.abs(v.mesh.position.x - px) < 3) {
        v.laneX = px + Math.sign(v.mesh.position.x - px || 1) * 2.5;
      }
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 35) {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + 1.4, 0.1);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.06);
      }
      v.mesh.visible = Math.abs(v.mesh.position.z - playerZ) < 160;
      if (v.mesh.position.z < playerZ - 55 || v.mesh.position.z > playerZ + 280) {
        try {
          this.scene.remove(v.mesh);
        } catch (e) {}
        const next = this._meshFor(this.raceMode);
        v.mesh = next.mesh;
        v.kind = next.kind;
        v.opposite = this.raceMode ? false : Math.random() < 0.08;
        v.laneX = v.opposite
          ? Math.random() > 0.5
            ? -5.2
            : -3.0
          : Math.random() > 0.5
            ? 3.0
            : 5.4;
        const b =
          v.kind === 'okada' || v.kind === 'bike'
            ? 14
            : v.kind === 'keke'
              ? 11
              : v.kind === 'truck'
                ? 7
                : 9;
        v.speed = v.opposite ? -(b + Math.random() * 5) : b + Math.random() * 7;
        v.mesh.position.set(v.laneX, 0, playerZ + 100 + Math.random() * 50);
        v.mesh.rotation.y = v.opposite ? Math.PI : 0;
        this.scene.add(v.mesh);
      }
    });
  }
}
