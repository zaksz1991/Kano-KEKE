import * as THREE from 'three';

/**
 * Kano traffic — dual carriageway, many GLBs, timed loads
 * Mix ~50% keke · ~20% okada · ~30% cars
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = /Android|iPhone|Mobile/i.test(navigator.userAgent) ? 9 : 14;
    this.ready = false;
    this.raceMode = false;
    this.templates = { keke: [], okada: [], car: [], truck: [], bike: [] };
    this._kekeTpl = null;
    this.loadedCount = 0;
    this.loadLog = [];
  }

  _proxy(kind) {
    const g = new THREE.Group();
    const col =
      kind === 'keke'
        ? 0xffcc00
        : kind === 'okada'
          ? 0x1a237e
          : kind === 'truck'
            ? 0xc62828
            : kind === 'bike'
              ? 0x37474f
              : [0x1565c0, 0xffffff, 0x212121, 0xf9a825][Math.floor(Math.random() * 4)];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        kind === 'okada' || kind === 'bike' ? 0.55 : kind === 'truck' ? 2.1 : 1.7,
        kind === 'okada' || kind === 'bike' ? 0.7 : 1.15,
        kind === 'okada' || kind === 'bike' ? 1.7 : kind === 'truck' ? 5 : 3.8
      ),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })
    );
    body.position.y = kind === 'okada' || kind === 'bike' ? 0.55 : 0.75;
    g.add(body);
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

  _normalize(mesh, kind) {
    try {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      mesh.position.x -= center.x;
      mesh.position.z -= center.z;
      mesh.position.y -= box.min.y;
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
    // Prefer any loaded GLB over box proxies
    const hasAny =
      this.templates.keke.length + this.templates.okada.length + this.templates.car.length > 0;

    if (kind === 'keke' && this._kekeTpl) {
      try {
        return { mesh: this._kekeTpl.clone(true), kind: 'keke' };
      } catch (e) {}
    }
    if (kind === 'keke' && this.templates.keke.length) {
      try {
        return { mesh: this.templates.keke[Math.floor(Math.random() * this.templates.keke.length)].clone(true), kind: 'keke' };
      } catch (e) {}
    }
    if ((kind === 'okada' || kind === 'bike') && this.templates.okada.length) {
      try {
        return { mesh: this.templates.okada[Math.floor(Math.random() * this.templates.okada.length)].clone(true), kind: 'okada' };
      } catch (e) {}
    }
    if (this.templates.car.length && (kind === 'car' || kind === 'truck' || (hasAny && kind !== 'keke'))) {
      try {
        return { mesh: this.templates.car[Math.floor(Math.random() * this.templates.car.length)].clone(true), kind: kind === 'truck' ? 'truck' : 'car' };
      } catch (e) {}
    }
    // Last resort: only if no GLBs at all
    if (!hasAny) return { mesh: this._proxy(kind), kind };
    // Have GLBs but not this kind — use a car/keke GLB instead of box
    if (this.templates.keke.length) {
      try {
        return { mesh: this.templates.keke[0].clone(true), kind: 'keke' };
      } catch (e) {}
    }
    if (this.templates.car.length) {
      try {
        return { mesh: this.templates.car[0].clone(true), kind: 'car' };
      } catch (e) {}
    }
    return { mesh: this._proxy(kind), kind };
  }

  _laneX(opposite) {
    if (opposite) return Math.random() > 0.5 ? -3.2 : -5.4;
    return Math.random() > 0.5 ? 3.2 : 5.4;
  }

  init() {
    this.ready = true;
    for (let i = 0; i < 6; i++) this._spawn(true);
  }

  /** All candidate GLBs — root + vehicles/ + alternate names */
  _modelList(isMobile) {
    const entries = [
      { path: '/assets/models/keke.glb', kind: 'keke' },
      { path: '/assets/models/vehicles/keke.glb', kind: 'keke' },
      { path: '/assets/models/okada.glb', kind: 'okada' },
      { path: '/assets/models/vehicles/okada.glb', kind: 'okada' },
      { path: '/assets/models/Mitsubishi_L200.glb', kind: 'car' },
      { path: '/assets/models/vehicles/Mitsubishi_L200.glb', kind: 'car' },
      { path: '/assets/models/Car.glb', kind: 'car' },
      { path: '/assets/models/vehicles/Car.glb', kind: 'car' },
      { path: '/assets/models/Taxi.glb', kind: 'car' },
      { path: '/assets/models/SUV.glb', kind: 'car' },
      { path: '/assets/models/police_car.glb', kind: 'car' },
      { path: '/assets/models/Police%20Car.glb', kind: 'car' },
      { path: '/assets/models/car_2.glb', kind: 'car' },
      { path: '/assets/models/Car-2.glb', kind: 'car' },
      { path: '/assets/models/sports_car.glb', kind: 'car' },
      { path: '/assets/models/sports_car2.glb', kind: 'car' },
      { path: '/assets/models/Sports%20Car.glb', kind: 'car' },
      { path: '/assets/models/Sports%20Car-1.glb', kind: 'car' },
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car' },
      { path: '/assets/models/traffic_vehicle%20(2).glb', kind: 'car' },
      { path: '/assets/models/vehicles/traffic_vehicle.glb', kind: 'car' },
      { path: '/assets/models/vehicles/police_car.glb', kind: 'car' },
      { path: '/assets/models/vehicles/Taxi.glb', kind: 'car' },
      { path: '/assets/models/vehicles/SUV.glb', kind: 'car' }
    ];
    // Mobile: still try many, but shorter timeout per file
    return isMobile ? entries : entries;
  }

  async loadRealModels() {
    if (!this.assets) return 0;
    this.assets.enableNetwork?.();
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
    const list = this._modelList(isMobile);
    const timeoutMs = isMobile ? 10000 : 14000;
    this.loadedCount = 0;
    this.loadLog = [];
    const t0 = performance.now();
    const seen = new Set();

    for (const c of list) {
      // Skip duplicate kind paths if we already have enough of that kind
      const kindCount =
        c.kind === 'keke'
          ? this.templates.keke.length
          : c.kind === 'okada'
            ? this.templates.okada.length
            : this.templates.car.length;
      if (c.kind === 'keke' && kindCount >= 2) continue;
      if (c.kind === 'okada' && kindCount >= 2) continue;
      if (c.kind === 'car' && kindCount >= 8) continue;

      const start = performance.now();
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: 1, timeoutMs });
        const ms = Math.round(performance.now() - start);
        if (!mesh) {
          this.loadLog.push({ path: c.path, ok: false, ms });
          console.warn('[Traffic] ' + ms + 'ms FAIL', c.path);
          continue;
        }
        if (seen.has(c.path)) continue;
        seen.add(c.path);
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
        this.loadLog.push({ path: c.path, ok: true, ms, kind: c.kind });
        console.log('[Traffic] ' + ms + 'ms OK', c.kind, c.path);
        // Soft yield so UI stays responsive
        await new Promise((r) => setTimeout(r, 0));
      } catch (e) {
        const ms = Math.round(performance.now() - start);
        this.loadLog.push({ path: c.path, ok: false, ms, err: String(e?.message || e) });
        console.warn('[Traffic] ' + ms + 'ms ERR', c.path, e);
      }
    }

    const totalMs = Math.round(performance.now() - t0);
    this.lastLoadMs = totalMs;
    console.log('[Traffic] done', this.loadedCount, 'models in', totalMs, 'ms', this.loadLog);

    // Refresh fleet
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
    while (this.vehicles.length < Math.min(6, this.maxVehicles)) this._spawn(true);
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
    const { mesh, kind } = this._meshFor(this.raceMode);
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
      v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.08);
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 35) {
        const away = Math.sign(v.laneX) || 1;
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + away * 0.6, 0.1);
      }
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
