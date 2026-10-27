/**
 * End-of-shift settlement + daily rewards
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

  canClaimDaily() {
    if (!this.lastDailyClaim) return true;
    try {
      const last = new Date(this.lastDailyClaim);
      const now = new Date();
      return last.toDateString() !== now.toDateString();
    } catch (e) {
      return true;
    }
  }

  claimDaily() {
    if (!this.canClaimDaily()) return { ok: false, amount: 0, reason: 'already' };
    const amount = 1000 + Math.floor(Math.random() * 500);
    this.lastDailyClaim = Date.now();
    if (this.passengers) this.passengers.dailyEarnings = (this.passengers.dailyEarnings || 0) + amount;
    return { ok: true, amount };
  }

  /**
   * Build full settlement summary and show modal
   */
  settle(missionResult = null) {
    const earnings = this.passengers.dailyEarnings || 0;
    const fuelLeft = Math.round(this.fuel?.fuel ?? 50);
    const drops = missionResult?.done?.length || 0;
    const score = missionResult?.score ?? 0;
    const bonus = missionResult?.bonus ?? 0;
    const xp = missionResult?.xpGain ?? 0;
    const level = missionResult?.level ?? 1;
    const leveled = missionResult?.leveled ?? false;
    const highScore = missionResult?.highScore ?? score;
    const rank = this.missions?.rankForScore?.(score) || '—';

    // Operating costs
    const fuelCost = Math.round((100 - fuelLeft) * 8);
    const wearCost = 100 + Math.floor(Math.random() * 200);
    const net = Math.max(0, earnings + bonus - fuelCost - wearCost);

    this._showModal({
      earnings,
      bonus,
      fuelCost,
      wearCost,
      net,
      score,
      xp,
      level,
      leveled,
      highScore,
      missionsDone: missionResult?.done || [],
      rank
    });

    return { net, score, highScore, level, xp };
  }

  _showModal(data) {
    const old = document.getElementById('settlement-modal');
    if (old) old.remove();

    const m = document.createElement('div');
    m.id = 'settlement-modal';
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:130;display:flex;align-items:center;justify-content:center;padding:16px;';

    const missionsHtml = (data.missionsDone || [])
      .map((x) => `<div style="color:#81c784;">✓ ${x}</div>`)
      .join('') || '<div style="color:#888;">No missions completed</div>';

    const stars = data.rank && data.rank.startsWith('S') ? '★★★★★'
      : data.rank && data.rank.startsWith('A') ? '★★★★☆'
      : data.rank && data.rank.startsWith('B') ? '★★★☆☆'
      : data.rank && data.rank.startsWith('C') ? '★★☆☆☆' : '★☆☆☆☆';
    m.innerHTML = `
      <div style="background:linear-gradient(160deg,#1a1a24,#12121a);border:2px solid #ffcc00;border-radius:18px;padding:22px 20px;max-width:340px;width:100%;color:#fff;font-family:system-ui,sans-serif;box-shadow:0 0 40px rgba(255,200,0,0.15);">
        <div style="text-align:center;font-size:13px;color:#00ffff;letter-spacing:2px;">SHIFT COMPLETE</div>
        <h2 style="text-align:center;color:#ffcc00;margin:6px 0 8px;font-size:26px;">Daily Settlement</h2>
        <div style="text-align:center;color:#ffcc00;font-size:20px;letter-spacing:3px;margin-bottom:4px;">${stars}</div>
        ${data.leveled ? '<div style="text-align:center;background:#ff6f00;color:#000;font-weight:900;padding:6px;border-radius:8px;margin-bottom:10px;">LEVEL UP → Lv ' + data.level + '</div>' : ''}
        <div style="text-align:center;color:#80deea;font-size:14px;margin-bottom:8px;">${data.rank || '—'}</div>
        <div style="font-size:14px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;"><span>Fares collected</span><span style="color:#4caf50;">+₦${data.earnings}</span></div>
          <div style="display:flex;justify-content:space-between;"><span>Mission bonus</span><span style="color:#4caf50;">+₦${data.bonus}</span></div>
          <div style="display:flex;justify-content:space-between;"><span>Fuel top-up</span><span style="color:#ef5350;">-₦${data.fuelCost}</span></div>
          <div style="display:flex;justify-content:space-between;"><span>Wear & tear</span><span style="color:#ef5350;">-₦${data.wearCost}</span></div>
          <hr style="border-color:#333;margin:10px 0;">
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;"><span>NET</span><span style="color:#ffcc00;">₦${data.net}</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;color:#aaa;"><span>Score</span><span>${data.score}</span></div>
          <div style="display:flex;justify-content:space-between;color:#aaa;"><span>High score</span><span>${data.highScore}</span></div>
          <div style="display:flex;justify-content:space-between;color:#aaa;"><span>XP gained</span><span>+${data.xp}</span></div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:#ffe082;">
          <div style="margin-bottom:4px;color:#00ffff;">Missions</div>
          ${missionsHtml}
        </div>
        <button id="settlement-ok" style="width:100%;margin-top:16px;padding:14px;background:linear-gradient(135deg,#ffcc00,#ff9800);border:none;border-radius:12px;font-weight:900;font-size:16px;cursor:pointer;color:#000;">COLLECT & CONTINUE</button>
      </div>`;
    document.body.appendChild(m);
    document.getElementById('settlement-ok').onclick = () => {
      this.passengers.dailyEarnings = data.net;
      const earn = document.getElementById('earnings');
      if (earn) earn.innerText = data.net;
      m.remove();
    };
  }
}
