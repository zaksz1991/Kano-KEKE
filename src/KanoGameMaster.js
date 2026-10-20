import { KekeCustomizer } from './KekeCustomizer.js';
import { NightThugDangerEngine } from './NightThugDangerEngine.js';

export class KanoGameMaster {
  constructor(scene, kekeGroup, kekeController, driverState, passengerManager) {
    this.scene = scene;
    this.customizer = new KekeCustomizer(scene, kekeGroup);
    this.nightDanger = new NightThugDangerEngine(scene, kekeController, this.customizer, driverState);
    this.passengerManager = passengerManager;

    this.initListeners();
  }

  initListeners() {
    document.getElementById('buy-neon')?.addEventListener('click', () => this.buy('neon', 3500));
    document.getElementById('buy-subwoofer')?.addEventListener('click', () => this.buy('subwoofer', 5000));
    document.getElementById('buy-bumper')?.addEventListener('click', () => this.buy('bumper', 6500));
    document.getElementById('close-shop')?.addEventListener('click', () => {
      document.getElementById('shop-modal').style.display = 'none';
    });
  }

  buy(type, cost) {
    if (this.passengerManager.dailyEarnings >= cost) {
      this.passengerManager.dailyEarnings -= cost;
      document.getElementById('earnings').innerText = this.passengerManager.dailyEarnings;
      if (type === 'neon') this.customizer.installNeon(0x00ffff);
      if (type === 'subwoofer') this.customizer.installSubwoofer();
      if (type === 'bumper') this.customizer.installBumper();
    }
  }

  update(delta, timeInMinutes, hudCallback) {
    this.nightDanger.update(timeInMinutes, this.passengerManager.dailyEarnings, hudCallback);
  }
}