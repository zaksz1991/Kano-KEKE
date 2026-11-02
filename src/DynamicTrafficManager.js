import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/**
 * Traffic from YOUR public/assets/models GLBs only – no box placeholders
 */
export class DynamicTrafficManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.vehicles = [];
    this.maxVehicles = 8;
    this.templates = [];
    this.ready = false;
  }

  async init() {
    const seen = new Set();
    const loads = (ASSET_MANIFEST.traffic || []).map(async (c) => {
      // Dedup encoded/unencoded variants
      const key = decodeURIComponent(c.path).toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);

      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: c.scale || 1 });
        if (!mesh) {
          // try alternate encoding
          const alt = c.path.includes('%20')
            ? decodeURIComponent(c.path)
            : c.path.replace(/ /g, '%20');
          if (alt !== c.path) {
            const mesh2 = await this.assets.loadGLB(alt, { scale: c.scale || 1 });
            if (mesh2) {
              this._prep(mesh2);
              console.log('[Traffic] loaded', alt, c.kind);
              return { mesh: mesh2, kind: c.kind || 'car', path: alt };
            }
          }
          console.warn('[Traffic] missing', c.path);
          return null;
        }
        this._prep(mesh);
        console.log('[Traffic] loaded', c.path, c.kind);
        return { mesh, kind: c.kind || 'car', path: c.path };
      } catch (e) {
        console.warn('[Traffic] fail', c.path, e?.message || e);
        return null;
      }
    });

    this.templates = (await Promise.all(loads)).filter(Boolean);
    console.log(
      '[Traffic] templates ready:',
      this.templates.map((t) => `${t.kind}:${t.path}`).join(' | ') || 'NONE'
    );
    if (!this.templates.length) {
      console.error('[Traffic] No GLBs – check public/assets/models/');
      this.ready = true;
      return;
    }
    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;
  }

  _prep(mesh) {
    mesh.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = false;
      n.receiveShadow = false;
      if (!n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m) return;
        // Preserve textures – fix colour space only
        if (m.map) {
          try {
            m.map.colorSpace = THREE.SRGBColorSpace;
          } catch (e) {}
          m.needsUpdate = true;
        }
        // Only fix untextured pure-green placeholder materials
        if (!m.map && m.color) {
          const { r, g, b } = m.color;
          if (g > 0.55 && g > r * 1.5 && g > b * 1.5) {
            m.color.setHex(0xb0bec5);
            m.needsUpdate = true;
          }
        }
      });
    });
  }

  _meshFor() {
    if (!this.templates.length) return null;
    const okadas = this.templates.filter((x) => x.kind === 'okada');
    const cars = this.templates.filter((x) => x.kind !== 'okada');
    let pick;
    if (okadas.length && Math.random() < 0.42) {
      pick = okadas[Math.floor(Math.random() * okadas.length)];
    } else if (cars.length) {
      pick = cars[Math.floor(Math.random() * cars.length)];
    } else {
      pick = this.templates[Math.floor(Math.random() * this.templates.length)];
    }
    return { mesh: pick.mesh.clone(true), kind: pick.kind };
  }

  _spawn(initial) {
    const picked = this._meshFor();
    if (!picked) return;
    const { mesh, kind } = picked;
    const opposite = (window.__kanoRoadMode === 'single') ? false : (Math.random() < 0.06);
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
    const z = initial ? playerZ + 55 + Math.random() * 150 : playerZ + 140 + Math.random() * 90;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base = kind === 'okada' ? 10 : kind === 'van' ? 7 : 8;
    this.vehicles.push({
      mesh,
      kind,
      speed: opposite ? -(base + Math.random() * 6) : base + Math.random() * 8,
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
      v.mesh.visible = dist < 160;
      if (v.mesh.position.z < playerZ - 50 || v.mesh.position.z > playerZ + 280) {
        const opposite = (window.__kanoRoadMode === 'single') ? false : (Math.random() < 0.05);
        v.opposite = opposite;
        const px2 = this.player.group.position.x;
        v.laneX = opposite
          ? px2 >= 0
            ? -3 - Math.random() * 2
            : 3 + Math.random() * 2
          : px2 >= 0
            ? 3 + Math.random() * 2.5
            : -3 - Math.random() * 2.5;
        v.speed = opposite ? -(8 + Math.random() * 6) : 7 + Math.random() * 8;
        // Respawn with a random template mesh when possible
        const next = this._meshFor();
        if (next) {
          try {
            this.scene.remove(v.mesh);
          } catch (e) {}
          v.mesh = next.mesh;
          v.kind = next.kind;
          this.scene.add(v.mesh);
        }
        v.mesh.position.set(v.laneX, 0, playerZ + 150 + Math.random() * 80);
        v.mesh.rotation.y = opposite ? Math.PI : 0;
        v.mesh.visible = true;
      }
    });
  }
}
