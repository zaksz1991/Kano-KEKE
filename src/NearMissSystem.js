/**
 * Near-miss on dual carriageway – reward tight okada/car passes
 */
export class NearMissSystem {
  constructor(kekeGroup, kekeController, trafficManager, missionManager) {
    this.keke = kekeGroup;
    this.controller = kekeController;
    this.traffic = trafficManager;
    this.missions = missionManager;
    this._tagged = new WeakSet();
    this.cooldown = 0;
    this.streak = 0;
  }

  update(delta, hudCallback) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (!this.traffic?.vehicles) return;

    const px = this.keke.position.x;
    const pz = this.keke.position.z;
    const speed = this.controller.currentSpeed || 0;
    if (speed < 5) {
      this.streak = 0;
      return;
    }

    for (const v of this.traffic.vehicles) {
      if (!v.mesh || !v.mesh.visible) continue;
      if (this._tagged.has(v.mesh)) continue;

      const dx = v.mesh.position.x - px;
      const dz = v.mesh.position.z - pz;
      const dist = Math.hypot(dx, dz);

      // Threading gap: close laterally, similar depth
      const lateral = Math.abs(dx);
      const depth = Math.abs(dz);
      if (lateral < 3.8 && lateral > 1.6 && depth < 6 && dist < 5.5) {
        this._tagged.add(v.mesh);
        this.streak += 1;
        const okadaBonus = v.kind === 'okada' ? 20 : 0;
        const bonus =
          35 + Math.min(90, Math.floor(speed * 2.2)) + (this.streak > 1 ? this.streak * 18 : 0) + okadaBonus;

        if (this.missions) this.missions.score = (this.missions.score || 0) + bonus;

        if (hudCallback && this.cooldown <= 0) {
          this.cooldown = 0.7;
          const msg =
            this.streak >= 3
              ? `⚡ Near miss x${this.streak}! +${bonus}`
              : `⚡ Near miss! +${bonus}`;
          hudCallback({ type: 'NEAR_MISS', msg, bonus });
        }

        setTimeout(() => {
          try {
            this._tagged.delete(v.mesh);
          } catch (e) {}
        }, 3500);
      }
    }
  }
}
