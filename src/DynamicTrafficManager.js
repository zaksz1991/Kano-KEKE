import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/**
 * Traffic – fast start: core GLBs first, extras in background
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
    // Priority only – keeps start screen fast
    const priority = [
      { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.1 },
      { path: '/assets/models/okada.glb', kind: 'okada', scale: 1.0 }
    ];
    const extra = (ASSET_MANIFEST.traffic || []).filter(
      (c) => !priority.some((p) => decodeURIComponent(p.path) === decodeURIComponent(c.path))
    );

    const loadOne = async (c) => {
      try {
        let mesh = await this.assets.loadGLB(c.path, { scale: c.scale || 1 });
        if (!mesh && c.path.includes(' ')) {
          mesh = await this.assets.loadGLB(c.path.replace(/ /g, '%20'), { scale: c.scale || 1 });
        }
        if (!mesh) return null;
        mesh.traverse((n) => {
          if (!n.isMesh) return;
          n.castShadow = false;
          n.receiveShadow = false;
          if (n.material?.map) {
            try { n.material.map.colorSpace = THREE.SRGBColorSpace; } catch (e) {}
          }
        });
        return { mesh, kind: c.kind || 'car', path: c.path };
      } catch (e) {
        return null;
      }
    };

    const first = (await Promise.all(priority.map(loadOne))).filter(Boolean);
    this.templates = first;
    if (this.templates.length) {
      const n = Math.min(4, this.maxVehicles);
      for (let i = 0; i < n; i++) this._spawn(true);
    }
    this.ready = true;
    console.log('[Traffic] core ready', this.templates.length);

    // Background extras – do not block play
    Promise.all(extra.map(loadOne)).then((list) => {
      const more = list.filter(Boolean);
      if (!more.length) return;
      this.templates.push(...more);
      while (this.vehicles.length < this.maxVehicles) this._spawn(false);
      console.log('[Traffic] extras ready', more.length);
    });
  }

  _meshFor() {
    if (!this.templates.length) return null;
    const okadas = this.templates.filter((x) => x.kind === 'okada');
    const cars = this.templates.filter((x) => x.kind !== 'okada');
    let pick;
    if (okadas.length && Math.random() < 0.4) {
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
    const opposite = window.__kanoRoadMode === 'single' ? false : Math.random() < 0.06;
    let lane = opposite
      ? (Math.random() > 0.5 ? -5.5 : -3.0)
      : (Math.random() > 0.5 ? 3.0 : 5.5);
    const playerZ = this.player?.group?.position.z || 0;
    const px = this.player?.group?.position.x || 0;
    if (Math.abs(lane - px) < 2.0) lane = px >= 0 ? px + 2.8 : px - 2.8;
    const z = initial ? playerZ + 35 + Math.random() * 100 : playerZ + 90 + Math.random() * 70;
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
        const opposite = window.__kanoRoadMode === 'single' ? false : Math.random() < 0.05;
        v.opposite = opposite;
        const px2 = this.player.group.position.x;
        v.laneX = opposite
          ? (px2 >= 0 ? -3 - Math.random() * 2 : 3 + Math.random() * 2)
          : (px2 >= 0 ? 3 + Math.random() * 2.5 : -3 - Math.random() * 2.5);
        v.speed = opposite ? -(8 + Math.random() * 6) : 7 + Math.random() * 8;
        const next = this._meshFor();
        if (next) {
          try { this.scene.remove(v.mesh); } catch (e) {}
          v.mesh = next.mesh;
          v.kind = next.kind;
          this.scene.add(v.mesh);
        }
        v.mesh.position.set(v.laneX, 0, playerZ + 120 + Math.random() * 60);
        v.mesh.rotation.y = opposite ? Math.PI : 0;
        v.mesh.visible = true;
      }
    });
  }
}
