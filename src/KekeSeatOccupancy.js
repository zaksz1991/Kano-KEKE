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
    if (this.pedModel) {
      const m = this.pedModel.clone(true);
      m.scale.setScalar(0.5 + Math.random() * 0.08);
      return m;
    }
    const g = new THREE.Group();
    const colors = [0x1565c0, 0xc62828, 0x6a1b9a, 0x2e7d32, 0xef6c00, 0x00838f];
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.4, 4, 6),
      new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.75
      })
    );
    body.position.y = 0.35;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.65 })
    );
    head.position.y = 0.72;
    g.add(head);
    return g;
  }

  /** Sync visuals to onboard count */
  sync(onBoardCount) {
    const target = Math.min(onBoardCount, this.seatSlots.length);
    // Add
    while (this.seats.length < target) {
      const mesh = this._makeSeated();
      const slot = this.seatSlots[this.seats.length];
      mesh.position.set(slot.x, slot.y, slot.z);
      mesh.rotation.y = Math.PI; // face forward-ish
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
