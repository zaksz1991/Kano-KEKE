/**
 * Driver + Keke selection – RuffNeck default, progressive unlocks
 */
export class CharacterSelectionManager {
  constructor() {
    this.selectedDriverId = 'ruffneck';
    this.selectedKekeId = 'standard_yellow';

    this.drivers = [
      {
        id: 'ruffneck',
        name: 'RuffNeck',
        title: 'Street King',
        levelReq: 1,
        cost: 0,
        unlocked: true,
        staminaBonus: 1.15,
        tipBonus: 1.1,
        negotiationBonus: 1.05,
        bio: 'Default legend of Kano streets. Knows every junction.'
      },
      {
        id: 'bello',
        name: 'Bello "Maza Bawa"',
        title: 'Market Runner',
        levelReq: 1,
        cost: 0,
        unlocked: true,
        staminaBonus: 1.0,
        tipBonus: 1.0,
        negotiationBonus: 1.0,
        bio: 'Reliable Sabon Gari regular.'
      },
      {
        id: 'sani',
        name: 'Sani "Dan Ladi"',
        title: 'Night Shift',
        levelReq: 3,
        cost: 15000,
        unlocked: false,
        staminaBonus: 1.25,
        tipBonus: 1.05,
        negotiationBonus: 0.95,
        bio: 'Handles late routes. Higher stamina.'
      },
      {
        id: 'zainab',
        name: 'Zainab "Kano Queen"',
        title: 'Tip Magnet',
        levelReq: 5,
        cost: 35000,
        unlocked: false,
        staminaBonus: 1.05,
        tipBonus: 1.35,
        negotiationBonus: 1.15,
        bio: 'Passengers tip more. Strong negotiator.'
      },
      {
        id: 'ibrahim',
        name: 'Ibrahim "Legend of Bata"',
        title: 'Speed Demon',
        levelReq: 10,
        cost: 75000,
        unlocked: false,
        staminaBonus: 1.1,
        tipBonus: 1.1,
        negotiationBonus: 1.1,
        speedBonus: 1.15,
        bio: 'Fastest hands on Bata junction.'
      }
    ];

    this.kekes = [
      {
        id: 'standard_yellow',
        name: 'Classic TVS King (Yellow)',
        cost: 0,
        levelReq: 1,
        unlocked: true,
        speed: 1.0,
        capacity: 3,
        color: 0xffcc00,
        fuelEfficiency: 1.0
      },
      {
        id: 'green_karota',
        name: 'KAROTA Green Commemorative',
        cost: 20000,
        levelReq: 3,
        unlocked: false,
        speed: 1.05,
        capacity: 3,
        color: 0x2e7d32,
        fuelEfficiency: 1.1
      },
      {
        id: 'black_night',
        name: 'Sabon Gari Night Rider',
        cost: 45000,
        levelReq: 6,
        unlocked: false,
        speed: 1.12,
        capacity: 3,
        color: 0x212121,
        fuelEfficiency: 0.95
      },
      {
        id: 'red_express',
        name: 'Hotoro Express Red',
        cost: 60000,
        levelReq: 8,
        unlocked: false,
        speed: 1.18,
        capacity: 4,
        color: 0xc62828,
        fuelEfficiency: 0.9
      },
      {
        id: 'gold_vip',
        name: 'Kano Royalty Gold',
        cost: 100000,
        levelReq: 12,
        unlocked: false,
        speed: 1.25,
        capacity: 4,
        color: 0xffd700,
        fuelEfficiency: 1.05
      }
    ];
  }

  getDriver() {
    return this.drivers.find((d) => d.id === this.selectedDriverId) || this.drivers[0];
  }

  getKeke() {
    return this.kekes.find((k) => k.id === this.selectedKekeId) || this.kekes[0];
  }

  selectDriver(id) {
    const d = this.drivers.find((x) => x.id === id);
    if (d && d.unlocked) {
      this.selectedDriverId = id;
      return true;
    }
    return false;
  }

  selectKeke(id) {
    const k = this.kekes.find((x) => x.id === id);
    if (k && k.unlocked) {
      this.selectedKekeId = id;
      return true;
    }
    return false;
  }

  unlockDriver(id, cash, level) {
    const d = this.drivers.find((x) => x.id === id);
    if (!d || d.unlocked) return { ok: false, msg: 'Already unlocked' };
    if (level < d.levelReq) return { ok: false, msg: `Need level ${d.levelReq}` };
    if (cash < d.cost) return { ok: false, msg: 'Not enough cash' };
    d.unlocked = true;
    return { ok: true, cost: d.cost, msg: `Unlocked ${d.name}` };
  }

  unlockKeke(id, cash, level) {
    const k = this.kekes.find((x) => x.id === id);
    if (!k || k.unlocked) return { ok: false, msg: 'Already unlocked' };
    if (level < k.levelReq) return { ok: false, msg: `Need level ${k.levelReq}` };
    if (cash < k.cost) return { ok: false, msg: 'Not enough cash' };
    k.unlocked = true;
    return { ok: true, cost: k.cost, msg: `Unlocked ${k.name}` };
  }

  populateUI() {
    const driverSelect = document.getElementById('driver-select');
    const kekeSelect = document.getElementById('keke-select');
    if (driverSelect) {
      driverSelect.innerHTML = '';
      this.drivers.forEach((d) => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.unlocked ? `${d.name} — ${d.title}` : `🔒 ${d.name} (Lv${d.levelReq} · ₦${d.cost})`;
        opt.disabled = !d.unlocked;
        if (d.id === this.selectedDriverId) opt.selected = true;
        driverSelect.appendChild(opt);
      });
      driverSelect.onchange = () => this.selectDriver(driverSelect.value);
    }
    if (kekeSelect) {
      kekeSelect.innerHTML = '';
      this.kekes.forEach((k) => {
        const opt = document.createElement('option');
        opt.value = k.id;
        opt.textContent = k.unlocked
          ? `${k.name}`
          : `🔒 ${k.name} (Lv${k.levelReq} · ₦${k.cost})`;
        opt.disabled = !k.unlocked;
        if (k.id === this.selectedKekeId) opt.selected = true;
        kekeSelect.appendChild(opt);
      });
      kekeSelect.onchange = () => this.selectKeke(kekeSelect.value);
    }
  }
}
