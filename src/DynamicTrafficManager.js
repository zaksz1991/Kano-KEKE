import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/**
 * Traffic from AssetManifest only – no box placeholders
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
    // Kano street palette from photos – yellow keke, silver, white, dark
    this.tints = [
      0xffc107, 0xffb300, 0xf9a825, 0xff9800, 0xf57f17,
      0x1565c0, 0xc62828, 0x37474f, 0x6d4c41, 0x00897b
    ];
  }

  async init() {
    const loads = (ASSET_MANIFEST.traffic || []).map(async (c) => {
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: c.scale || 1 });
        if (mesh) {
          // Flatten expensive material features for FPS
          mesh.traverse((n) => {
            if (!n.isMesh || !n.material) return;
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => {
              if (!m) return;
              m.flatShading = true;
              if (m.envMap) m.envMap = null;
              m.metalness = Math.min(m.metalness || 0, 0.35);
              m.needsUpdate = true;
            });
            n.castShadow = false;
            n.receiveShadow = false;
          });
          return { mesh, kind: c.kind || 'car' };
        }
      } catch (e) {}
      return null;
    });
    this.templates = (await Promise.all(loads)).filter(Boolean);
    if (!this.templates.length) {
      console.warn('[Traffic] No GLBs from manifest');
      this.ready = true;
      return;
    }
    console.log('[Traffic] templates:', this.templates.map((t) => t.kind).join(', '));
    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;
  }

  _tint(mesh, kind = 'car') {
    // Okadas/kekes → yellow; cars → mixed street colours (never pure white)
    const hex = (kind === 'okada')
      ? [0xffc107, 0xffb300, 0xfbc02d, 0xff9800][Math.floor(Math.random() * 4)]
      : this.tints[Math.floor(Math.random() * this.tints.length)];
    mesh.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      const next = mats.map((m) => {
        if (!m?.color) return m;
        const c = m.clone();
        c.color.setHex(hex);
        // Avoid washed-out white
        if (c.color.r > 0.9 && c.color.g > 0.9 && c.color.b > 0.9) {
          c.color.setHex(0xffc107);
        }
        c.needsUpdate = true;
        return c;
      });
      n.material = next.length === 1 ? next[0] : next;
    });
  }

  _meshFor() {
    if (!this.templates.length) return null;
    // Kano roads are okada-heavy (photo ref)
    const okadas = this.templates.filter((x) => x.kind === 'okada');
    const cars = this.templates.filter((x) => x.kind !== 'okada');
    let pick;
    if (okadas.length && Math.random() < 0.55) {
      pick = okadas[Math.floor(Math.random() * okadas.length)];
    } else if (cars.length) {
      pick = cars[Math.floor(Math.random() * cars.length)];
    } else {
      pick = this.templates[Math.floor(Math.random() * this.templates.length)];
    }
    const mesh = pick.mesh.clone(true);
    if (pick.kind === 'okada') mesh.scale.multiplyScalar(1.05);
    else if (pick.kind === 'bus') mesh.scale.multiplyScalar(0.95);
    else mesh.scale.multiplyScalar(1.0);
    this._tint(mesh, pick.kind);
    return { mesh, kind: pick.kind };
  }

  _spawn(initial) {
    const picked = this._meshFor();
    if (!picked) return;
    const { mesh, kind } = picked;
    const opposite = Math.random() < 0.06; // mostly same direction
    const lane = opposite
      ? (Math.random() > 0.5 ? -5.5 : -3.0)
      : (Math.random() > 0.5 ? 3.0 : 5.5);
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 55 + Math.random() * 150 : playerZ + 140 + Math.random() * 90;
    // Keep clear of player lane at spawn
    const px = this.player?.group?.position.x || 0;
    if (Math.abs(lane - px) < 2.0) {
      lane = px >= 0 ? px + 2.8 : px - 2.8;
    }
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base = kind === 'okada' ? 10 : kind === 'bus' ? 6 : 8;
    this.vehicles.push({
      mesh,
      kind,
      speed: opposite ? -(base + Math.random() * 7) : base + Math.random() * 9,
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
      // Avoid stopped player – change lane early
      const pz = this.player.group.position.z;
      const px = this.player.group.position.x;
      const pSpeed = this.player.currentSpeed || 0;
      if (pSpeed < 1.5 && Math.abs(v.mesh.position.z - pz) < 18 && Math.abs(v.mesh.position.x - px) < 3.5) {
        const away = Math.sign(v.mesh.position.x - px || 1) * 2.5;
        v.laneX = px + away;
      }
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 42) {
        // Horn: okadas swerve hard, cars drift out
        const push = (v.kind === 'okada' ? 2.2 : 1.4) * (v.opposite ? -1 : 1);
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + push, 0.14);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.04);
      }
      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 160;
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 280) {
        const opposite = Math.random() < 0.05;
        v.opposite = opposite;
        const px = this.player.group.position.x;
        if (opposite) {
          v.laneX = px >= 0 ? (Math.random() > 0.5 ? -5.2 : -2.8) : (Math.random() > 0.5 ? 2.8 : 5.2);
        } else {
          // Prefer player's carriageway for interaction
          v.laneX = px >= 0
            ? (Math.random() > 0.35 ? 2.8 + Math.random() * 2.5 : -3.5)
            : (Math.random() > 0.35 ? -2.8 - Math.random() * 2.5 : 3.5);
        }
        v.speed = opposite ? -(8 + Math.random() * 7) : (7 + Math.random() * 9);
        v.mesh.position.set(v.laneX, 0, playerZ + 150 + Math.random() * 80);
        v.mesh.rotation.y = opposite ? Math.PI : 0;
        v.mesh.visible = true;
      }
    });
  }
}
