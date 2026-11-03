import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Loads local .glb files – network allowed AFTER boot (call enableNetwork())
 */
export class AssetManager {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map();
    this.textures = new Map();
    this.totalToLoad = 0;
    this.loadedCount = 0;
    this.onProgress = null;
    this.allowNetwork = false; // false until after Start Shift
  }

  enableNetwork() {
    this.allowNetwork = true;
  }

  setProgressCallback(cb) {
    this.onProgress = cb;
  }

  _report(path) {
    this.loadedCount++;
    if (this.onProgress) {
      this.onProgress({
        loaded: this.loadedCount,
        total: Math.max(1, this.totalToLoad),
        path,
        percent: Math.round((this.loadedCount / Math.max(1, this.totalToLoad)) * 100)
      });
    }
  }

  async loadGLB(path, options = {}) {
    if (this.cache.has(path)) {
      try {
        const clone = this.cache.get(path).clone(true);
        this._prepareScene(clone, options);
        return clone;
      } catch (e) {
        return null;
      }
    }
    if (!this.allowNetwork) return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[AssetManager] timeout', path);
        this._report(path);
        resolve(null);
      }, options.timeoutMs || 8000);

      this.gltfLoader.load(
        path,
        (gltf) => {
          clearTimeout(timeout);
          try {
            const scene = gltf.scene;
            this._prepareScene(scene, options);
            this.cache.set(path, scene);
            this._report(path);
            resolve(scene.clone(true));
          } catch (e) {
            this._report(path);
            resolve(null);
          }
        },
        undefined,
        (err) => {
          clearTimeout(timeout);
          console.warn('[AssetManager] fail', path, err?.message || err);
          this._report(path);
          resolve(null);
        }
      );
    });
  }

  _prepareScene(root, options = {}) {
    if (!root) return;
    const scale = options.scale ?? 1;
    if (scale !== 1) root.scale.multiplyScalar(scale);
    root.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = !!options.castShadow;
      n.receiveShadow = !!options.receiveShadow;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m) return;
        if (m.map) {
          try {
            m.map.colorSpace = THREE.SRGBColorSpace;
          } catch (e) {}
        }
        m.needsUpdate = true;
      });
    });
  }

  async loadTexture() {
    return null;
  }
}
