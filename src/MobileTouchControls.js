export function setupMobileControls(inputState) {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) return;

  const touchUI = document.createElement('div');
  touchUI.id = 'mobile-controls-overlay';
  touchUI.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 40;
  `;
  touchUI.innerHTML = `
    <div id="touch-throttle" style="position: absolute; bottom: 40px; right: 40px; width: 90px; height: 90px; background: rgba(255,204,0,0.4); border: 2px solid #ffcc00; border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #000; font-family: monospace; font-size: 14px;">ACCEL</div>
    <div id="touch-brake" style="position: absolute; bottom: 40px; left: 40px; width: 90px; height: 90px; background: rgba(255,50,50,0.4); border: 2px solid #ff5252; border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-family: monospace; font-size: 14px;">BRAKE</div>
    <div id="touch-left" style="position: absolute; bottom: 150px; left: 30px; width: 70px; height: 70px; background: rgba(255,255,255,0.2); border: 1px solid #fff; border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold;">◀</div>
    <div id="touch-right" style="position: absolute; bottom: 150px; left: 110px; width: 70px; height: 70px; background: rgba(255,255,255,0.2); border: 1px solid #fff; border-radius: 50%; pointer-events: auto; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold;">▶</div>
  `;
  document.body.appendChild(touchUI);

  document.getElementById('touch-throttle').addEventListener('touchstart', (e) => { e.preventDefault(); inputState.throttle = 1; });
  document.getElementById('touch-throttle').addEventListener('touchend', (e) => { e.preventDefault(); inputState.throttle = 0; });
  
  document.getElementById('touch-brake').addEventListener('touchstart', (e) => { e.preventDefault(); inputState.throttle = -1; });
  document.getElementById('touch-brake').addEventListener('touchend', (e) => { e.preventDefault(); inputState.throttle = 0; });

  document.getElementById('touch-left').addEventListener('touchstart', (e) => { e.preventDefault(); inputState.steering = 1; });
  document.getElementById('touch-left').addEventListener('touchend', (e) => { e.preventDefault(); inputState.steering = 0; });

  document.getElementById('touch-right').addEventListener('touchstart', (e) => { e.preventDefault(); inputState.steering = -1; });
  document.getElementById('touch-right').addEventListener('touchend', (e) => { e.preventDefault(); inputState.steering = 0; });
}