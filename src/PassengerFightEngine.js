export class PassengerFightEngine {
  constructor(kekeController, passengerManager) {
    this.keke = kekeController;
    this.passengerManager = passengerManager;
    this.isFighting = false;
    this.currentPassenger = null;
  }

  triggerPotentialDispute(hudCallback) {
    // 15% chance of passenger fare refusal
    if (Math.random() < 0.15) {
      this.isFighting = true;
      this.keke.maxSpeed = 0; // Freeze movement

      if (hudCallback) {
        hudCallback({
          type: 'FIGHT_TRIGGERED',
          msg: '💢 FARE REFUSAL! Passenger refuses to pay ₦300 fare!\n[Press SPACE repeatedly to brawl and reclaim fare / Press 2 to let them go]'
        });
      }
      return true;
    }
    return false;
  }

  handleFightMash(hudCallback) {
    if (!this.isFighting) return;

    // Resolve brawl cleanly
    this.isFighting = false;
    this.keke.maxSpeed = 0.8;
    this.passengerManager.dailyEarnings += 500; // Fare + Damage Comp

    if (hudCallback) {
      hudCallback('🤛 BRAWL WON! Reclaimed your ₦300 fare plus ₦200 extra compensation!');
    }
  }
}