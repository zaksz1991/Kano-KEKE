/**
 * Driver fatigue / stamina – rest recovers, long shifts drain
 */
export class DriverFatigueSystem {
  constructor(driverBonuses = {}) {
    this.maxStamina = 100 * (driverBonuses.staminaBonus || 1);
    this.stamina = this.maxStamina;
    this.stressed = false;
    this._lastWarn = 0;
    this._lastRestMsg = 0;
  }

  update(delta, speed, hudCallback, nearStation = false) {
    // Milder drain
    const drain = (0.18 + (speed / 30) * 0.35) * delta;
    if (speed >= 0.8) {
      this.stamina = Math.max(0, this.stamina - drain);
    }

    // Rest when nearly stopped
    if (speed < 0.8) {
      const rate = nearStation ? 8.0 : 3.2;
      const before = this.stamina;
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * rate);
      if (
        this.stamina - before > 0.5 &&
        this.stamina < this.maxStamina - 1 &&
        performance.now() - this._lastRestMsg > 8000
      ) {
        this._lastRestMsg = performance.now();
        if (hudCallback) {
          hudCallback({
            msg: nearStation
              ? '☕ Resting at station — stamina recovering fast'
              : '😌 Parked — stamina recovering'
          });
        }
      }
    }

    this.stressed = this.stamina < 25;

    if (this.stamina < 15 && performance.now() - this._lastWarn > 14000) {
      this._lastWarn = performance.now();
      if (hudCallback) {
        hudCallback({
          msg:
            this.stamina < 5
              ? '😩 Exhausted! Stop fully to rest.'
              : '😓 Getting tired — stop a moment to recover.'
        });
      }
    }
  }

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
