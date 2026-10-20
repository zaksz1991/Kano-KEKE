export class KekeMaintenanceEngine {
  constructor(kekeController, fuelManager) {
    this.keke = kekeController;
    this.fuel = fuelManager;

    // Component Durability Percentages (0% - 100%)
    this.tyreHealth = 100;
    this.oilLevel = 100;
    this.suspensionHealth = 100;
    this.distanceTraveled = 0;
  }

  update(delta, currentSpeed, hudCallback) {
    if (Math.abs(currentSpeed) > 0.05) {
      this.distanceTraveled += delta * Math.abs(currentSpeed);

      // Gradual wear based on distance & speed
      this.tyreHealth = Math.max(0, this.tyreHealth - delta * 0.05);
      this.oilLevel = Math.max(0, this.oilLevel - delta * 0.03);

      // If tyres or oil drop critically low, trigger penalties
      if (this.tyreHealth <= 5 && Math.random() < 0.005) {
        this.keke.maxSpeed = 0.2; // Flat tyre slowdown
        if (hudCallback) hudCallback('🛑 FLAT TYRE! Your back tyre burst from road wear! Find a roadside Vulcanizer.');
      }

      if (this.oilLevel <= 5 && Math.random() < 0.005) {
        this.keke.maxSpeed = 0; // Engine seizure
        if (hudCallback) hudCallback('🔥 ENGINE SEIZED! You ran out of 2-stroke oil! Engine overheated.');
      }
    }
  }

  servicingRepair(cost, passengerManager, hudCallback) {
    if (passengerManager.dailyEarnings >= cost) {
      passengerManager.dailyEarnings -= cost;
      this.tyreHealth = 100;
      this.oilLevel = 100;
      this.suspensionHealth = 100;
      this.keke.maxSpeed = 0.8; // Restore normal speed

      if (hudCallback) hudCallback(`🔧 Full Service Completed! Tyres changed, oil refilled. Paid ₦${cost}.`);
      return true;
    } else {
      if (hudCallback) hudCallback(`❌ Not enough money for full service! Need ₦${cost}.`);
      return false;
    }
  }
}