/**
 * In-game pause overlay
 */
export class PauseMenu {
  constructor({ onResume, onEndShift, onCamera, onGarage }) {
    this.onResume = onResume;
    this.onEndShift = onEndShift;
    this.onCamera = onCamera;
    this.onGarage = onGarage;
    this.root = null;
  }

  show() {
    if (this.root) {
      this.root.style.display = 'flex';
      return;
    }
    const m = document.createElement('div');
    m.id = 'pause-menu';
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:140;display:flex;align-items:center;justify-content:center;';
    m.innerHTML = `
      <div style="background:#14141c;border:2px solid #ffcc00;border-radius:16px;padding:22px;width:min(300px,90vw);text-align:center;color:#fff;font-family:system-ui;">
        <h2 style="margin:0 0 14px;color:#ffcc00;letter-spacing:2px;">PAUSED</h2>
        <button data-act="resume" style="width:100%;margin:5px 0;padding:12px;border:none;border-radius:10px;font-weight:900;background:#ffcc00;color:#000;cursor:pointer;">RESUME</button>
        <button data-act="camera" style="width:100%;margin:5px 0;padding:12px;border:1px solid #00e5ff;border-radius:10px;font-weight:700;background:#1a2a30;color:#00e5ff;cursor:pointer;">CAMERA MODE</button>
        <button data-act="garage" style="width:100%;margin:5px 0;padding:12px;border:1px solid #ff9800;border-radius:10px;font-weight:700;background:#2a2010;color:#ff9800;cursor:pointer;">GARAGE</button>
        <button data-act="end" style="width:100%;margin:5px 0;padding:12px;border:none;border-radius:10px;font-weight:700;background:#333;color:#fff;cursor:pointer;">END SHIFT</button>
      </div>`;
    m.querySelectorAll('button').forEach((btn) => {
      btn.onclick = () => {
        const a = btn.getAttribute('data-act');
        if (a === 'resume') {
          this.hide();
          this.onResume?.();
        } else if (a === 'camera') this.onCamera?.();
        else if (a === 'garage') this.onGarage?.();
        else if (a === 'end') {
          this.hide();
          this.onEndShift?.();
        }
      };
    });
    document.body.appendChild(m);
    this.root = m;
  }

  hide() {
    if (this.root) this.root.style.display = 'none';
  }

  isOpen() {
    return this.root && this.root.style.display !== 'none';
  }
}
