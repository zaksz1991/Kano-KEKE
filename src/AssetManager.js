import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Loads YOUR .glb files – fixes textures so models are not pure white
 */
export class AssetManager {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    try {
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      this.gltfLoader.setDRACOLoader(draco);
    } catch (e) {
      console.warn('[AssetManager] Draco unavailable');
    }
    this.textureLoader = new THREE.TextureLoader();
    this.cache = new Map();
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

    return new Promise((resolve) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          try {
            const scene = gltf.scene;
            this._prepareScene(scene, options);
            this.cache.set(path, scene);
            this._reportProgress(path);
            resolve(scene.clone(true));
          } catch (e) {
            console.warn(`[AssetManager] Prepare failed for ${path}`, e);
            this._reportProgress(path);
            resolve(null);
          }
        },
        undefined,
        (err) => {
          console.warn(`[AssetManager] Missing or failed: ${path}`, err?.message || err);
          this._reportProgress(path);
          resolve(null);
        }
      );
    });
  }

  _fixMap(mat, key) {
    if (!mat) return null;
    if (mat[key]) return mat[key];
    return null;
  }

  _prepareScene(scene, options = {}) {
    if (!scene) return;
    const scale = options.scale ?? 1;
    const castShadow = options.castShadow === true; // default off for mobile
    const receiveShadow = options.receiveShadow !== false;

    scene.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = castShadow;
      node.receiveShadow = receiveShadow;
      if (!node.material) return;

      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => {
        if (!m) return;
        // Color maps must be sRGB or models look washed/white/wrong
        ['map', 'emissiveMap'].forEach((key) => {
          const tex = this._fixMap(m, key);
          if (tex && 'colorSpace' in tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
          }
        });
        // Data maps stay linear
        ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach((key) => {
          const tex = this._fixMap(m, key);
          if (tex) tex.needsUpdate = true;
        });
        if (m.map) m.map.anisotropy = Math.min(4, m.map.anisotropy || 1);
        m.envMapIntensity = m.envMapIntensity ?? 1.0;
        m.needsUpdate = true;
      });
    });

    if (scale !== 1) scene.scale.setScalar(scale);
  }

  async loadTexture(path, options = {}) {
    if (this.textures.has(path)) return this.textures.get(path);
    return new Promise((resolve) => {
      this.textureLoader.load(
        path,
        (tex) => {
          try {
            tex.colorSpace = THREE.SRGBColorSpace;
            if (options.wrapS) tex.wrapS = options.wrapS;
            if (options.wrapT) tex.wrapT = options.wrapT;
            if (options.repeat) tex.repeat.set(options.repeat.x, options.repeat.y);
            if (options.anisotropy) tex.anisotropy = options.anisotropy;
            this.textures.set(path, tex);
          } catch (e) {}
          this._reportProgress(path);
          resolve(tex);
        },
        undefined,
        () => {
          this._reportProgress(path);
          resolve(null);
        }
      );
    });
  }

  async preload(paths) {
    this.totalToLoad = paths.length;
    this.loadedCount = 0;
    const results = {};
    await Promise.all(
      paths.map(async (entry) => {
        const path = typeof entry === 'string' ? entry : entry.path;
        const type = typeof entry === 'string' ? 'glb' : entry.type || 'glb';
        const options = typeof entry === 'object' ? entry.options || {} : {};
        try {
          if (type === 'texture') results[path] = await this.loadTexture(path, options);
          else results[path] = await this.loadGLB(path, options);
        } catch (e) {
          results[path] = null;
          this._reportProgress(path);
        }
      })
    );
    return results;
  }

  getClone(path) {
    if (!this.cache.has(path)) return null;
    try {
      return this.cache.get(path).clone(true);
    } catch (e) {
      return null;
    }
  }
}
