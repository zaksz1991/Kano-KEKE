import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

export class AssetManager {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader();
    this.cache = new Map();
  }

  async loadGLB(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path).clone(true);
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          gltf.scene.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              if (node.material) {
                node.material.envMapIntensity = 1.5;
                node.material.needsUpdate = true;
              }
            }
          });
          this.cache.set(path, gltf.scene);
          resolve(gltf.scene.clone(true));
        },
        (xhr) => {
          // Progress tracking if needed
        },
        (error) => {
          console.error(`❌ AssetManager Error loading ${path}:`, error);
          reject(error);
        }
      );
    });
  }

  preloadAssets(paths) {
    return Promise.all(paths.map((p) => this.loadGLB(p)));
  }
}