// FuelManager.js
export class FuelManager {
  constructor(kekeController) {
    this.keke = kekeController;
    this.fuel = 100;
    this.isOut = false;
  }

  update(delta, hudCallback) {
    if (this.isOut) return;

    const speedRatio = Math.abs(this.keke.currentSpeed) / this.keke.maxSpeed;
    this.fuel -= (0.005 + speedRatio * 0.04) * delta * 10;
    this.fuel = Math.max(0, this.fuel);

    if (this.fuel <= 0 && !this.isOut) {
      this.isOut = true;
      this.keke.maxSpeed = 0;
      if (hudCallback) hudCallback({ type: 'OUT_OF_FUEL', msg: 'Out of Fuel! Stalled in traffic.' });
    }

    if (hudCallback) hudCallback({ type: 'FUEL_UPDATE', level: Math.round(this.fuel) });
  }

  refuel(cost, passengerManager) {
    if (passengerManager.dailyEarnings >= cost) {
      passengerManager.dailyEarnings -= cost;
      this.fuel = 100;
      this.isOut = false;
      this.keke.maxSpeed = 0.8;
      return true;
    }
    return false;
  }
}