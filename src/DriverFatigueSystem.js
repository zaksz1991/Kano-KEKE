/**
 * Driver fatigue / stamina – long shifts get harder
 */
export class DriverFatigueSystem {
  constructor(driverBonuses = {}) {
    this.maxStamina = 100 * (driverBonuses.staminaBonus || 1);
    this.stamina = this.maxStamina;
    this.stressed = false;
    this._lastWarn = 0;
  }

  /** Call each frame while driving */
  update(delta, speed, hudCallback) {
    // Drain scales with speed and time
    const drain = (0.35 + (speed / 30) * 0.55) * delta;
    this.stamina = Math.max(0, this.stamina - drain);

    // Rest slightly when stopped
    if (speed < 0.5) {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 1.8);
    }

    this.stressed = this.stamina < 25;

    if (this.stamina < 15 && performance.now() - this._lastWarn > 12000) {
      this._lastWarn = performance.now();
      if (hudCallback) {
        hudCallback({
          msg: this.stamina < 5
            ? '😩 Exhausted! Stop and rest a moment.'
            : '😓 Getting tired — ease off the throttle.'
        });
      }
    }
  }

  /** Speed multiplier when tired */
  getSpeedMul() {
    if (this.stamina < 5) return 0.55;
    if (this.stamina < 15) return 0.72;
    if (this.stamina < 30) return 0.88;
    return 1;
  }

  getPercent() {
    return Math.round((this.stamina / this.maxStamina) * 100);
  }

  rest(amount = 25) {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
  }
}
