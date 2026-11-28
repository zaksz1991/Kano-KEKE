/**
 * Traffic collisions — fair hitboxes, no wrong-lane shove
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
      // Skip proxy-only boxes for soft collision (optional) — still collide but gentler
      const isProxy = !!v.mesh.userData?.isProxy;
      const dx = v.mesh.position.x - px;
      const dz = v.mesh.position.z - pz;

      const latMax = v.kind === 'okada' || v.kind === 'bike' ? 1.5 : v.kind === 'truck' ? 2.6 : 2.1;
      const depthMax = v.kind === 'okada' || v.kind === 'bike' ? 2.6 : 3.6;
      if (Math.abs(dx) > latMax || Math.abs(dz) > depthMax) continue;

      // Same-ish lane only (ignore far opposite carriageway false hits)
      if (Math.sign(px || 1) !== Math.sign(v.mesh.position.x || 1) && Math.abs(dx) > 3.5) continue;

      if (speed < 1.2) {
        this.cooldown = 0.4;
        // Nudge other vehicle only, keep its carriageway side
        const side = Math.sign(v.laneX || v.mesh.position.x || 1) || 1;
        v.mesh.position.x = THREE_clampLane(v.mesh.position.x + side * 0.8, v.opposite);
        v.laneX = v.mesh.position.x;
        break;
      }

      this.cooldown = isProxy ? 1.4 : 2.0;
      this.shake = 0.2 + Math.min(0.3, speed / 55);

      this.controller.velocity = Math.max(0, this.controller.velocity * 0.45);
      // Small player nudge, stay on own side of road
      this.keke.position.x -= Math.sign(dx || 1) * 0.55;
      const side = Math.sign(v.laneX || 1) || 1;
      v.mesh.position.x += side * 1.2;
      v.laneX = THREE_clampLane(v.mesh.position.x, v.opposite);

      const dmg = 3 + Math.min(10, speed * 0.35);
      this.engineHealth = Math.max(0, this.engineHealth - dmg * 0.4);
      this.missions?.onCrash?.();
      const lives = speed > 10 ? (this.missions?.loseLife?.() ?? 0) : (this.missions?.lives ?? 3);

      if (hudCallback) {
        hudCallback({
          type: 'CRASH',
          msg: isProxy
            ? `💥 Hit traffic · Engine ${Math.round(this.engineHealth)}%`
            : `💥 Crash! Engine ${Math.round(this.engineHealth)}% · Lives ${lives}`,
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

function THREE_clampLane(x, opposite) {
  if (opposite) {
    if (x > -1.5) return -3.2;
    return x < -7 ? -5.4 : x;
  }
  if (x < 1.5) return 3.2;
  return x > 7 ? 5.4 : x;
}
