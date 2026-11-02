export class KekeMaintenanceEngine {
  constructor(kekeController, fuelManager) {
    this.keke = kekeController;
    this.fuel = fuelManager;
    this.tyreHealth = 100;
    this.oilLevel = 100;
    this.distanceTraveled = 0;
    this.baseMax = kekeController.maxSpeed || 28;
  }

  update(delta, currentSpeed, hudCallback) {
    if (Math.abs(currentSpeed) < 0.05) return;
    this.distanceTraveled += delta * Math.abs(currentSpeed);
    /* tyre decay only on collision */
    this.oilLevel = Math.max(0, this.oilLevel - delta * 0.015);

    if (false && this.tyreHealth <= 5 && Math.random() < 0.002) { // disabled: no random flat
      this.keke.maxSpeed = Math.max(8, this.baseMax * 0.35);
      if (hudCallback) hudCallback('🛑 Flat tyre – speed reduced. Find a vulcanizer.');
    }
    if (this.oilLevel <= 5 && Math.random() < 0.002) {
      this.keke.maxSpeed = Math.max(6, this.baseMax * 0.25);
      if (hudCallback) hudCallback('🔥 Low oil – engine struggling!');
    }
  }

  servicingRepair(cost, passengerManager, hudCallback) {
    if (passengerManager.dailyEarnings >= cost) {
      passengerManager.dailyEarnings -= cost;
      this.tyreHealth = 100;
      this.oilLevel = 100;
      this.keke.maxSpeed = this.baseMax;
      if (hudCallback) hudCallback('🔧 Servicing complete!');
      return true;
    }
    return false;
  }
}
