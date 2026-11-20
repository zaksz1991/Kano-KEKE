/**
 * Flyovers disabled for stability (wrong-scale Sketchfab assets).
 * Enable later with proper Kano-scaled GLBs.
 */
export class KanoFlyoverSystem {
  constructor(scene, assetManager) {
    this.ready = false;
  }
  async init() {
    this.ready = false;
    console.log('[Flyover] disabled for release stability');
  }
  update() {}
}
