import * as THREE from 'three';

/**
 * Kano traffic — dual carriageway rules:
 *  Player drives +Z on RIGHT side (x > 0), Nigeria right-hand traffic.
 *  Same-direction: x = +2.6 / +5.2
 *  Oncoming:     x = -2.6 / -5.2, face -Z, move toward player
 * Mix: ~50% keke · ~20% okada · ~30% cars
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
    this.loadedCount = 0;
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
    } else {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 1.35, 2.5),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.45, metalness: 0.2 })
      );
      body.position.y = 0.95;
      g.add(body);
    }
    g.userData.isProxy = true;
    return g;
  }

  _pickKind(preferKeke = false) {
    if (this.raceMode || preferKeke) return 'keke';
    const r = Math.random();
    if (r < 0.5) return 'keke';
    if (r < 0.7) return 'okada';
    if (r < 0.9) return 'car';
    if (r < 0.97) return 'truck';
    return 'bike';
  }

  /** Normalize GLB: sit on ground, reasonable size, face +Z */
  _normalize(mesh, kind) {
    try {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      // Center XZ, feet on y=0
      mesh.position.x -= center.x;
      mesh.position.z -= center.z;
      mesh.position.y -= box.min.y;
      // Target length along Z roughly
      const targetLen =
        kind === 'okada' || kind === 'bike' ? 2.0 : kind === 'keke' ? 2.6 : kind === 'truck' ? 5.5 : 4.2;
      const longest = Math.max(size.x, size.y, size.z, 0.01);
      const s = targetLen / longest;
      if (s > 0.01 && s < 80) mesh.scale.multiplyScalar(s);
      mesh.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(mesh);
      mesh.position.y -= box2.min.y;
    } catch (e) {}
    return mesh;
  }

  _meshFor(preferKeke = false) {
    const kind = this._pickKind(preferKeke);
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
        const m = this._kekeTpl.clone(true);
        return { mesh: m, kind: 'keke' };
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

  /** Lane X for dual road — Nigeria drives on the RIGHT */
  _laneX(opposite) {
    if (opposite) {
      // Oncoming carriageway (left of center from player's view)
      return Math.random() > 0.5 ? -3.2 : -5.4;
    }
    // Same direction as player (right side)
    return Math.random() > 0.5 ? 3.2 : 5.4;
  }

  init() {
    this.ready = true;
    for (let i = 0; i < 6; i++) this._spawn(true);
  }

  async loadRealModels() {
    if (!this.assets) return;
    this.assets.enableNetwork?.();
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;

    const core = [
      { path: '/assets/models/keke.glb', kind: 'keke', scale: 1 },
      { path: '/assets/models/okada.glb', kind: 'okada', scale: 1 },
      { path: '/assets/models/Mitsubishi_L200.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/Car.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/Taxi.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/SUV.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/police_car.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/car_2.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/sports_car.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/sports_car2.glb', kind: 'car', scale: 1 },
      { path: '/assets/models/traffic_vehicle%20(2).glb', kind: 'car', scale: 1 },
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1 }
    ];
    const list = isMobile ? core.slice(0, 7) : core;
    this.loadedCount = 0;

    for (const c of list) {
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: 1, timeoutMs: 14000 });
        if (!mesh) {
          console.warn('[Traffic] missing', c.path);
          continue;
        }
        this._normalize(mesh, c.kind);
        if (c.kind === 'keke') {
          this._kekeTpl = mesh;
          this.templates.keke.push(mesh);
        } else if (c.kind === 'okada') {
          this.templates.okada.push(mesh);
        } else {
          this.templates.car.push(mesh);
        }
        this.loadedCount++;
        console.log('[Traffic] OK', c.kind, c.path);
      } catch (e) {
        console.warn('[Traffic] fail', c.path, e);
      }
    }

    // Replace all proxies with real meshes + fix lanes
    this.vehicles.forEach((v) => {
      try {
        this.scene.remove(v.mesh);
      } catch (e) {}
      const next = this._meshFor(v.rival);
      v.mesh = next.mesh;
      v.kind = next.kind;
      v.opposite = this.raceMode ? false : Math.random() < 0.12;
      v.laneX = this._laneX(v.opposite);
      const playerZ = this.player?.group?.position.z || 0;
      v.mesh.position.set(v.laneX, 0, playerZ + 40 + Math.random() * 80);
      // Face direction of travel: +Z same-dir, -Z oncoming
      v.mesh.rotation.set(0, v.opposite ? Math.PI : 0, 0);
      const b =
        v.kind === 'okada' || v.kind === 'bike'
          ? 14
          : v.kind === 'keke'
            ? 11
            : v.kind === 'truck'
              ? 7
              : 9;
      v.speed = v.opposite ? -(b + Math.random() * 5) : b + Math.random() * 7;
      this.scene.add(v.mesh);
    });

    // Guarantee some visible traffic ahead
    while (this.vehicles.length < Math.min(6, this.maxVehicles)) {
      this._spawn(true);
    }

    return this.loadedCount;
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
    const prefer = this.raceMode;
    const { mesh, kind } = this._meshFor(prefer);
    // Oncoming only ~12% (not race)
    const opposite = this.raceMode ? false : Math.random() < 0.12;
    const lane = this._laneX(opposite);
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 30 + Math.random() * 90 : playerZ + 90 + Math.random() * 70;
    mesh.position.set(lane, 0, z);
    mesh.rotation.set(0, opposite ? Math.PI : 0, 0);
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
        const target = 10 + Math.min(12, pSpeed * 0.42);
        v.speed += (target - v.speed) * 0.03;
      }
      v.mesh.position.z += v.speed * dt;

      // Keep locked to correct carriageway (prevent drift into wrong lane)
      v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.08);
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 35) {
        const away = Math.sign(v.laneX) || 1;
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + away * 0.6, 0.1);
      }

      // Enforce facing
      v.mesh.rotation.y = v.opposite ? Math.PI : 0;

      v.mesh.visible = Math.abs(v.mesh.position.z - playerZ) < 180;

      if (v.mesh.position.z < playerZ - 55 || v.mesh.position.z > playerZ + 280) {
        try {
          this.scene.remove(v.mesh);
        } catch (e) {}
        const next = this._meshFor(this.raceMode);
        v.mesh = next.mesh;
        v.kind = next.kind;
        v.opposite = this.raceMode ? false : Math.random() < 0.12;
        v.laneX = this._laneX(v.opposite);
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
        v.mesh.rotation.set(0, v.opposite ? Math.PI : 0, 0);
        this.scene.add(v.mesh);
      }
    });
  }
}
