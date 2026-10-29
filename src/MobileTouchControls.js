/**
 * Mobile controls – larger steer pads, reliable multi-touch hold
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
    <button type="button" id="touch-throttle" style="position:absolute;bottom:28px;right:18px;width:108px;height:108px;border-radius:50%;border:3px solid #ffcc00;background:rgba(255,200,0,0.8);color:#000;font-weight:900;font-size:15px;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;">ACCEL</button>
    <button type="button" id="touch-brake" style="position:absolute;bottom:28px;left:18px;width:100px;height:100px;border-radius:50%;border:3px solid #ff5252;background:rgba(220,40,40,0.8);color:#fff;font-weight:900;font-size:14px;pointer-events:auto;touch-action:none;user-select:none;">BRAKE</button>
    <button type="button" id="touch-left" style="position:absolute;bottom:145px;left:18px;width:88px;height:88px;border-radius:50%;border:3px solid #fff;background:rgba(30,30,30,0.75);color:#fff;font-size:28px;pointer-events:auto;touch-action:none;user-select:none;">◀</button>
    <button type="button" id="touch-right" style="position:absolute;bottom:145px;left:118px;width:88px;height:88px;border-radius:50%;border:3px solid #fff;background:rgba(30,30,30,0.75);color:#fff;font-size:28px;pointer-events:auto;touch-action:none;user-select:none;">▶</button>
    <button type="button" id="touch-horn" style="position:absolute;bottom:145px;right:18px;width:72px;height:72px;border-radius:50%;border:2px solid #00bcd4;background:rgba(0,150,180,0.8);color:#fff;font-weight:900;font-size:12px;pointer-events:auto;touch-action:none;user-select:none;">HORN</button>
    <button type="button" id="touch-radio" style="position:absolute;bottom:145px;right:100px;width:72px;height:72px;border-radius:50%;border:2px solid #ffcc00;background:rgba(80,60,0,0.8);color:#ffcc00;font-weight:900;font-size:11px;pointer-events:auto;touch-action:none;user-select:none;">RADIO</button>
  `;
  document.body.appendChild(touchUI);

  const hold = (id, on, off) => {
    const el = document.getElementById(id);
    if (!el) return;
    let active = false;
    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      active = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {}
      on();
    };
    const end = (e) => {
      if (!active) return;
      active = false;
      e.preventDefault();
      try {
        el.releasePointerCapture?.(e.pointerId);
      } catch (err) {}
      off();
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    // Do NOT use pointerleave – breaks multi-touch when finger slides slightly
    el.addEventListener('lostpointercapture', end);
  };

  hold('touch-throttle', () => { inputState.throttle = 1; }, () => { inputState.throttle = 0; });
  hold('touch-brake', () => { inputState.throttle = -1; }, () => { inputState.throttle = 0; });
  hold('touch-left', () => { inputState.steering = -1; }, () => { inputState.steering = 0; });
  hold('touch-right', () => { inputState.steering = 1; }, () => { inputState.steering = 0; });
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

  document.getElementById('touch-radio')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRadio) onRadio();
  });
}
