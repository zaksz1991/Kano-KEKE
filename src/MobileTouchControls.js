/**
 * Mobile controls with pointer capture – reliable hold on Android
 */
export function setupMobileControls(inputState, onHorn, onRadio) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 1024;
  if (!isTouch && !isSmall) return;
  if (document.getElementById('mobile-controls-overlay')) return;

  const touchUI = document.createElement('div');
  touchUI.id = 'mobile-controls-overlay';
  touchUI.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:80;display:none;';
  touchUI.innerHTML = `
    <button type="button" id="touch-throttle" style="position:absolute;bottom:36px;right:24px;width:96px;height:96px;border-radius:50%;border:3px solid #ffcc00;background:rgba(255,200,0,0.75);color:#000;font-weight:900;font-size:14px;pointer-events:auto;touch-action:none;user-select:none;">ACCEL</button>
    <button type="button" id="touch-brake" style="position:absolute;bottom:36px;left:24px;width:96px;height:96px;border-radius:50%;border:3px solid #ff5252;background:rgba(220,40,40,0.75);color:#fff;font-weight:900;font-size:14px;pointer-events:auto;touch-action:none;user-select:none;">BRAKE</button>
    <button type="button" id="touch-left" style="position:absolute;bottom:150px;left:24px;width:70px;height:70px;border-radius:50%;border:2px solid #fff;background:rgba(40,40,40,0.65);color:#fff;font-size:22px;pointer-events:auto;touch-action:none;user-select:none;">◀</button>
    <button type="button" id="touch-right" style="position:absolute;bottom:150px;left:104px;width:70px;height:70px;border-radius:50%;border:2px solid #fff;background:rgba(40,40,40,0.65);color:#fff;font-size:22px;pointer-events:auto;touch-action:none;user-select:none;">▶</button>
    <button type="button" id="touch-horn" style="position:absolute;bottom:150px;right:24px;width:70px;height:70px;border-radius:50%;border:2px solid #00bcd4;background:rgba(0,150,180,0.75);color:#fff;font-weight:900;font-size:12px;pointer-events:auto;touch-action:none;user-select:none;">HORN</button>
    <button type="button" id="touch-radio" style="position:absolute;bottom:150px;right:104px;width:70px;height:70px;border-radius:50%;border:2px solid #ffcc00;background:rgba(80,60,0,0.75);color:#ffcc00;font-weight:900;font-size:11px;pointer-events:auto;touch-action:none;user-select:none;">RADIO</button>
  `;
  document.body.appendChild(touchUI);

  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture?.(e.pointerId); } catch (err) {}
      on();
    };
    const end = (e) => {
      e.preventDefault();
      off();
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  };

  hold('touch-throttle', () => { inputState.throttle = 1; }, () => { inputState.throttle = 0; });
  hold('touch-brake', () => { inputState.throttle = -1; }, () => { inputState.throttle = 0; });
  hold('touch-left', () => { inputState.steering = 1; }, () => { inputState.steering = 0; });
  hold('touch-right', () => { inputState.steering = -1; }, () => { inputState.steering = 0; });
  hold(
    'touch-horn',
    () => {
      inputState.horn = true;
      if (onHorn) onHorn();
    },
    () => {
      inputState.horn = false;
    }
  );

  const radioBtn = document.getElementById('touch-radio');
  if (radioBtn) {
    radioBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onRadio) onRadio();
    });
  }
}
