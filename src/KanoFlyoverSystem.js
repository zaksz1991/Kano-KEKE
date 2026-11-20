
import * as THREE from 'three';

/**
 * Lightweight procedural overpasses (no heavy Sketchfab GLBs).
 * Spans the dual carriageway every few hundred meters.
 */
export class KanoFlyoverSystem {
  constructor(scene) {
    this.scene = scene;
    this.instances = [];
    this.ready = false;
    this.spacing = 320;
    this._nextZ = 100;
    this.maxVisible = 2;
    this.names = [
      'Zoo Road Overpass',
      'Murtala Link',
      'Gwarzo Bridge',
      'Hotoro Flyover'
    ];
    this._nameIdx = 0;
    this._lastAnnounce = 0;
  }

  async init() {
    this.ready = true;
    this._spawn(90);
    this._spawn(90 + this.spacing);
    this._nextZ = 90 + this.spacing * 2;
    console.log('[Flyover] procedural overpasses ready');
  }

  _makeDeck() {
    const g = new THREE.Group();
    // Deck
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.45, 28),
      new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.75, metalness: 0.1 })
    );
    deck.position.y = 6.2;
    g.add(deck);
    // Side barriers
    for (const x of [-10.5, 10.5]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.9, 28),
        new THREE.MeshStandardMaterial({ color: 0xb0bec5 })
      );
      rail.position.set(x, 6.85, 0);
      g.add(rail);
    }
    // Pillars
    for (const z of [-8, 8]) {
      for (const x of [-6, 6]) {
        const p = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 6.2, 1.2),
          new THREE.MeshStandardMaterial({ color: 0x90a4ae })
        );
        p.position.set(x, 3.1, z);
        g.add(p);
      }
    }
    return g;
  }

  _spawn(z) {
    try {
      const mesh = this._makeDeck();
      mesh.position.set(0, 0, z);
      this.scene.add(mesh);
      const name = this.names[this._nameIdx % this.names.length];
      this._nameIdx++;
      this.instances.push({ mesh, z, name });
    } catch (e) {}
  }

  update(playerZ) {
    if (!this.ready) return;
    this.instances = this.instances.filter((inst) => {
      const dz = inst.z - playerZ;
      if (dz < -120) {
        try { this.scene.remove(inst.mesh); } catch (e) {}
        return false;
      }
      inst.mesh.visible = Math.abs(dz) < 280;
      if (dz > 35 && dz < 80 && performance.now() - this._lastAnnounce > 16000) {
        this._lastAnnounce = performance.now();
        try { window.showBanner?.('🛤️ ' + inst.name + ' ahead'); } catch (e) {}
      }
      if (Math.abs(dz) < 12 && !inst._under) {
        inst._under = true;
        try { window.showBanner?.('Passing under ' + inst.name); } catch (e) {}
      }
      return true;
    });
    while (this._nextZ < playerZ + 400 && this.instances.length < this.maxVisible + 1) {
      this._spawn(this._nextZ);
      this._nextZ += this.spacing + Math.random() * 60;
    }
  }
}
