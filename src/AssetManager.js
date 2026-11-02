import * as THREE from 'three';

/**
 * FAST BOOT AssetManager – NO network GLB/texture loads
 * (Prevents "loading models" hang on start page)
 */
export class AssetManager {
  constructor() {
    this.cache = new Map();
    this.textures = new Map();
    this.totalToLoad = 0;
    this.loadedCount = 0;
    this.onProgress = null;
    this.allowNetwork = false; // KEEP FALSE for fast start
  }

  setProgressCallback(cb) {
    this.onProgress = cb;
  }

  /** Always instant – no downloads */
  async loadGLB(path, options = {}) {
    if (this.cache.has(path)) {
      try {
        return this.cache.get(path).clone(true);
      } catch (e) {
        return null;
      }
    }
    // Network disabled – return null immediately
    return null;
  }

  async loadTexture() {
    return null;
  }

  async loadMany() {
    return {};
  }

  _prepareScene() {}
}
