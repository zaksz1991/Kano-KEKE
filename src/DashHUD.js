/**
 * In-run dash HUD – speed, fuel, seats, fares, mission mini-bar
 */
export class DashHUD {
  constructor() {
    this.root = null;
    this._build();
  }

  _build() {
    if (document.getElementById('dash-hud')) {
      this.root = document.getElementById('dash-hud');
      return;
    }
    const el = document.createElement('div');
    el.id = 'dash-hud';
    el.style.cssText = `
      position:fixed;top:0;left:0;right:0;z-index:50;pointer-events:none;
      display:none;font-family:system-ui,sans-serif;
      background:linear-gradient(180deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.15) 70%,rgba(0,0,0,0) 100%);
      padding:10px 12px 28px;color:#fff;
    `;
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div>
          <div id="dash-route" style="font-size:11px;color:#00e5ff;letter-spacing:0.5px;">ROUTE</div>
          <div id="dash-cash" style="font-size:20px;font-weight:900;color:#ffcc00;">₦0</div>
          <div id="dash-seats" style="font-size:12px;color:#b0bec5;margin-top:2px;">Seats 0/3</div>
          <div id="dash-timer" style="font-size:11px;color:#90caf9;margin-top:2px;">Shift 0:00</div>
          <div id="dash-rate" style="font-size:10px;color:#a5d6a7;">₦0/min</div>
        </div>
        <div style="text-align:center;">
          <div id="dash-speed" style="font-size:32px;font-weight:900;line-height:1;color:#ffcc00;">0</div>
          <div style="font-size:10px;color:#90a4ae;">km/h</div>
        </div>
        <div style="text-align:right;min-width:90px;">
          <div style="font-size:10px;color:#90a4ae;">FUEL</div>
          <div style="width:90px;height:8px;background:#333;border-radius:4px;overflow:hidden;margin-top:4px;">
            <div id="dash-fuel" style="width:100%;height:100%;background:linear-gradient(90deg,#4caf50,#ffeb3b,#f44336);transform-origin:left;transform:scaleX(1);"></div>
          </div>
          <div id="dash-lives" style="font-size:14px;margin-top:6px;">❤❤❤</div>
        </div>
      </div>
      <div id="dash-missions" style="margin-top:8px;font-size:11px;color:#ffe082;white-space:pre-line;opacity:0.95;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
        <div id="dash-notice" style="font-size:12px;color:#80cbc4;min-height:16px;"></div>
        <div id="dash-weather" style="font-size:11px;color:#ffe082;background:rgba(0,0,0,0.4);padding:2px 8px;border-radius:8px;">☀ Clear</div>
      </div>
      <div id="dash-fare-pop" style="position:absolute;right:16px;top:70px;font-size:22px;font-weight:900;color:#4caf50;opacity:0;transition:opacity 0.3s, transform 0.3s;transform:translateY(8px);">+₦0</div>
    `;
    document.body.appendChild(el);
    this.root = el;
  }

  show() {
    if (this.root) this.root.style.display = 'block';
  }

  hide() {
    if (this.root) this.root.style.display = 'none';
  }

  update(args) {
    const now = performance.now();
    if (this._lastHud && now - this._lastHud < 100) return;
    this._lastHud = now;
    this._apply(args);
  }

  _apply({
    speed = 0,
    cash = 0,
    fuel = 100,
    seatsUsed = 0,
    seatsMax = 3,
    lives = 3,
    route = '',
    missionsText = '',
    notice = null,
    weather = null,
    shiftTime = 0,
    startCash = 0
  }) {
    if (!this.root) return;
    const spd = document.getElementById('dash-speed');
    const cashEl = document.getElementById('dash-cash');
    const fuelEl = document.getElementById('dash-fuel');
    const seats = document.getElementById('dash-seats');
    const livesEl = document.getElementById('dash-lives');
    const routeEl = document.getElementById('dash-route');
    const miss = document.getElementById('dash-missions');
    if (spd) spd.textContent = String(Math.round(Math.abs(speed)));
    if (cashEl) cashEl.textContent = `₦${Math.round(cash)}`;
    if (fuelEl) fuelEl.style.transform = `scaleX(${Math.max(0, Math.min(1, fuel / 100))})`;
    
    if (seats) seats.textContent = `Seats ${seatsUsed}/${seatsMax}`;
    const timerEl = document.getElementById('dash-timer');
    if (timerEl) {
      const m = Math.floor(shiftTime / 60);
      const s = Math.floor(shiftTime % 60);
      timerEl.textContent = `Shift ${m}:${s.toString().padStart(2, '0')}`;
    }
    const rateEl = document.getElementById('dash-rate');
    if (rateEl && shiftTime > 5) {
      const earned = Math.max(0, cash - startCash);
      const perMin = Math.round((earned / shiftTime) * 60);
      rateEl.textContent = `₦${perMin}/min`;
    }
    if (livesEl) livesEl.textContent = '❤'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
    if (routeEl && route) routeEl.textContent = route;
    if (miss && missionsText) miss.textContent = missionsText;
    if (weather) {
      const w = document.getElementById('dash-weather');
      if (w) {
        const icons = { CLEAR: '☀ Clear', RAIN: '🌧 Rain', HARMATTAN: '🌪 Harmattan', CLOUDY: '☁ Cloudy' };
        w.textContent = icons[weather] || ('· ' + weather);
      }
    }
    if (notice != null && notice !== '') {
      const n = document.getElementById('dash-notice');
      if (n) n.textContent = notice;
      // Fare pop only for cash gain strings – status line stays
      if (String(notice).startsWith('+₦')) {
        const pop = document.getElementById('dash-fare-pop');
        if (pop) {
          pop.textContent = notice;
          pop.style.opacity = '1';
          pop.style.transform = 'translateY(0)';
          clearTimeout(this._fareT);
          this._fareT = setTimeout(() => {
            pop.style.opacity = '0';
            pop.style.transform = 'translateY(8px)';
          }, 1500);
        }
      }
    }
  }
}
