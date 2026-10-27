export class FuelManager {
  constructor(kekeController) {
    this.keke = kekeController;
    this.fuel = 100;
    this.isOut = false;
    this.baseMaxSpeed = kekeController.maxSpeed || 22;
  }

  update(delta, hudCallback) {
    if (this.isOut) {
      if (hudCallback) hudCallback({ type: 'FUEL_UPDATE', level: 0 });
      return;
    }

    const speedRatio = Math.abs(this.keke.currentSpeed) / Math.max(1, this.keke.maxSpeed);
    // Slow drain – full tank lasts several minutes of driving
    this.fuel -= (0.04 + speedRatio * 0.12) * delta;  // slower drain for playable shifts
    this.fuel = Math.max(0, this.fuel);

    if (this.fuel <= 0 && !this.isOut) {
      this.isOut = true;
      this.keke.maxSpeed = 0;
      if (hudCallback) hudCallback({ type: 'OUT_OF_FUEL', msg: 'Out of Fuel! Find a filling station.' });
    }

    if (hudCallback) hudCallback({ type: 'FUEL_UPDATE', level: Math.round(this.fuel) });
  }

  refuel(cost, passengerManager) {
    if (passengerManager.dailyEarnings >= cost) {
      passengerManager.dailyEarnings -= cost;
      this.fuel = 100;
      this.isOut = false;
      this.keke.maxSpeed = this.baseMaxSpeed;
      return true;
    }
    return false;
  }
}
