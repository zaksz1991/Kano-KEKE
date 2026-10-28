import * as THREE from 'three';

/**
 * Traffic – loads ALL available vehicle GLBs, same-direction bias, color variety
 *
 * Supported paths (add any of these on the server):
 *   /assets/models/traffic_vehicle.glb
 *   /assets/models/okada.glb
 *   /assets/models/traffic/car_01.glb … car_05.glb
 *   /assets/models/traffic/bus.glb
 *   /assets/models/traffic/van.glb
 *   /assets/models/traffic/okada_02.glb
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 5;
    this.templates = []; // { mesh, kind }
    this.ready = false;

    // Paint variety when GLB is white/grey
    this.tints = [
      0xe53935, 0x1e88e5, 0x43a047, 0xffb300, 0x6d4c41,
      0x8e24aa, 0x00897b, 0xf4511e, 0x3949ab, 0xc0ca33
    ];
  }

  async init() {
    const candidates = [
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.1 },
      { path: '/assets/models/okada.glb', kind: 'okada', scale: 1.0 },
      { path: '/assets/models/traffic/car_01.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/traffic/car_02.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/traffic/car_03.glb', kind: 'car', scale: 1.05 },
      { path: '/assets/models/traffic/bus.glb', kind: 'bus', scale: 1.0 },
      { path: '/assets/models/traffic/van.glb', kind: 'van', scale: 1.0 },
      { path: '/assets/models/traffic/okada_02.glb', kind: 'okada', scale: 1.0 },
      { path: '/assets/models/traffic_bus.glb', kind: 'bus', scale: 1.0 },
      { path: '/assets/models/traffic_van.glb', kind: 'van', scale: 1.0 }
    ];

    const loads = candidates.map(async (c) => {
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: c.scale });
        if (mesh) return { mesh, kind: c.kind };
      } catch (e) {}
      return null;
    });

    const results = await Promise.all(loads);
    this.templates = results.filter(Boolean);

    if (!this.templates.length) {
      console.warn('No traffic GLBs found – traffic disabled');
      this.ready = true;
      return;
    }

    console.log('[Traffic] loaded templates:', this.templates.map((t) => t.kind).join(', '));

    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;
  }

  _tint(mesh) {
    const hex = this.tints[Math.floor(Math.random() * this.tints.length)];
    mesh.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m || !m.color) return;
        const lum = (m.color.r + m.color.g + m.color.b) / 3;
        // Only recolor pale / white / light-grey body panels
        if (lum > 0.55 && (m.metalness || 0) < 0.75) {
          m.color.setHex(hex);
          m.needsUpdate = true;
        }
      });
    });
  }

  _meshFor() {
    if (!this.templates.length) return null;
    const t = this.templates[Math.floor(Math.random() * this.templates.length)];
    const mesh = t.mesh.clone(true);
    if (t.kind === 'car' || t.kind === 'van' || t.kind === 'bus') {
      this._tint(mesh);
    }
    return { mesh, kind: t.kind };
  }

  _spawn(initial) {
    const picked = this._meshFor();
    if (!picked) return;
    const { mesh, kind } = picked;

    // Mostly same direction as player (Kano one-way feel on many stretches)
    // Only ~18% oncoming
    const opposite = Math.random() < 0.18;
    const lane = opposite
      ? (Math.random() > 0.5 ? -3.6 : -2.2)
      : (Math.random() > 0.5 ? 2.2 : 3.6);

    const playerZ = this.player?.group?.position.z || 0;
    const z = initial
      ? playerZ + 25 + Math.random() * 180
      : playerZ + 130 + Math.random() * 90;

    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);

    const base = kind === 'okada' ? 10 : kind === 'bus' ? 6 : 8;
    this.vehicles.push({
      mesh,
      kind,
      speed: opposite ? -(base + Math.random() * 8) : base + Math.random() * 10,
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

      if (horn && Math.abs(v.mesh.position.z - playerZ) < 28) {
        const push = v.opposite ? -1.4 : 1.4;
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + push, 0.08);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.04);
      }

      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 170;

      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 300) {
        // Respawn ahead, prefer same direction
        const opposite = Math.random() < 0.15;
        v.opposite = opposite;
        v.laneX = opposite
          ? (Math.random() > 0.5 ? -3.6 : -2.2)
          : (Math.random() > 0.5 ? 2.2 : 3.6);
        v.speed = opposite ? -(8 + Math.random() * 8) : (7 + Math.random() * 10);
        v.mesh.position.set(v.laneX, 0, playerZ + 140 + Math.random() * 80);
        v.mesh.rotation.y = opposite ? Math.PI : 0;
        v.mesh.visible = true;
      }
    });
  }
}
