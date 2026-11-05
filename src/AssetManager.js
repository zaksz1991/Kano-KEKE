import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Always loads local GLBs (with timeout). Does not block UI.
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

  async loadGLB(path, options = {}) {
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
      const ms = options.timeoutMs || 15000;
      const timer = setTimeout(() => {
        console.warn('[GLB] timeout', path);
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
            console.warn('[GLB] parse', path, e);
            resolve(null);
          }
        },
        undefined,
        (err) => {
          clearTimeout(timer);
          console.warn('[GLB] error', path, err?.message || err);
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
              m[k].colorSpace = k === 'map' || k === 'emissiveMap' ? THREE.SRGBColorSpace : m[k].colorSpace;
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
