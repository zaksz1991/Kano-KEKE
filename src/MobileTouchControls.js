/**
 * Mobile controls with pointer capture – reliable hold on Android
 */
export function setupMobileControls(inputState, onHorn) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 1024;
  if (!isTouch && !isSmall) return;
  if (document.getElementById('mobile-controls-overlay')) return;

  const touchUI = document.createElement('div');
  touchUI.id = 'mobile-controls-overlay';
  touchUI.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:80;display:none;';
  touchUI.innerHTML = `
    <button type="button" id="touch-throttle" style="position:absolute;bottom:36px;right:24px;width:96px;height:96px;border-radius:50%;border:3px solid #ffcc00;background:rgba(255,200,0,0.7);color:#000;font-weight:900;font-size:14px;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;">ACCEL</button>
    <button type="button" id="touch-brake" style="position:absolute;bottom:36px;left:24px;width:96px;height:96px;border-radius:50%;border:3px solid #ff5252;background:rgba(220,40,40,0.7);color:#fff;font-weight:900;font-size:14px;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;">BRAKE</button>
    <button type="button" id="touch-left" style="position:absolute;bottom:150px;left:24px;width:72px;height:72px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,0.3);color:#fff;font-weight:900;font-size:22px;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;">◀</button>
    <button type="button" id="touch-right" style="position:absolute;bottom:150px;left:108px;width:72px;height:72px;border-radius:50%;border:2px solid #fff;background:rgba(255,255,255,0.3);color:#fff;font-weight:900;font-size:22px;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;">▶</button>
    <button type="button" id="touch-horn" style="position:absolute;bottom:150px;right:24px;width:72px;height:72px;border-radius:50%;border:2px solid #00e5ff;background:rgba(0,180,220,0.55);color:#fff;font-weight:900;font-size:12px;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;">HORN</button>
  `;
  document.body.appendChild(touchUI);

  function bindHold(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      onDown();
    };
    const up = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      onUp();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
  }

  bindHold('touch-throttle', () => { inputState.throttle = 1; }, () => { inputState.throttle = 0; });
  bindHold('touch-brake', () => { inputState.throttle = -1; }, () => { inputState.throttle = 0; });
  bindHold('touch-left', () => { inputState.steering = 1; }, () => { inputState.steering = 0; });
  bindHold('touch-right', () => { inputState.steering = -1; }, () => { inputState.steering = 0; });
  bindHold('touch-horn', () => {
    inputState.horn = true;
    if (typeof onHorn === 'function') onHorn();
  }, () => { inputState.horn = false; });
}
