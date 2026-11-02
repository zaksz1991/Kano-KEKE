import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/**
 * Traffic – INSTANT procedural cars, GLBs load later in background
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 6;
    this.templates = [];
    this.ready = false;
  }

  /** Cheap box/car proxy – zero network */
  _makeProxy(kind = 'car') {
    const g = new THREE.Group();
    if (kind === 'okada') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.7, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xfdd835 })
      );
      body.position.y = 0.55;
      g.add(body);
    } else {
      const colors = [0x1565c0, 0xc62828, 0x2e7d32, 0x37474f, 0xff8f00, 0x6a1b9a];
      const col = colors[Math.floor(Math.random() * colors.length)];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.7, 3.4),
        new THREE.MeshBasicMaterial({ color: col })
      );
      body.position.y = 0.55;
      g.add(body);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.55, 1.4),
        new THREE.MeshBasicMaterial({ color: 0x263238 })
      );
      cabin.position.set(0, 1.05, -0.2);
      g.add(cabin);
    }
    return g;
  }

  async init() {
    // Instant: fill road with proxies (no download)
    this.ready = true;
    for (let i = 0; i < Math.min(4, this.maxVehicles); i++) this._spawn(true);
    console.log('[Traffic] instant proxies');

    // Background GLB – single light file only, delayed
    setTimeout(() => this._loadGlbs(), 2500);
  }

  async _loadGlbs() {
    if (!this.assets) return;
    const light = [
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.05 }
    ];
    for (const c of light) {
      try {
        const mesh = await Promise.race([
          this.assets.loadGLB(c.path, { scale: c.scale }),
          new Promise((r) => setTimeout(() => r(null), 4000))
        ]);
        if (!mesh) continue;
        mesh.traverse((n) => {
          if (n.isMesh) {
            n.castShadow = false;
            n.receiveShadow = false;
          }
        });
        this.templates.push({ mesh, kind: c.kind });
      } catch (e) {}
    }
    // Optional extras much later (never block)
    setTimeout(() => this._loadExtras(), 8000);
  }

  async _loadExtras() {
    const extra = (ASSET_MANIFEST.traffic || []).slice(0, 4);
    for (const c of extra) {
      try {
        const mesh = await Promise.race([
          this.assets.loadGLB(c.path, { scale: c.scale || 1 }),
          new Promise((r) => setTimeout(() => r(null), 3000))
        ]);
        if (mesh) this.templates.push({ mesh, kind: c.kind || 'car' });
      } catch (e) {}
    }
  }

  _meshFor() {
    if (this.templates.length && Math.random() > 0.35) {
      const pick = this.templates[Math.floor(Math.random() * this.templates.length)];
      return { mesh: pick.mesh.clone(true), kind: pick.kind };
    }
    const kind = Math.random() < 0.35 ? 'okada' : 'car';
    return { mesh: this._makeProxy(kind), kind };
  }

  _spawn(initial) {
    const picked = this._meshFor();
    if (!picked) return;
    const { mesh, kind } = picked;
    const opposite = window.__kanoRoadMode === 'single' ? false : Math.random() < 0.05;
    let lane = opposite
      ? (Math.random() > 0.5 ? -5.5 : -3.0)
      : (Math.random() > 0.5 ? 3.0 : 5.5);
    const playerZ = this.player?.group?.position.z || 0;
    const px = this.player?.group?.position.x || 0;
    if (Math.abs(lane - px) < 2.0) lane = px >= 0 ? px + 2.8 : px - 2.8;
    const z = initial ? playerZ + 40 + Math.random() * 90 : playerZ + 100 + Math.random() * 60;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base = kind === 'okada' ? 10 : 8;
    this.vehicles.push({
      mesh,
      kind,
      speed: opposite ? -(base + Math.random() * 5) : base + Math.random() * 7,
      laneX: lane,
      opposite
    });
  }

  update(delta, horn) {
    if (!this.ready || !this.vehicles.length) return;
    const playerZ = this.player.group.position.z;
    const dt = Math.min(delta, 0.05);
    this.vehicles.forEach((v) => {
      v.mesh.position.z += v.speed * dt;
      const pz = this.player.group.position.z;
      const px = this.player.group.position.x;
      const pSpeed = this.player.currentSpeed || 0;
      if (pSpeed < 1.5 && Math.abs(v.mesh.position.z - pz) < 18 && Math.abs(v.mesh.position.x - px) < 3.5) {
        v.laneX = px + Math.sign(v.mesh.position.x - px || 1) * 2.5;
      }
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 42) {
        const push = (v.kind === 'okada' ? 2.2 : 1.4) * (v.opposite ? -1 : 1);
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + push, 0.14);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.04);
      }
      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 140;
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 260) {
        try {
          this.scene.remove(v.mesh);
        } catch (e) {}
        const next = this._meshFor();
        v.mesh = next.mesh;
        v.kind = next.kind;
        v.opposite = window.__kanoRoadMode === 'single' ? false : Math.random() < 0.05;
        const px2 = this.player.group.position.x;
        v.laneX = v.opposite
          ? (px2 >= 0 ? -3 - Math.random() * 2 : 3 + Math.random() * 2)
          : (px2 >= 0 ? 3 + Math.random() * 2.5 : -3 - Math.random() * 2.5);
        v.speed = v.opposite ? -(8 + Math.random() * 5) : 7 + Math.random() * 7;
        v.mesh.position.set(v.laneX, 0, playerZ + 110 + Math.random() * 50);
        v.mesh.rotation.y = v.opposite ? Math.PI : 0;
        this.scene.add(v.mesh);
      }
    });
  }
}
