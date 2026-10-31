/**
 * Reliable traffic collisions on dual road
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
    if (this.cooldown > 0 || !this.traffic?.vehicles?.length) return;

    const px = this.keke.position.x;
    const pz = this.keke.position.z;
    const speed = this.controller.currentSpeed || 0;

    for (const v of this.traffic.vehicles) {
      if (!v.mesh || v.mesh.visible === false) continue;
      const dx = v.mesh.position.x - px;
      const dz = v.mesh.position.z - pz;

      // Generous but fair hit boxes (GLBs are larger than before)
      const latMax = v.kind === 'okada' ? 1.8 : v.kind === 'bus' ? 3.0 : 2.4;
      const depthMax = v.kind === 'okada' ? 3.2 : 4.2;
      if (Math.abs(dx) > latMax || Math.abs(dz) > depthMax) continue;

      // Parked: only push traffic away
      if (speed < 1.0) {
        this.cooldown = 0.35;
        v.mesh.position.x += Math.sign(dx || 1) * 2.5;
        v.laneX = v.mesh.position.x;
        break;
      }

      this.cooldown = 1.4;
      this.shake = 0.3 + Math.min(0.35, speed / 50);

      // Knock player slightly and cut speed
      this.controller.velocity = Math.max(0, this.controller.velocity * 0.4); // never reverse from crash
      this.keke.position.x -= Math.sign(dx || 1) * 0.9;
      v.mesh.position.x += Math.sign(dx || 1) * 1.8;
      v.laneX = v.mesh.position.x;

      const dmg = 8 + Math.min(20, speed * 0.7);
      this.engineHealth = Math.max(0, this.engineHealth - dmg);
      this.missions?.onCrash();
      const lives = this.missions?.loseLife?.() ?? 0;

      if (hudCallback) {
        hudCallback({
          type: 'CRASH',
          msg: `💥 Crash! Engine ${Math.round(this.engineHealth)}% · Lives ${lives}`,
          shake: this.shake
        });
      }

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
