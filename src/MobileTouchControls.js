/**
 * Mobile Touch Controls – touch + pointer events for all devices
 */
export function setupMobileControls(inputState, onHorn) {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // Always create on mobile-sized screens too
  const isSmall = window.innerWidth < 900;
  if (!isTouchDevice && !isSmall) return;

  if (document.getElementById('mobile-controls-overlay')) return;

  const touchUI = document.createElement('div');
  touchUI.id = 'mobile-controls-overlay';
  touchUI.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 40; display: none;
  `;
  touchUI.innerHTML = `
    <div id="touch-throttle" style="position:absolute;bottom:40px;right:30px;width:88px;height:88px;background:rgba(255,204,0,0.55);border:2px solid #ffcc00;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#000;font-size:13px;user-select:none;-webkit-user-select:none;touch-action:none;">ACCEL</div>
    <div id="touch-brake" style="position:absolute;bottom:40px;left:30px;width:88px;height:88px;background:rgba(255,50,50,0.55);border:2px solid #ff5252;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:13px;user-select:none;-webkit-user-select:none;touch-action:none;">BRAKE</div>
    <div id="touch-left" style="position:absolute;bottom:145px;left:25px;width:68px;height:68px;background:rgba(255,255,255,0.28);border:1px solid #fff;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px;user-select:none;-webkit-user-select:none;touch-action:none;">◀</div>
    <div id="touch-right" style="position:absolute;bottom:145px;left:105px;width:68px;height:68px;background:rgba(255,255,255,0.28);border:1px solid #fff;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:18px;user-select:none;-webkit-user-select:none;touch-action:none;">▶</div>
    <div id="touch-horn" style="position:absolute;bottom:145px;right:30px;width:68px;height:68px;background:rgba(0,200,255,0.45);border:2px solid #00e5ff;border-radius:50%;pointer-events:auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:12px;user-select:none;-webkit-user-select:none;touch-action:none;">HORN</div>
  `;
  document.body.appendChild(touchUI);

  const bind = (id, startFn, endFn) => {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => { e.preventDefault(); e.stopPropagation(); startFn(); };
    const up = (e) => { e.preventDefault(); e.stopPropagation(); endFn(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
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
