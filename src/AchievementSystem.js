/**
 * Local achievements – unlock toasts + persistent flags
 */
export class AchievementSystem {
  static KEY = 'kano_run_achievements_v1';

  constructor() {
    this.unlocked = this._load();
    this.defs = {
      first_fare: { title: 'First Fare', desc: 'Complete your first drop-off' },
      combo_5: { title: 'On Fire', desc: 'Reach combo x5' },
      rich_5k: { title: 'Loaded', desc: 'Hold ₦5,000 cash in a shift' },
      no_crash: { title: 'Clean Wheels', desc: 'Finish a shift with no crash' },
      explorer: { title: 'Explorer', desc: 'Discover 3 landmarks in one shift' },
      night_owl: { title: 'Night Owl', desc: 'Drive past 8 PM game time' },
      full_tank: { title: 'Full Tank', desc: 'Refuel at a petrol station' },
      legend: { title: 'Street Legend', desc: 'Score 15,000 in one shift' }
    };
    this.landmarkCount = 0;
  }

  _load() {
    try {
      const raw = localStorage.getItem(AchievementSystem.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  _save() {
    try {
      localStorage.setItem(AchievementSystem.KEY, JSON.stringify(this.unlocked));
    } catch (e) {}
  }

  unlock(id, hudCallback) {
    if (this.unlocked[id] || !this.defs[id]) return false;
    this.unlocked[id] = Date.now();
    this._save();
    const d = this.defs[id];
    if (hudCallback) hudCallback({ msg: `🏅 ACHIEVEMENT: ${d.title} — ${d.desc}` });
    this._toast(d.title, d.desc);
    return true;
  }

  _toast(title, desc) {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:20%;left:50%;transform:translateX(-50%);z-index:160;background:linear-gradient(135deg,#1a1a24,#2a2000);border:2px solid #ffcc00;border-radius:12px;padding:14px 18px;color:#fff;font-family:system-ui;text-align:center;max-width:280px;box-shadow:0 0 24px rgba(255,200,0,0.35);';
    el.innerHTML = `<div style="color:#ffcc00;font-weight:900;letter-spacing:1px;">🏅 ${title}</div><div style="font-size:12px;color:#ccc;margin-top:4px;">${desc}</div>`;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s';
      setTimeout(() => el.remove(), 500);
    }, 3200);
  }

  onDropoff(combo, cash) {
    this.unlock('first_fare');
    if (combo >= 5) this.unlock('combo_5');
    if (cash >= 5000) this.unlock('rich_5k');
  }

  onLandmark() {
    this.landmarkCount += 1;
    if (this.landmarkCount >= 3) this.unlock('explorer');
  }

  onRefuel() {
    this.unlock('full_tank');
  }

  onNight(timeMin) {
    if (timeMin >= 20 * 60) this.unlock('night_owl');
  }

  onShiftEnd(score, crashed) {
    if (!crashed) this.unlock('no_crash');
    if (score >= 15000) this.unlock('legend');
  }

  countUnlocked() {
    return Object.keys(this.unlocked).length;
  }
}
