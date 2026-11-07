import * as THREE from 'three';

/**
 * Traffic + NAPEP race rivals – prefers GLB, minimal proxies only if load fails
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 7;
    this.ready = false;
    this.raceMode = false;
    this.templates = [];
    this._kekeTpl = null;
  }

  _proxyKeke() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.05, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5, metalness: 0.25 })
    );
    body.position.y = 0.8;
    g.add(body);
    return g;
  }

  _meshFor(preferKeke = false) {
    if (preferKeke && this._kekeTpl) {
      try {
        return { mesh: this._kekeTpl.clone(true), kind: 'keke' };
      } catch (e) {}
    }
    if (this.templates.length) {
      const pick = this.templates[Math.floor(Math.random() * this.templates.length)];
      try {
        return { mesh: pick.mesh.clone(true), kind: pick.kind };
      } catch (e) {}
    }
    return { mesh: this._proxyKeke(), kind: 'keke' };
  }

  init() {
    this.ready = true;
    for (let i = 0; i < 4; i++) this._spawn(true);
  }

  async loadRealModels() {
    if (!this.assets) return;
    this.assets.enableNetwork?.();
    // Player-style keke for race rivals
    try {
      const k = await this.assets.loadGLB('/assets/models/keke.glb', { scale: 0.8, timeoutMs: 20000 });
      if (k) this._kekeTpl = k;
    } catch (e) {}
    const list = [
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/okada.glb', kind: 'okada', scale: 1.0 },
      { path: '/assets/models/Car.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/Taxi.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/SUV.glb', kind: 'van', scale: 1.0 },
      { path: '/assets/models/Police Car.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/Car-2.glb', kind: 'car', scale: 1.05 }
    ];
    for (const c of list) {
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: c.scale, timeoutMs: 12000 });
        if (!mesh) continue;
        this.templates.push({ mesh, kind: c.kind });
      } catch (e) {}
    }
    // Refresh existing
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
    const playerZ = this.player?.group?.position.z || 0;
    for (let i = 0; i < count; i++) {
      const { mesh } = this._meshFor(true);
      const lane = (i % 2 === 0 ? 1 : -1) * (2.6 + (i % 3) * 1.15);
      mesh.position.set(lane, 0, playerZ + 18 + i * 14);
      this.scene.add(mesh);
      this.vehicles.push({
        mesh,
        kind: 'keke',
        speed: 11 + Math.random() * 7,
        laneX: lane,
        opposite: false,
        rival: true
      });
    }
  }

  _spawn(initial) {
    const prefer = this.raceMode || Math.random() < 0.35;
    const { mesh, kind } = this._meshFor(prefer);
    const opposite = this.raceMode ? false : Math.random() < 0.06;
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
    const z = initial ? playerZ + 35 + Math.random() * 70 : playerZ + 95 + Math.random() * 50;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base = kind === 'okada' ? 12 : kind === 'keke' ? 11 : 9;
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
    while (this.vehicles.length < Math.min(this.maxVehicles, this.raceMode ? 8 : 6)) {
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
      v.mesh.visible = Math.abs(v.mesh.position.z - playerZ) < 150;
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 260) {
        try {
          this.scene.remove(v.mesh);
        } catch (e) {}
        const next = this._meshFor(this.raceMode || Math.random() < 0.4);
        v.mesh = next.mesh;
        v.kind = next.kind;
        v.opposite = this.raceMode ? false : Math.random() < 0.05;
        v.laneX = v.opposite
          ? px >= 0
            ? -3 - Math.random() * 2
            : 3 + Math.random() * 2
          : px >= 0
            ? 3 + Math.random() * 2.5
            : -3 - Math.random() * 2.5;
        v.speed = v.opposite ? -(9 + Math.random() * 5) : 8 + Math.random() * 8;
        v.mesh.position.set(v.laneX, 0, playerZ + 90 + Math.random() * 45);
        v.mesh.rotation.y = v.opposite ? Math.PI : 0;
        this.scene.add(v.mesh);
      }
    });
  }

  getRacePlace() {
    if (!this.raceMode) return null;
    const playerZ = this.player.group.position.z;
    return this.vehicles.filter((v) => v.rival && v.mesh.position.z > playerZ).length + 1;
  }
}
