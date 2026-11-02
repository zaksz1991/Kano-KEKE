/**
 * End-of-shift settlement + daily rewards (once per calendar day)
 */
export class DailySettlementManager {
  constructor(passengerManager, fuelManager, kekeController, missionManager = null) {
    this.passengers = passengerManager;
    this.fuel = fuelManager;
    this.keke = kekeController;
    this.missions = missionManager;
    this.lastDailyClaim = null;
  }

  loadDaily(saved) {
    this.lastDailyClaim = saved?.lastDailyClaim || null;
  }

  _watDayKey(ts = Date.now()) {
    // West Africa Time = UTC+1
    const d = new Date(ts + 3600000);
    return d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate();
  }

  canClaimDaily() {
    if (!this.lastDailyClaim) return true;
    try {
      return this._watDayKey(this.lastDailyClaim) !== this._watDayKey(Date.now());
    } catch (e) {
      return true;
    }
  }

  claimDaily() {
    if (!this.canClaimDaily()) return { ok: false, amount: 0, reason: 'already' };
    const amount = 1500 + Math.floor(Math.random() * 500);
    this.lastDailyClaim = Date.now();
    if (this.passengers) {
      this.passengers.dailyEarnings = (this.passengers.dailyEarnings || 0) + amount;
    }
    return { ok: true, amount };
  }

  settle(missionResult = null) {
    const earnings = this.passengers.dailyEarnings || 0;
    const fuelLeft = Math.round(this.fuel?.fuel ?? 50);
    const score = missionResult?.score ?? 0;
    const rank = this.missions?.rankForScore?.(score) || '—';
    const stars =
      rank && String(rank).startsWith('S') ? '★★★★★' :
      rank && String(rank).startsWith('A') ? '★★★★☆' :
      rank && String(rank).startsWith('B') ? '★★★☆☆' :
      rank && String(rank).startsWith('C') ? '★★☆☆☆' : '★☆☆☆☆';

    const m = document.createElement('div');
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:150;display:flex;align-items:center;justify-content:center;padding:12px;';
    m.innerHTML = `
      <div style="background:linear-gradient(160deg,#1a1a24,#12121a);border:2px solid #ffcc00;border-radius:18px;padding:22px 20px;max-width:340px;width:100%;color:#fff;font-family:system-ui,sans-serif;">
        <div style="text-align:center;font-size:13px;color:#00ffff;letter-spacing:2px;">SHIFT COMPLETE</div>
        <h2 style="text-align:center;color:#ffcc00;margin:6px 0 8px;font-size:26px;">Daily Settlement</h2>
        <div style="text-align:center;color:#ffcc00;font-size:20px;letter-spacing:3px;margin-bottom:4px;">${stars}</div>
        <div style="text-align:center;color:#80deea;font-size:14px;margin-bottom:8px;">${rank}</div>
        <div style="font-size:14px;line-height:1.7;">
          <div>Cash: <b style="color:#4caf50;">₦${earnings}</b></div>
          <div>Score: <b>${score}</b></div>
          <div>Fuel left: ${fuelLeft}%</div>
        </div>
        <button id="settle-close" style="width:100%;margin-top:14px;padding:12px;border:none;border-radius:10px;font-weight:900;background:#ffcc00;color:#000;cursor:pointer;">OK</button>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#settle-close')?.addEventListener('click', () => m.remove());
  }
}
