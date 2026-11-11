/**
 * Tyres / oil / ENGINE TEMPERATURE — overheat + cool options
 */
export class KekeMaintenanceEngine {
  constructor(kekeController, fuelManager) {
    this.keke = kekeController;
    this.fuel = fuelManager;
    this.tyreHealth = 100;
    this.oilLevel = 100;
    this.engineTemp = 75; // °C ambient-ish
    this.distanceTraveled = 0;
    this.baseMax = kekeController.maxSpeed || 32;
    this._overheatWarned = false;
  }

  update(delta, currentSpeed, hudCallback) {
    const spd = Math.abs(currentSpeed || 0);
    if (spd > 0.05) {
      this.distanceTraveled += delta * spd;
      this.oilLevel = Math.max(0, this.oilLevel - delta * 0.012);
    }

    // Temperature model
    if (spd > 12) {
      this.engineTemp += delta * (0.9 + (spd - 12) * 0.08);
    } else if (spd > 4) {
      this.engineTemp += delta * 0.25;
    } else {
      // Idle / stop cools slowly
      this.engineTemp = Math.max(70, this.engineTemp - delta * 1.8);
    }
    // Night cools a bit
    try {
      const h = ((window.timeInMinutes || 600) / 60) % 24;
      if (h >= 19 || h < 6) this.engineTemp = Math.max(70, this.engineTemp - delta * 0.4);
    } catch (e) {}

    this.engineTemp = Math.min(125, this.engineTemp);

    if (this.engineTemp >= 105 && !this._overheatWarned) {
      this._overheatWarned = true;
      if (hudCallback) {
        hudCallback(
          '🔥 Engine hot ' + Math.round(this.engineTemp) + '°C — stop, water, or PMS cool-down'
        );
      }
      this.keke.maxSpeed = Math.max(10, this.baseMax * 0.55);
    }
    if (this.engineTemp >= 118) {
      this.keke.maxSpeed = Math.max(6, this.baseMax * 0.3);
      if (hudCallback && Math.random() < 0.01) {
        hudCallback('🔥 CRITICAL heat — stop now or risk seize');
      }
    }
    if (this.engineTemp < 95) {
      this._overheatWarned = false;
      if (this.keke.maxSpeed < this.baseMax * 0.9) {
        this.keke.maxSpeed = Math.max(this.keke.maxSpeed, this.baseMax * 0.85);
      }
    }

    if (this.oilLevel <= 5 && Math.random() < 0.0015) {
      this.keke.maxSpeed = Math.max(6, this.baseMax * 0.25);
      if (hudCallback) hudCallback('🔥 Low oil — engine struggling!');
    }
  }

  /** Park / idle cool */
  radiateCool(amount = 12) {
    this.engineTemp = Math.max(70, this.engineTemp - amount);
    if (this.engineTemp < 95) this._overheatWarned = false;
  }

  /** Water / roadside cool-down (small cash) */
  waterCool(passengerManager, hudCallback) {
    const cost = 150;
    if ((passengerManager.dailyEarnings || 0) < cost) {
      if (hudCallback) hudCallback('Need ₦150 for water cool-down');
      return false;
    }
    passengerManager.dailyEarnings -= cost;
    this.engineTemp = Math.max(70, this.engineTemp - 35);
    this._overheatWarned = false;
    this.keke.maxSpeed = Math.max(this.keke.maxSpeed, this.baseMax * 0.9);
    if (hudCallback) hudCallback('💧 Water cool-down — temp ' + Math.round(this.engineTemp) + '°C');
    return true;
  }

  /** Full service at mechanic / PMS */
  getCondition() {
    // Blend oil + inverse temp stress
    const heatPenalty = Math.max(0, (this.engineTemp - 90) * 1.5);
    return Math.max(0, Math.min(100, Math.round((this.oilLevel * 0.6 + this.tyreHealth * 0.4) - heatPenalty)));
  }

  servicingRepair(cost, passengerManager, hudCallback) {
    if (passengerManager.dailyEarnings >= cost) {
      passengerManager.dailyEarnings -= cost;
      this.tyreHealth = 100;
      this.oilLevel = 100;
      this.engineTemp = 75;
      this._overheatWarned = false;
      this.keke.maxSpeed = this.baseMax;
      if (hudCallback) hudCallback('🔧 Full service — engine cooled & oil fresh');
      return true;
    }
    return false;
  }
}
