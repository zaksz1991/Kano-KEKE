import * as THREE from 'three';

/**
 * Traffic + Keke Race rivals — ZERO network at start
 * Procedural NAPEP/cars only (no GLB downloads)
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 5;
    this.ready = false;
    this.raceMode = false;
  }

  /** Yellow NAPEP-style keke (procedural) */
  _makeKeke() {
    const g = new THREE.Group();
    const yellow = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const black = new THREE.MeshBasicMaterial({ color: 0x212121 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 2.2), yellow);
    body.position.y = 0.85;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 1.5), black);
    roof.position.set(0, 1.45, -0.15);
    g.add(roof);
    // simple wheels
    for (const [x, z] of [
      [-0.55, 0.7],
      [0.55, 0.7],
      [-0.55, -0.7],
      [0.55, -0.7]
    ]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.4), black);
      w.position.set(x, 0.25, z);
      g.add(w);
    }
    return g;
  }

  _makeCar() {
    const g = new THREE.Group();
    const colors = [0x1565c0, 0xc62828, 0x2e7d32, 0x455a64, 0xff8f00];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.65, 3.2),
      new THREE.MeshBasicMaterial({ color: col })
    );
    body.position.y = 0.5;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.5, 1.3),
      new THREE.MeshBasicMaterial({ color: 0x263238 })
    );
    cabin.position.set(0, 1.0, -0.15);
    g.add(cabin);
    return g;
  }

  _makeOkada() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.65, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xfdd835 })
    );
    body.position.y = 0.5;
    g.add(body);
    return g;
  }

  _meshFor(preferKeke = false) {
    if (preferKeke || this.raceMode) {
      return { mesh: this._makeKeke(), kind: 'keke' };
    }
    const r = Math.random();
    if (r < 0.35) return { mesh: this._makeOkada(), kind: 'okada' };
    if (r < 0.55) return { mesh: this._makeKeke(), kind: 'keke' };
    return { mesh: this._makeCar(), kind: 'car' };
  }

  init() {
    this.ready = true;
    for (let i = 0; i < Math.min(4, this.maxVehicles); i++) this._spawn(true);
    // NO GLB — never call loadGLB
  }

  /** Race: pack of rival NAPEP kekes */
  startRace(count = 6) {
    this.raceMode = true;
    this.maxVehicles = Math.max(this.maxVehicles, count);
    // clear soft traffic
    this.vehicles.forEach((v) => {
      try {
        this.scene.remove(v.mesh);
      } catch (e) {}
    });
    this.vehicles = [];
    const playerZ = this.player?.group?.position.z || 0;
    for (let i = 0; i < count; i++) {
      const { mesh, kind } = this._meshFor(true);
      const lane = (i % 2 === 0 ? 1 : -1) * (2.5 + (i % 3) * 1.2);
      const z = playerZ + 25 + i * 18 + Math.random() * 8;
      mesh.position.set(lane, 0, z);
      mesh.rotation.y = 0;
      this.scene.add(mesh);
      this.vehicles.push({
        mesh,
        kind: 'keke',
        speed: 9 + Math.random() * 6 + i * 0.3,
        laneX: lane,
        opposite: false,
        rival: true,
        name: ['Danladi', 'Sule', 'Bala', 'Musa', 'Tunde', 'Chike', 'Emeka', 'Aisha'][i % 8]
      });
    }
  }

  _spawn(initial) {
    const { mesh, kind } = this._meshFor(this.raceMode);
    const opposite = this.raceMode
      ? false
      : window.__kanoRoadMode === 'single'
        ? false
        : Math.random() < 0.05;
    let lane = opposite
      ? Math.random() > 0.5
        ? -5.5
        : -3.0
      : Math.random() > 0.5
        ? 3.0
        : 5.5;
    const playerZ = this.player?.group?.position.z || 0;
    const px = this.player?.group?.position.x || 0;
    if (Math.abs(lane - px) < 2.0) lane = px >= 0 ? px + 2.8 : px - 2.8;
    const z = initial ? playerZ + 40 + Math.random() * 80 : playerZ + 100 + Math.random() * 50;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base = kind === 'okada' ? 10 : kind === 'keke' ? 9 : 8;
    this.vehicles.push({
      mesh,
      kind,
      speed: opposite ? -(base + Math.random() * 5) : base + Math.random() * 6,
      laneX: lane,
      opposite,
      rival: this.raceMode
    });
  }

  update(delta, horn) {
    if (!this.ready || !this.vehicles.length) return;
    const playerZ = this.player.group.position.z;
    const pSpeed = this.player.currentSpeed || 0;
    const dt = Math.min(delta, 0.05);

    this.vehicles.forEach((v) => {
      // Race rivals try to hold lead
      if (v.rival && this.raceMode) {
        const target = 9 + Math.min(8, pSpeed * 0.35) + (Math.random() - 0.5);
        v.speed += (target - v.speed) * 0.02;
      }
      v.mesh.position.z += v.speed * dt;
      const pz = this.player.group.position.z;
      const px = this.player.group.position.x;
      if (pSpeed < 1.5 && Math.abs(v.mesh.position.z - pz) < 16 && Math.abs(v.mesh.position.x - px) < 3.2) {
        v.laneX = px + Math.sign(v.mesh.position.x - px || 1) * 2.4;
      }
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 40) {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + 1.5, 0.12);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.05);
      }
      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 140;

      if (v.mesh.position.z < playerZ - 55 || v.mesh.position.z > playerZ + 240) {
        try {
          this.scene.remove(v.mesh);
        } catch (e) {}
        const next = this._meshFor(this.raceMode);
        v.mesh = next.mesh;
        v.kind = next.kind;
        v.opposite = this.raceMode ? false : Math.random() < 0.05;
        const px2 = this.player.group.position.x;
        v.laneX = v.opposite
          ? px2 >= 0
            ? -3 - Math.random() * 2
            : 3 + Math.random() * 2
          : px2 >= 0
            ? 3 + Math.random() * 2.5
            : -3 - Math.random() * 2.5;
        v.speed = v.opposite ? -(8 + Math.random() * 5) : 7 + Math.random() * 7;
        v.mesh.position.set(v.laneX, 0, playerZ + 100 + Math.random() * 40);
        v.mesh.rotation.y = v.opposite ? Math.PI : 0;
        this.scene.add(v.mesh);
      }
    });

    // Race ranking banner occasionally
    if (this.raceMode && Math.random() < 0.01) {
      const ahead = this.vehicles.filter((v) => v.rival && v.mesh.position.z > playerZ).length;
      window.__kanoRacePlace = ahead + 1;
    }
  }

  getRacePlace() {
    if (!this.raceMode) return null;
    const playerZ = this.player.group.position.z;
    const ahead = this.vehicles.filter((v) => v.rival && v.mesh.position.z > playerZ).length;
    return ahead + 1;
  }
}
