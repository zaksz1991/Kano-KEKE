/**
 * Mobile controls – hold flags polled every frame (most reliable on Android)
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
    <button type="button" id="touch-throttle" style="position:absolute;bottom:28px;right:18px;width:110px;height:110px;border-radius:50%;border:3px solid #ffcc00;background:rgba(255,200,0,0.85);color:#000;font-weight:900;font-size:15px;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;">ACCEL</button>
    <button type="button" id="touch-brake" style="position:absolute;bottom:28px;left:18px;width:100px;height:100px;border-radius:50%;border:3px solid #ff5252;background:rgba(220,40,40,0.85);color:#fff;font-weight:900;font-size:14px;pointer-events:auto;touch-action:none;user-select:none;">BRAKE</button>
    <button type="button" id="touch-left" style="position:absolute;bottom:145px;left:18px;width:88px;height:88px;border-radius:50%;border:3px solid #fff;background:rgba(30,30,30,0.8);color:#fff;font-size:28px;pointer-events:auto;touch-action:none;user-select:none;">◀</button>
    <button type="button" id="touch-right" style="position:absolute;bottom:145px;left:118px;width:88px;height:88px;border-radius:50%;border:3px solid #fff;background:rgba(30,30,30,0.8);color:#fff;font-size:28px;pointer-events:auto;touch-action:none;user-select:none;">▶</button>
    <button type="button" id="touch-horn" style="position:absolute;bottom:145px;right:18px;width:72px;height:72px;border-radius:50%;border:2px solid #00bcd4;background:rgba(0,150,180,0.85);color:#fff;font-weight:900;font-size:12px;pointer-events:auto;touch-action:none;user-select:none;">HORN</button>
    <button type="button" id="touch-radio" style="position:absolute;bottom:145px;right:100px;width:72px;height:72px;border-radius:50%;border:2px solid #ffcc00;background:rgba(80,60,0,0.85);color:#ffcc00;font-weight:900;font-size:11px;pointer-events:auto;touch-action:none;user-select:none;">RADIO</button>
  `;
  document.body.appendChild(touchUI);

  // Persistent hold flags (survive pointer quirks)
  const hold = { accel: false, brake: false, left: false, right: false, horn: false };

  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => {
      e.preventDefault();
      e.stopPropagation();
      hold[key] = true;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      sync();
    };
    const off = (e) => {
      hold[key] = false;
      try { el.releasePointerCapture?.(e.pointerId); } catch (err) {}
      sync();
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
  };

  const sync = () => {
    if (hold.accel) inputState.throttle = 1;
    else if (hold.brake) inputState.throttle = -1;
    else inputState.throttle = 0;

    if (hold.left && !hold.right) inputState.steering = -1;
    else if (hold.right && !hold.left) inputState.steering = 1;
    else inputState.steering = 0;

    inputState.horn = hold.horn;
  };

  // Re-sync every frame from hold flags (fixes lost pointerup / stuck zero)
  const poll = () => {
    sync();
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);

  bind('touch-throttle', 'accel');
  bind('touch-brake', 'brake');
  bind('touch-left', 'left');
  bind('touch-right', 'right');
  bind('touch-horn', 'horn');

  document.getElementById('touch-radio')?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (onRadio) onRadio();
  });

  // Expose for debug
  window.__kanoHold = hold;
  window.__kanoInput = inputState;
}
