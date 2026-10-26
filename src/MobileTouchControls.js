/**
 * Mobile Touch Controls for Kano Run
 * Throttle / Brake / Steer + Horn button
 */
export function setupMobileControls(inputState, onHorn) {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) return;

  const touchUI = document.createElement('div');
  touchUI.id = 'mobile-controls-overlay';
  touchUI.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 40;
  `;
  touchUI.innerHTML = `
    <div id="touch-throttle" style="position:absolute;bottom:40px;right:30px;width:88px;height:88px;background:rgba(255,204,0,0.45);border:2px solid #ffcc00;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#000;font-size:13px;user-select:none;">ACCEL</div>
    <div id="touch-brake" style="position:absolute;bottom:40px;left:30px;width:88px;height:88px;background:rgba(255,50,50,0.45);border:2px solid #ff5252;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:13px;user-select:none;">BRAKE</div>
    <div id="touch-left" style="position:absolute;bottom:145px;left:25px;width:68px;height:68px;background:rgba(255,255,255,0.22);border:1px solid #fff;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px;user-select:none;">◀</div>
    <div id="touch-right" style="position:absolute;bottom:145px;left:105px;width:68px;height:68px;background:rgba(255,255,255,0.22);border:1px solid #fff;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px;user-select:none;">▶</div>
    <div id="touch-horn" style="position:absolute;bottom:145px;right:30px;width:68px;height:68px;background:rgba(0,200,255,0.35);border:2px solid #00e5ff;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;user-select:none;">HORN</div>
  `;
  touchUI.style.display = 'none'; // shown only after START SHIFT
  document.body.appendChild(touchUI);

  const bind = (id, startFn, endFn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); startFn(); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); endFn(); }, { passive: false });
    el.addEventListener('touchcancel', (e) => { e.preventDefault(); endFn(); }, { passive: false });
  };

  bind('touch-throttle', () => { inputState.throttle = 1; }, () => { inputState.throttle = 0; });
  bind('touch-brake', () => { inputState.throttle = -1; }, () => { inputState.throttle = 0; });
  bind('touch-left', () => { inputState.steering = 1; }, () => { inputState.steering = 0; });
  bind('touch-right', () => { inputState.steering = -1; }, () => { inputState.steering = 0; });
  bind('touch-horn', () => {
    inputState.horn = true;
    if (typeof onHorn === 'function') onHorn();
  }, () => { inputState.horn = false; });
}
