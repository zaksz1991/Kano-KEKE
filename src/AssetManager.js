import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Professional Asset Manager
 * - Draco compression support
 * - Caching + deep cloning
 * - Progress reporting
 * - Shadow + PBR readiness
 */
export class AssetManager {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(draco);

    this.textureLoader = new THREE.TextureLoader();
    this.cache = new Map();          // path -> original scene
    this.textures = new Map();
    this.totalToLoad = 0;
    this.loadedCount = 0;
    this.onProgress = null;
  }

  setProgressCallback(cb) {
    this.onProgress = cb;
  }

  _reportProgress(path) {
    this.loadedCount++;
    if (this.onProgress) {
      this.onProgress({
        loaded: this.loadedCount,
        total: this.totalToLoad,
        path,
        percent: Math.round((this.loadedCount / Math.max(1, this.totalToLoad)) * 100)
      });
    }
  }

  async loadGLB(path, options = {}) {
    if (this.cache.has(path)) {
      const original = this.cache.get(path);
      const clone = original.clone(true);
      this._prepareScene(clone, options);
      return clone;
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          const scene = gltf.scene;
          this._prepareScene(scene, options);
          this.cache.set(path, scene);
          this._reportProgress(path);
          resolve(scene.clone(true));
        },
        undefined,
        (err) => {
          console.error(`[AssetManager] Failed to load ${path}`, err);
          this._reportProgress(path);
          reject(err);
        }
      );
    });
  }

  _prepareScene(scene, options = {}) {
    const scale = options.scale ?? 1;
    const castShadow = options.castShadow !== false;
    const receiveShadow = options.receiveShadow !== false;

    scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = castShadow;
        node.receiveShadow = receiveShadow;
        if (node.material) {
          // Ensure materials respond well to env maps and lights
          if (Array.isArray(node.material)) {
            node.material.forEach(m => {
              m.envMapIntensity = m.envMapIntensity ?? 1.4;
              m.needsUpdate = true;
            });
          } else {
            node.material.envMapIntensity = node.material.envMapIntensity ?? 1.4;
            node.material.needsUpdate = true;
          }
        }
      }
    });

    if (scale !== 1) {
      scene.scale.setScalar(scale);
    }
  }

  async loadTexture(path, options = {}) {
    if (this.textures.has(path)) {
      return this.textures.get(path);
    }
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          if (options.wrapS) tex.wrapS = options.wrapS;
          if (options.wrapT) tex.wrapT = options.wrapT;
          if (options.repeat) tex.repeat.set(options.repeat.x, options.repeat.y);
          if (options.anisotropy) tex.anisotropy = options.anisotropy;
          this.textures.set(path, tex);
          this._reportProgress(path);
          resolve(tex);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Preload a list of critical assets.
   * Returns a map of path -> loaded object (scene or texture)
   */
  async preload(paths) {
    this.totalToLoad = paths.length;
    this.loadedCount = 0;
    const results = {};
    await Promise.all(
      paths.map(async (entry) => {
        const path = typeof entry === 'string' ? entry : entry.path;
        const type = typeof entry === 'string' ? 'glb' : entry.type || 'glb';
        try {
          if (type === 'texture') {
            results[path] = await this.loadTexture(path, entry.options || {});
          } else {
            results[path] = await this.loadGLB(path, entry.options || {});
          }
        } catch (e) {
          console.warn(`Optional asset failed: ${path}`);
          results[path] = null;
        }
      })
    );
    return results;
  }

  /** Instant clone from cache (must be preloaded) */
  getClone(path) {
    if (!this.cache.has(path)) return null;
    return this.cache.get(path).clone(true);
  }
}
