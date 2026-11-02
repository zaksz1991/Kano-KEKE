import * as THREE from 'three';

/** Disabled GLB peds – empty for performance */
export class PedestrianManager {
  constructor() {
    this.ready = true;
    this.pedestrians = [];
  }
  async init() { this.ready = true; }
  update() {}
}
