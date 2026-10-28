import * as THREE from 'three';

/**
 * Traffic collision – impact, knockback, camera shake flag
 */
export class KekeCollisionSystem {
  constructor(kekeGroup, kekeController, trafficManager, missionManager) {
    this.keke = kekeGroup;
    this.controller = kekeController;
    this.traffic = trafficManager;
    this.missions = missionManager;
    this.cooldown = 0;
    this.engineHealth = 100;
    this.shake = 0; // camera reads this
  }

  update(delta, hudCallback) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.shake = Math.max(0, this.shake - delta * 4);
    if (this.cooldown > 0 || !this.traffic?.vehicles) return;

    const px = this.keke.position.x;
    const pz = this.keke.position.z;
    const speed = this.controller.currentSpeed || 0;

    for (const v of this.traffic.vehicles) {
      if (!v.mesh || v.mesh.visible === false) continue;
      const dx = v.mesh.position.x - px;
      const dz = v.mesh.position.z - pz;
      // Tight lane hit box – not full GLB bounds
      if (Math.abs(dx) > 2.2 || Math.abs(dz) > 3.5) continue;
      const dist = Math.hypot(dx, dz);
      if (dist > 3.2) continue;

      this.cooldown = 1.6;
      this.shake = 0.55 + Math.min(0.45, speed / 40);

      // Bounce back proportional to speed
      const bounce = Math.max(4, speed * 0.45);
      this.controller.velocity = -Math.sign(this.controller.velocity || 1) * bounce * 0.35;
      if (Math.abs(this.controller.velocity) < 2) this.controller.velocity = -3;

      // Nudge sideways away from other vehicle
      this.keke.position.x -= Math.sign(dx || 1) * 0.8;

      const dmg = 8 + Math.min(25, speed * 0.8);
      this.engineHealth = Math.max(0, this.engineHealth - dmg);
      this.missions?.onCrash();

      const lives = this.missions?.loseLife?.() ?? 0;
      if (hudCallback) {
        hudCallback({
          type: 'CRASH',
          msg: `💥 Crash! −${Math.round(dmg)} engine · ${Math.round(this.engineHealth)}% · Lives ${lives}`
        });
      }

      // Push traffic aside
      v.mesh.position.x += Math.sign(v.mesh.position.x - px || 1) * 1.5;

      if (this.engineHealth <= 0 || lives <= 0) {
        this.controller.velocity = 0;
        if (hudCallback) hudCallback({ type: 'WRECKED', msg: '🛠 Keke wrecked! Continue?' });
      }
      break;
    }
  }

  repair() {
    this.engineHealth = 100;
    this.shake = 0;
  }
}
