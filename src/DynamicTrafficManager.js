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
    this.maxVehicles = 4;
    this.templates = [];
    this.ready = false;
    this.tints = [
      0xe53935, 0x1e88e5, 0x43a047, 0xffb300, 0x6d4c41,
      0x8e24aa, 0x00897b, 0xf4511e, 0x3949ab, 0xc0ca33
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

  _tint(mesh) {
    const hex = this.tints[Math.floor(Math.random() * this.tints.length)];
    mesh.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m?.color) return;
        const lum = (m.color.r + m.color.g + m.color.b) / 3;
        if (lum > 0.55 && (m.metalness || 0) < 0.75) {
          m.color.setHex(hex);
          m.needsUpdate = true;
        }
      });
    });
  }

  _meshFor() {
    if (!this.templates.length) return null;
    // Kano roads are okada-heavy (photo ref)
    const okadas = this.templates.filter((x) => x.kind === 'okada');
    const cars = this.templates.filter((x) => x.kind !== 'okada');
    let pick;
    if (okadas.length && Math.random() < 0.62) {
      pick = okadas[Math.floor(Math.random() * okadas.length)];
    } else if (cars.length) {
      pick = cars[Math.floor(Math.random() * cars.length)];
    } else {
      pick = this.templates[Math.floor(Math.random() * this.templates.length)];
    }
    const mesh = pick.mesh.clone(true);
    if (pick.kind === 'car' || pick.kind === 'van' || pick.kind === 'bus') this._tint(mesh);
    return { mesh, kind: pick.kind };
  }

  _spawn(initial) {
    const picked = this._meshFor();
    if (!picked) return;
    const { mesh, kind } = picked;
    const opposite = Math.random() < 0.15;
    const lane = opposite
      ? (Math.random() > 0.5 ? -5.2 : -2.8)
      : (Math.random() > 0.5 ? 2.8 : 5.2);
    const playerZ = this.player?.group?.position.z || 0;
    const z = initial ? playerZ + 30 + Math.random() * 160 : playerZ + 130 + Math.random() * 80;
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
      if (horn && Math.abs(v.mesh.position.z - playerZ) < 35) {
        // Horn: okadas swerve hard, cars drift out
        const push = (v.kind === 'okada' ? 2.2 : 1.4) * (v.opposite ? -1 : 1);
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX + push, 0.14);
      } else {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX, 0.04);
      }
      const dist = Math.abs(v.mesh.position.z - playerZ);
      v.mesh.visible = dist < 160;
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 280) {
        const opposite = Math.random() < 0.12;
        v.opposite = opposite;
        v.laneX = opposite ? (Math.random() > 0.5 ? -5.2 : -2.8) : (Math.random() > 0.5 ? 2.8 : 5.2);
        v.speed = opposite ? -(8 + Math.random() * 7) : (7 + Math.random() * 9);
        v.mesh.position.set(v.laneX, 0, playerZ + 140 + Math.random() * 70);
        v.mesh.rotation.y = opposite ? Math.PI : 0;
        v.mesh.visible = true;
      }
    });
  }
}
