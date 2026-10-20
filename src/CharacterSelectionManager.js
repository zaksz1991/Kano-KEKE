export class CharacterSelectionManager {
  constructor() {
    this.selectedDriver = 'bello';
    this.selectedKeke = 'standard_yellow';

    this.drivers = [
      { id: 'bello', name: 'Bello "Maza Bawa"', levelReq: 1, cost: 0, unlocked: true, staminaBonus: 1.0 },
      { id: 'sani', name: 'Sani "Dan Ladi"', levelReq: 3, cost: 15000, unlocked: false, staminaBonus: 1.25 },
      { id: 'zainab', name: 'Zainab "Kano Queen"', levelReq: 5, cost: 35000, unlocked: false, tipBonus: 1.3 },
      { id: 'ibrahim', name: 'Ibrahim "Legend of Bata"', levelReq: 10, cost: 75000, unlocked: false, speedBonus: 1.15 }
    ];

    this.kekes = [
      { id: 'standard_yellow', name: 'Classic TVS King (Yellow)', cost: 0, unlocked: true, speed: 0.8, color: 0xffcc00 },
      { id: 'green_karo', name: 'KAROTA Commemorative Green', cost: 20000, unlocked: false, speed: 0.88, color: 0x008000 },
      { id: 'black_edition', name: 'Sabon Gari Night Rider (Black)', cost: 45000, unlocked: false, speed: 0.95, color: 0x111111 },
      { id: 'gold_vip', name: 'Kano Royalty Gold TVS', cost: 100000, unlocked: false, speed: 1.1, color: 0xffd700 }
    ];
  }

  unlockDriver(driverId, currentCash) {
    const driver = this.drivers.find(d => d.id === driverId);
    if (driver && !driver.unlocked && currentCash >= driver.cost) {
      driver.unlocked = true;
      return { success: true, cost: driver.cost, msg: `🎉 Unlocked Driver: ${driver.name}!` };
    }
    return { success: false, msg: "❌ Insufficient funds or level locked!" };
  }

  unlockKeke(kekeId, currentCash) {
    const keke = this.kekes.find(k => k.id === kekeId);
    if (keke && !keke.unlocked && currentCash >= keke.cost) {
      keke.unlocked = true;
      return { success: true, cost: keke.cost, msg: `🚗 Unlocked Keke: ${keke.name}!` };
    }
    return { success: false, msg: "❌ Insufficient funds!" };
  }
}