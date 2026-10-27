import * as THREE from 'three';

/**
 * Visual passengers seated in the keke during a trip
 */
export class KekeSeatOccupancy {
  constructor(kekeGroup, assetManager = null) {
    this.keke = kekeGroup;
    this.assets = assetManager;
    this.pedModel = null;
    this.seats = [];
    // Local offsets relative to keke (behind driver)
    this.seatSlots = [
      { x: -0.35, y: 0.85, z: -0.35 },
      { x: 0.35, y: 0.85, z: -0.35 },
      { x: 0, y: 0.85, z: -0.85 },
      { x: -0.35, y: 0.85, z: -1.15 }
    ];
  }

  async init() {
    if (!this.assets) return;
    try {
      this.pedModel = await this.assets.loadGLB('/assets/models/pedestrian.glb', {
        scale: 0.55,
        castShadow: true
      });
    } catch (e) {
      this.pedModel = null;
    }
  }

  _makeSeated() {
    if (!this.pedModel) return null;
    const m = this.pedModel.clone(true);
    m.scale.setScalar(0.5 + Math.random() * 0.08);
    return m;
  }

  /** Sync visuals to onboard count */
  sync(onBoardCount) {
    const target = Math.min(onBoardCount, this.seatSlots.length);
    // Add
    while (this.seats.length < target) {
      const mesh = this._makeSeated();
      if (!mesh) break;
      const slot = this.seatSlots[this.seats.length];
      mesh.position.set(slot.x, slot.y, slot.z);
      mesh.rotation.y = Math.PI;
      this.keke.add(mesh);
      this.seats.push(mesh);
    }
    // Remove
    while (this.seats.length > target) {
      const m = this.seats.pop();
      this.keke.remove(m);
    }
  }

  clear() {
    this.sync(0);
  }
}
