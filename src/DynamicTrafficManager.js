import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/**
 * Traffic – YOUR GLBs only (traffic_vehicle.glb, okada.glb). Zero box placeholders.
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

  async init() {
    const loads = (ASSET_MANIFEST.traffic || []).map(async (c) => {
      try {
        const mesh = await this.assets.loadGLB(c.path, { scale: c.scale || 1 });
        if (!mesh) {
          console.warn('[Traffic] missing', c.path);
          return null;
        }
        // Keep original materials/textures – only disable shadows for FPS
        mesh.traverse((n) => {
          if (!n.isMesh) return;
          n.castShadow = false;
          n.receiveShadow = false;
          if (n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => {
              if (!m) return;
              // Fix common "all green" unlit / wrong color-space issues without painting over textures
              if (m.map) {
                m.map.colorSpace = THREE.SRGBColorSpace;
                m.needsUpdate = true;
              }
              if (m.emissiveMap) {
                m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
              }
              // If no texture and colour is pure green placeholder, recolour to neutral street
              if (!m.map && m.color) {
                const { r, g, b } = m.color;
                if (g > 0.5 && g > r * 1.4 && g > b * 1.4) {
                  m.color.setHex(c.kind === 'okada' ? 0xffc107 : 0xb0bec5);
                  m.needsUpdate = true;
                }
              }
            });
          }
        });
        console.log('[Traffic] loaded', c.path, c.kind);
        return { mesh, kind: c.kind || 'car', path: c.path };
      } catch (e) {
        console.warn('[Traffic] fail', c.path, e);
        return null;
      }
    });

    this.templates = (await Promise.all(loads)).filter(Boolean);
    if (!this.templates.length) {
      console.error('[Traffic] NO GLBs loaded – put traffic_vehicle.glb and okada.glb in public/assets/models/');
      this.ready = true;
      return;
    }
    for (let i = 0; i < this.maxVehicles; i++) this._spawn(true);
    this.ready = true;
  }

  _meshFor() {
    if (!this.templates.length) return null;
    const okadas = this.templates.filter((x) => x.kind === 'okada');
    const cars = this.templates.filter((x) => x.kind !== 'okada');
    let pick;
    if (okadas.length && Math.random() < 0.5) {
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
    const opposite = Math.random() < 0.06;
    let lane = opposite
      ? (Math.random() > 0.5 ? -5.5 : -3.0)
      : (Math.random() > 0.5 ? 3.0 : 5.5);
    const playerZ = this.player?.group?.position.z || 0;
    const px = this.player?.group?.position.x || 0;
    if (Math.abs(lane - px) < 2.0) {
      lane = px >= 0 ? px + 2.8 : px - 2.8;
    }
    const z = initial ? playerZ + 55 + Math.random() * 150 : playerZ + 140 + Math.random() * 90;
    mesh.position.set(lane, 0, z);
    mesh.rotation.y = opposite ? Math.PI : 0;
    this.scene.add(mesh);
    const base = kind === 'okada' ? 10 : 8;
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
        const opposite = Math.random() < 0.05;
        v.opposite = opposite;
        const px2 = this.player.group.position.x;
        if (opposite) {
          v.laneX = px2 >= 0 ? -3.0 - Math.random() * 2 : 3.0 + Math.random() * 2;
        } else {
          v.laneX = px2 >= 0 ? 3.0 + Math.random() * 2.5 : -3.0 - Math.random() * 2.5;
        }
        v.speed = opposite ? -(8 + Math.random() * 6) : 7 + Math.random() * 8;
        v.mesh.position.set(v.laneX, 0, playerZ + 150 + Math.random() * 80);
        v.mesh.rotation.y = opposite ? Math.PI : 0;
        v.mesh.visible = true;
      }
    });
  }
}
