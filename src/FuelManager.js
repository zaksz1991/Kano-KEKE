/**
 * PMS / fuel – real-life keke economy
 */
export class FuelManager {
  constructor(kekeController) {
    this.keke = kekeController;
    this.fuel = 100;
    this.isOut = false;
    this.baseMaxSpeed = Math.max(24, kekeController.maxSpeed || 32);
    this._warn25 = false;
    this._warn10 = false;
  }

  update(delta, hudCallback) {
    if (this.isOut) {
      this.keke.maxSpeed = Math.min(this.keke.maxSpeed, 4);
      return;
    }

    const speed = Math.abs(this.keke.currentSpeed || 0);
    const speedRatio = speed / Math.max(1, this.keke.maxSpeed || 32);
    // Idle sip + speed burn (NAPEP-ish economy)
    this.fuel -= (0.04 + speedRatio * 0.14 + (speed > 20 ? 0.05 : 0)) * delta;
    this.fuel = Math.max(0, this.fuel);

    if (this.fuel <= 25 && !this._warn25) {
      this._warn25 = true;
      if (hudCallback) hudCallback({ msg: '⛽ Fuel 25% — look for PMS (green canopy)' });
    }
    if (this.fuel <= 10 && !this._warn10) {
      this._warn10 = true;
      if (hudCallback) hudCallback({ msg: '⛽ Fuel low! Station now or you go stop.' });
    }

    if (this.fuel <= 0 && !this.isOut) {
      this.isOut = true;
      this.keke.maxSpeed = 4;
      if (hudCallback) hudCallback({ type: 'OUT_OF_FUEL', msg: '🛑 Fuel finish! Crawl to nearest PMS.' });
    }
  }

  refuel(cost, passengerManager) {
    if (passengerManager.dailyEarnings >= cost) {
      passengerManager.dailyEarnings -= cost;
      this.fuel = 100;
      this.isOut = false;
      this._warn25 = false;
      this._warn10 = false;
      this.keke.maxSpeed = Math.max(this.keke.maxSpeed, this.baseMaxSpeed);
      return true;
    }
    return false;
  }
}
