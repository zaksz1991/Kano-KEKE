import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Local GLB loader with folder fallbacks (vehicles/, characters/, world/).
 */
export class AssetManager {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map();
    this.loading = new Map();
    this.allowNetwork = true;
  }

  enableNetwork() {
    this.allowNetwork = true;
  }

  /** Build alternate paths for GitHub folder layout */
  _candidates(path) {
    const list = [path];
    try {
      const file = path.split('/').pop();
      if (!file) return list;
      // Try subfolders user created
      list.push('/assets/models/vehicles/' + file);
      list.push('/assets/models/characters/' + file);
      list.push('/assets/models/world/' + file);
      list.push('/assets/models/environment/' + file);
      // Space / underscore variants
      if (file.includes('%20')) {
        const raw = decodeURIComponent(file);
        list.push('/assets/models/' + raw);
        list.push('/assets/models/vehicles/' + raw);
      }
      if (file.includes(' ')) {
        list.push('/assets/models/' + encodeURIComponent(file).replace(/%20/g, '%20'));
      }
      // Common renames
      const map = {
        'Police Car.glb': 'police_car.glb',
        'Car-2.glb': 'car_2.glb',
        'Sports Car.glb': 'sports_car.glb',
        'Sports Car-1.glb': 'sports_car2.glb',
        'traffic_vehicle.glb': 'traffic_vehicle%20(2).glb'
      };
      if (map[file]) {
        list.push('/assets/models/' + map[file]);
        list.push('/assets/models/vehicles/' + map[file]);
      }
    } catch (e) {}
    return [...new Set(list)];
  }

  async loadGLB(path, options = {}) {
    const candidates = this._candidates(path);
    for (const p of candidates) {
      const mesh = await this._loadOne(p, options);
      if (mesh) return mesh;
    }
    return null;
  }

  async _loadOne(path, options = {}) {
    const key = path;
    if (this.cache.has(key)) {
      try {
        const clone = this.cache.get(key).clone(true);
        this._applyOptions(clone, options);
        return clone;
      } catch (e) {
        return null;
      }
    }
    if (this.loading.has(key)) {
      await this.loading.get(key);
      if (this.cache.has(key)) {
        const clone = this.cache.get(key).clone(true);
        this._applyOptions(clone, options);
        return clone;
      }
      return null;
    }

    const job = new Promise((resolve) => {
      const ms = Math.min(options.timeoutMs || 12000, 14000);
      const timer = setTimeout(() => {
        resolve(null);
      }, ms);

      this.gltfLoader.load(
        path,
        (gltf) => {
          clearTimeout(timer);
          try {
            const root = gltf.scene || gltf.scenes?.[0];
            if (!root) {
              resolve(null);
              return;
            }
            this._fixTextures(root);
            this.cache.set(key, root);
            resolve(root);
          } catch (e) {
            resolve(null);
          }
        },
        undefined,
        () => {
          clearTimeout(timer);
          resolve(null);
        }
      );
    });

    this.loading.set(key, job);
    const root = await job;
    this.loading.delete(key);
    if (!root) return null;
    const clone = root.clone(true);
    this._applyOptions(clone, options);
    return clone;
  }

  _fixTextures(root) {
    root.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m) return;
        ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap'].forEach((k) => {
          if (m[k]) {
            try {
              m[k].colorSpace =
                k === 'map' || k === 'emissiveMap' ? THREE.SRGBColorSpace : m[k].colorSpace;
              m[k].needsUpdate = true;
            } catch (e) {}
          }
        });
        m.needsUpdate = true;
      });
    });
  }

  _applyOptions(root, options = {}) {
    if (!root) return;
    const scale = options.scale ?? 1;
    if (scale !== 1) root.scale.setScalar(scale);
    root.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = !!options.castShadow;
      n.receiveShadow = options.receiveShadow !== false;
    });
  }
}
