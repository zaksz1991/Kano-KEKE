/**
 * NAPEP electric conversion + daily battery lease (Kano reality)
 * Engine swap ~₦1,000,000 | Battery own ~₦1,000,000 | Daily charged pack ₦3,000
 */
export class ElectricBatterySystem {
  constructor(kekeController, passengerManager) {
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.converted = false;
    this.batteryPct = 100;
    this.rentActive = false;
    this.rentDayKey = null;
    this.engineCost = 1000000;
    this.batteryBuyCost = 1000000;
    this.dailyRent = 3000;
    this._warnLow = false;
    this._lastMsg = 0;
  }

  load(saved) {
    this.converted = !!saved?.evConverted;
    this.rentActive = !!saved?.evRentActive;
    this.batteryPct = saved?.evBatteryPct ?? (this.converted ? 100 : 0);
  }

  saveFields() {
    return {
      evConverted: this.converted,
      evRentActive: this.rentActive,
      evBatteryPct: this.batteryPct
    };
  }

  _dayKey() {
    return new Date(Date.now() + 3600000).toISOString().slice(0, 10);
  }

  /** Convert petrol NAPEP → electric drivetrain */
  convertEngine(hudCallback) {
    const cash = this.passengers.dailyEarnings || 0;
    if (this.converted) {
      if (hudCallback) hudCallback({ msg: '⚡ Already on electric engine' });
      return false;
    }
    if (cash < this.engineCost) {
      if (hudCallback) {
        hudCallback({
          msg: `⚡ Electric engine ₦${(this.engineCost / 1e6).toFixed(1)}M — need more cash (have ₦${cash})`
        });
      }
      return false;
    }
    this.passengers.dailyEarnings -= this.engineCost;
    this.converted = true;
    this.batteryPct = 0;
    this.rentActive = false;
    if (hudCallback) {
      hudCallback({
        msg: '⚡ Electric engine fitted! Rent a charged battery (₦3,000/day) or buy pack',
        earnings: this.passengers.dailyEarnings
      });
    }
    return true;
  }

  /** Lease fully charged battery for the day */
  rentBattery(hudCallback) {
    if (!this.converted) {
      if (hudCallback) hudCallback({ msg: 'Convert to electric engine first (≈₦1M)' });
      return false;
    }
    const cash = this.passengers.dailyEarnings || 0;
    if (cash < this.dailyRent) {
      if (hudCallback) hudCallback({ msg: `Battery rent ₦${this.dailyRent}/day — not enough cash` });
      return false;
    }
    this.passengers.dailyEarnings -= this.dailyRent;
    this.rentActive = true;
    this.rentDayKey = this._dayKey();
    this.batteryPct = 100;
    this._warnLow = false;
    if (hudCallback) {
      hudCallback({
        msg: '🔋 Charged battery leased · ₦3,000 · full pack for today',
        earnings: this.passengers.dailyEarnings
      });
    }
    return true;
  }

  buyBatteryPack(hudCallback) {
    if (!this.converted) {
      if (hudCallback) hudCallback({ msg: 'Fit electric engine first' });
      return false;
    }
    const cash = this.passengers.dailyEarnings || 0;
    if (cash < this.batteryBuyCost) {
      if (hudCallback) hudCallback({ msg: `Own battery ≈₦1M — have ₦${cash}` });
      return false;
    }
    this.passengers.dailyEarnings -= this.batteryBuyCost;
    this.rentActive = false;
    this.batteryPct = 100;
    if (hudCallback) {
      hudCallback({
        msg: '🔋 Battery pack owned — charge at stations',
        earnings: this.passengers.dailyEarnings
      });
    }
    return true;
  }

  update(delta, speed, hudCallback) {
    if (!this.converted) return;
    // Expire rent next calendar day
    if (this.rentActive && this.rentDayKey && this.rentDayKey !== this._dayKey()) {
      this.rentActive = false;
      this.batteryPct = Math.min(this.batteryPct, 5);
      if (hudCallback) hudCallback({ msg: '🔋 Daily battery lease expired — rent again ₦3,000' });
    }
    if (this.batteryPct <= 0) {
      this.keke.maxSpeed = Math.min(this.keke.maxSpeed || 36, 5);
      return;
    }
    const drain = (0.02 + Math.abs(speed) * 0.012) * delta;
    this.batteryPct = Math.max(0, this.batteryPct - drain);
    if (this.batteryPct < 20 && !this._warnLow) {
      this._warnLow = true;
      if (hudCallback) hudCallback({ msg: '🔋 Battery 20% — swap/rent or limp to charge' });
    }
    if (this.batteryPct <= 0 && hudCallback) {
      hudCallback({ msg: '🛑 Battery empty — rent charged pack ₦3,000' });
    }
  }

  rechargeAtStation(amount = 40) {
    if (!this.converted) return false;
    this.batteryPct = Math.min(100, this.batteryPct + amount);
    this._warnLow = this.batteryPct < 20;
    return true;
  }
}
