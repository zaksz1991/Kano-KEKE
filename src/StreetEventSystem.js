/**
 * Random Kano street events during a shift
 */
export class StreetEventSystem {
  constructor(kekeController, passengerManager, fuelManager) {
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.fuel = fuelManager;
    this._timer = 25 + Math.random() * 20;
    this.active = null;
    this._activeT = 0;
  }

  update(delta, hudCallback) {
    if (this.active) {
      this._activeT -= delta;
      if (this._activeT <= 0) {
        this._resolve(hudCallback);
      }
      return;
    }

    this._timer -= delta;
    if (this._timer > 0) return;
    this._timer = 35 + Math.random() * 40;

    const roll = Math.random();
    if (roll < 0.3) this._startFlat(hudCallback);
    else if (roll < 0.55) this._startDispute(hudCallback);
    else if (roll < 0.75) this._startJam(hudCallback);
    else if (roll < 0.9) this._startCheckpointRumor(hudCallback);
    else this._startLucky(hudCallback);
  }

  _startFlat(hudCallback) {
    this.active = 'flat';
    this._activeT = 8;
    this.keke.maxSpeed = Math.min(this.keke.maxSpeed, 10);
    if (hudCallback) hudCallback({ msg: '🛑 Flat tyre feel — speed limited. Keep steady for a few seconds.' });
  }

  _startDispute(hudCallback) {
    if (!this.passengers.onBoard?.length) {
      this._timer = 5;
      return;
    }
    this.active = 'dispute';
    this._activeT = 6;
    if (hudCallback) {
      hudCallback({
        msg: '😤 Passenger argument! Stay calm — drop them soon for full fare.'
      });
    }
  }

  _startJam(hudCallback) {
    this.active = 'jam';
    this._activeT = 7;
    this.keke.velocity = Math.max(0, this.keke.velocity * 0.5);
    if (hudCallback) hudCallback({ msg: '🚦 Traffic jam ahead — ease through slowly.' });
  }

  _startCheckpointRumor(hudCallback) {
    this.active = 'rumor';
    this._activeT = 4;
    if (hudCallback) hudCallback({ msg: '📢 Word on street: KAROTA checkpoint ahead. Papers ready.' });
  }

  _startLucky(hudCallback) {
    this.active = 'lucky';
    this._activeT = 3;
    const bonus = 150 + Math.floor(Math.random() * 250);
    this.passengers.dailyEarnings += bonus;
    if (hudCallback) {
      hudCallback({
        msg: `✨ Lucky tip from a regular! +₦${bonus}`,
        type: 'TIP',
        earnings: this.passengers.dailyEarnings
      });
    }
  }

  _resolve(hudCallback) {
    if (this.active === 'flat') {
      this.keke.maxSpeed = Math.max(this.keke.maxSpeed, 22);
      if (hudCallback) hudCallback({ msg: '🔧 Tyre holding — you can speed up again.' });
    }
    if (this.active === 'jam') {
      if (hudCallback) hudCallback({ msg: 'Traffic clearing — move out.' });
    }
    this.active = null;
    this._activeT = 0;
  }
}
