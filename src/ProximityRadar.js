/**
 * Minimal proximity radar – nearest passenger / fuel / checkpoint
 */
export class ProximityRadar {
  constructor() {
    this.el = null;
    this._build();
  }

  _build() {
    if (document.getElementById('prox-radar')) {
      this.el = document.getElementById('prox-radar');
      return;
    }
    const el = document.createElement('div');
    el.id = 'prox-radar';
    el.style.cssText = `
      position:fixed;right:12px;top:50%;transform:translateY(-50%);
      width:72px;height:72px;border-radius:50%;
      background:rgba(0,0,0,0.55);border:2px solid rgba(0,229,255,0.4);
      z-index:48;display:none;pointer-events:none;
    `;
    el.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:8px;height:8px;background:#ffcc00;border-radius:50%;"></div>
      </div>
      <div id="radar-blip" style="position:absolute;width:8px;height:8px;border-radius:50%;background:#00e676;display:none;"></div>
      <div id="radar-label" style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font:10px system-ui;color:#80deea;white-space:nowrap;"></div>
    `;
    document.body.appendChild(el);
    this.el = el;
  }

  show() {
    if (this.el) this.el.style.display = 'block';
  }

  hide() {
    if (this.el) this.el.style.display = 'none';
  }

  /**
   * targets: [{ x, z, type: 'passenger'|'fuel'|'checkpoint' }]
   * player: { x, z, rotY }
   */
  update(player, targets = []) {
    if (!this.el) return;
    const blip = document.getElementById('radar-blip');
    const label = document.getElementById('radar-label');
    if (!blip) return;

    let nearest = null;
    let best = 80;
    for (const t of targets) {
      const dx = t.x - player.x;
      const dz = t.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d < best) {
        best = d;
        nearest = { ...t, dx, dz, d };
      }
    }

    if (!nearest || best > 70) {
      blip.style.display = 'none';
      if (label) label.textContent = '';
      return;
    }

    // Map to radar circle (radius ~30px from center)
    const scale = 28 / 70;
    // Rotate into player local space
    const cos = Math.cos(-player.rotY);
    const sin = Math.sin(-player.rotY);
    const lx = nearest.dx * cos - nearest.dz * sin;
    const lz = nearest.dx * sin + nearest.dz * cos;
    const px = 36 + lx * scale;
    const py = 36 - lz * scale;
    blip.style.display = 'block';
    blip.style.left = `${Math.max(4, Math.min(60, px))}px`;
    blip.style.top = `${Math.max(4, Math.min(60, py))}px`;
    const colors = { passenger: '#00e676', fuel: '#ffeb3b', checkpoint: '#ff5252' };
    blip.style.background = colors[nearest.type] || '#00e676';
    if (label) {
      const names = { passenger: 'Passenger', fuel: 'PMS', checkpoint: 'KAROTA' };
      label.textContent = `${names[nearest.type] || nearest.type} ${Math.round(best)}m`;
    }
  }
}
