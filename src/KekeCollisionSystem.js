/**
 * Collisions – no false crashes while parked; traffic is pushed away instead
 */
export class KekeCollisionSystem {
  constructor(kekeGroup, kekeController, trafficManager, missionManager) {
    this.keke = kekeGroup;
    this.controller = kekeController;
    this.traffic = trafficManager;
    this.missions = missionManager;
    this.cooldown = 0;
    this.engineHealth = 100;
    this.shake = 0;
  }

  update(delta, hudCallback) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.shake = Math.max(0, this.shake - delta * 5);
    if (this.cooldown > 0 || !this.traffic?.vehicles) return;

    const px = this.keke.position.x;
    const pz = this.keke.position.z;
    const speed = this.controller.currentSpeed || 0;
    const parked = speed < 1.2;

    for (const v of this.traffic.vehicles) {
      if (!v.mesh || v.mesh.visible === false) continue;
      const dx = v.mesh.position.x - px;
      const dz = v.mesh.position.z - pz;

      const latMax = v.kind === 'okada' ? 1.55 : v.kind === 'bus' ? 2.6 : 2.0;
      const depthMax = v.kind === 'okada' ? 2.6 : 3.4;
      if (Math.abs(dx) > latMax || Math.abs(dz) > depthMax) continue;
      const dist = Math.hypot(dx, dz);
      if (dist > latMax + 0.8) continue;

      // --- Parked: traffic yields, YOU don't crash ---
      if (parked) {
        this.cooldown = 0.4;
        // shove traffic out of your lane only
        v.mesh.position.x += Math.sign(v.mesh.position.x - px || 1) * 2.2;
        v.laneX = v.mesh.position.x;
        // no damage, no shake, no banner
        break;
      }

      // --- Moving: real collision ---
      this.cooldown = 1.6;
      this.shake = 0.35 + Math.min(0.35, speed / 50); // one-shot; camera must not re-feed

      const bounce = Math.max(3, speed * 0.4);
      this.controller.velocity = -Math.sign(this.controller.velocity || 1) * bounce * 0.32;
      if (Math.abs(this.controller.velocity) < 1.5) this.controller.velocity = -2.5;
      this.keke.position.x -= Math.sign(dx || 1) * 0.7;

      const dmg = 7 + Math.min(22, speed * 0.75);
      this.engineHealth = Math.max(0, this.engineHealth - dmg);
      this.missions?.onCrash();

      const lives = this.missions?.loseLife?.() ?? 0;
      if (hudCallback) {
        hudCallback({
          type: 'CRASH',
          msg: `💥 Crash! −${Math.round(dmg)} engine · ${Math.round(this.engineHealth)}% · Lives ${lives}`,
          shake: this.shake
        });
      }

      v.mesh.position.x += Math.sign(v.mesh.position.x - px || 1) * 1.6;
      v.laneX = v.mesh.position.x;

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
