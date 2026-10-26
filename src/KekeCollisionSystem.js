import * as THREE from 'three';

/**
 * Collision with traffic / obstacles – lives, continue, knockback
 */
export class KekeCollisionSystem {
  constructor(kekeGroup, kekeController, trafficManager, missionManager) {
    this.keke = kekeGroup;
    this.controller = kekeController;
    this.traffic = trafficManager;
    this.missions = missionManager;
    this.cooldown = 0;
    this.engineHealth = 100;
  }

  update(delta, hudCallback) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.cooldown > 0 || !this.traffic?.vehicles) return;

    const kekeBox = new THREE.Box3().setFromObject(this.keke);
    // Expand slightly less than full mesh for fairness
    kekeBox.expandByScalar(-0.15);

    for (const v of this.traffic.vehicles) {
      if (!v.mesh) continue;
      const other = new THREE.Box3().setFromObject(v.mesh);
      if (!kekeBox.intersectsBox(other)) continue;

      this.cooldown = 1.4;
      // Knockback
      this.controller.velocity *= -0.35;
      this.engineHealth = Math.max(0, this.engineHealth - 12 - Math.random() * 10);
      this.missions?.onCrash();

      const lives = this.missions?.loseLife?.() ?? 0;
      if (hudCallback) {
        hudCallback({
          type: 'CRASH',
          msg: `💥 Crash! Engine ${Math.round(this.engineHealth)}% · Lives ${lives}`
        });
      }

      // Push traffic aside
      v.mesh.position.x += Math.sign(v.mesh.position.x || 1) * 1.2;

      if (this.engineHealth <= 0 || lives <= 0) {
        if (hudCallback) hudCallback({ type: 'WRECKED', msg: '🛠 Keke wrecked! Continue?' });
      }
      break;
    }
  }

  repair() {
    this.engineHealth = 100;
  }
}
