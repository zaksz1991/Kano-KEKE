export class DailySettlementManager {
  constructor(passengerManager, fuelManager, kekeController) {
    this.passengerManager = passengerManager;
    this.fuelManager = fuelManager;
    this.keke = kekeController;

    this.dailyLeaseFee = 7000;
    this.bankSavings = 0;
    this.dayCount = 1;
    this.isSettlementActive = false;
  }

  checkEndOfDay(timeInMinutes, hudCallback) {
    // 10:00 PM Trigger (22:00 = 1320 minutes)
    if (timeInMinutes >= 1320 && !this.isSettlementActive) {
      this.isSettlementActive = true;
      this.keke.maxSpeed = 0; // Freeze driver during accounting settlement

      const grossEarnings = this.passengerManager.dailyEarnings;
      const netProfit = grossEarnings - this.dailyLeaseFee;
      
      let statusMessage = '';
      if (netProfit >= 0) {
        this.bankSavings += netProfit;
        statusMessage = `✅ Lease Paid! Net Profit of ₦${netProfit} added to personal savings.`;
      } else {
        const debt = Math.abs(netProfit);
        statusMessage = `⚠️ Shortfall! You owe the owner ₦${debt} in lease debt. Work harder tomorrow!`;
      }

      this.renderSettlementUI({
        day: this.dayCount,
        gross: grossEarnings,
        lease: this.dailyLeaseFee,
        net: netProfit,
        savings: this.bankSavings,
        status: statusMessage
      });

      if (hudCallback) {
        hudCallback({ type: 'SETTLEMENT_STARTED', msg: `🌙 Shift Ended for Day ${this.dayCount}. Tallying finances...` });
      }
    }
  }

  renderSettlementUI(data) {
    let modal = document.getElementById('settlement-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settlement-modal';
      modal.style.cssText = `
        position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
        width: 380px; background: rgba(10, 10, 15, 0.95); color: #fff;
        padding: 25px; border-radius: 12px; border: 2px solid #4CAF50;
        font-family: monospace; z-index: 100; box-shadow: 0 0 30px rgba(0,255,0,0.3);
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <h2 style="margin-top:0; color:#4CAF50; text-align:center; border-bottom:1px solid #333; padding-bottom:10px;">
        📋 DAY ${data.day} SHIFT SUMMARY
      </h2>
      <div style="line-height: 1.8; font-size: 14px;">
        <div style="display:flex; justify-space-between;"><span>Gross Fares Earned:</span> <strong>₦${data.gross}</strong></div>
        <div style="display:flex; justify-space-between; color:#ff5252;"><span>Kudin Haya (Daily Lease):</span> <strong>-₦${data.lease}</strong></div>
        <hr style="border:0; border-top:1px dashed #444; margin:10px 0;" />
        <div style="display:flex; justify-space-between; font-size:16px; color:#ffcc00;">
          <span>Net Take-Home:</span> <strong>₦${data.net}</strong>
        </div>
        <div style="display:flex; justify-space-between; font-size:14px; color:#00ffff; margin-top:6px;">
          <span>Banked Savings:</span> <strong>₦${data.savings}</strong>
        </div>
      </div>
      <p style="font-size:12px; color:#aaa; margin-top:15px; text-align:center;">${data.status}</p>
      <button id="next-day-btn" style="
        width:100%; margin-top:15px; padding:12px; background:#4CAF50; color:#000;
        font-weight:bold; border:none; border-radius:6px; cursor:pointer; font-size:14px;
      ">
        START DAY ${data.day + 1} SHIFT (6:00 AM)
      </button>
    `;

    modal.style.display = 'block';

    document.getElementById('next-day-btn').addEventListener('click', () => {
      this.advanceToNextDay(modal);
    });
  }

  advanceToNextDay(modal) {
    modal.style.display = 'none';
    this.dayCount += 1;
    this.isSettlementActive = false;

    // Reset daily counters for next shift
    this.passengerManager.dailyEarnings = 0;
    this.fuelManager.fuel = 100;
    this.keke.maxSpeed = 0.8;

    // Reset clock UI to 6:00 AM (360 minutes)
    window.timeInMinutes = 360;

    const earningsEl = document.getElementById('earnings');
    if (earningsEl) earningsEl.innerText = 0;
  }
}