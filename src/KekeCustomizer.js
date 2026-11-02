import * as THREE from 'three';

/**
 * Paint shop + visual upgrades – tints real keke.glb materials
 */
export class KekeCustomizer {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;
    this.upgrades = { neon: false, subwoofer: false, bumper: false, paint: 'yellow' };
    this.neonLights = [];
    this.paintColors = {
      yellow: 0xffcc00,
      green: 0x2e7d32,
      black: 0x212121,
      red: 0xc62828,
      blue: 0x1565c0,
      gold: 0xffd700,
      white: 0xf5f5f5,
      purple: 0x6a1b9a
    };
  }

  applyPaint(colorKey) {
    const hex = this.paintColors[colorKey] ?? (typeof colorKey === 'number' ? colorKey : 0xffcc00);
    this.upgrades.paint = colorKey;
    this.keke.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m || !m.color) return;
        // Skip pure black rubber and pure white glass-ish
        const r = m.color.r, g = m.color.g, b = m.color.b;
        const lum = (r + g + b) / 3;
        const isDarkRubber = lum < 0.07;
        const isChrome = (m.metalness || 0) > 0.7 && lum > 0.5;
        if (isDarkRubber || isChrome) return;
        m.color.setHex(hex);
        if (m.emissive && lum > 0.3) {
          // keep slight warmth
        }
        m.needsUpdate = true;
      });
    });
  }

  applyNeon(colorHex = 0x00ffff) {
    if (this.upgrades.neon) return;
    [[0, 0.12, 0.9], [0, 0.12, -0.9], [0.65, 0.12, 0], [-0.65, 0.12, 0]].forEach(([x, y, z]) => {
      const light = new THREE.PointLight(colorHex, 2.2, 5);
      light.position.set(x, y, z);
      this.keke.add(light);
      this.neonLights.push(light);
    });
    this.upgrades.neon = true;
  }

  installNeon(c) {
    this.applyNeon(c);
  }

  installSubwoofer() {
    this.upgrades.subwoofer = true;
  }

  installBumper() {
    if (this.upgrades.bumper) return;
    this.upgrades.bumper = true;
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.55, 8),
      new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.85, roughness: 0.3 })
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.35, 1.35);
    this.keke.add(bar);
  }

  openShop(earnings, onSpend) {
    const old = document.getElementById('paint-shop-modal');
    if (old) old.remove();

    const m = document.createElement('div');
    m.id = 'paint-shop-modal';
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:125;display:flex;align-items:center;justify-content:center;padding:12px;';

    const swatches = Object.entries(this.paintColors)
      .map(
        ([k, hex]) =>
          `<button type="button" data-paint="${k}" title="${k}" style="width:44px;height:44px;border-radius:10px;border:2px solid #fff;background:#${hex
            .toString(16)
            .padStart(6, '0')};cursor:pointer;margin:4px;"></button>`
      )
      .join('');

    m.innerHTML = `
      <div style="background:#14141c;border:2px solid #ffcc00;border-radius:16px;padding:18px;max-width:320px;width:100%;color:#fff;font-family:system-ui,sans-serif;">
        <h3 style="margin:0 0 8px;color:#ffcc00;text-align:center;">🔧 Garajin Keke</h3>
        <div style="font-size:13px;color:#4caf50;margin-bottom:10px;text-align:center;">Cash: ₦${earnings}</div>
        <div style="margin-bottom:12px;">
          <div style="color:#00e5ff;font-size:11px;letter-spacing:1px;margin-bottom:6px;">PAINT — ₦1,000</div>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;">${swatches}</div>
        </div>
        <button type="button" id="shop-neon" style="width:100%;margin:4px 0;padding:12px;background:#222;color:#00ffff;border:1px solid #00ffff;border-radius:8px;cursor:pointer;font-weight:700;">Neon Underglow — ₦3,500</button>
        <button type="button" id="shop-sub" style="width:100%;margin:4px 0;padding:12px;background:#222;color:#ff9800;border:1px solid #ff9800;border-radius:8px;cursor:pointer;font-weight:700;">Subwoofer — ₦5,000</button>
        <button type="button" id="shop-bumper" style="width:100%;margin:4px 0;padding:12px;background:#222;color:#81c784;border:1px solid #81c784;border-radius:8px;cursor:pointer;font-weight:700;">Steel Bumper — ₦6,500</button>
        <button type="button" id="shop-close" style="width:100%;margin-top:10px;padding:10px;background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;">Close</button>
      </div>`;

    document.body.appendChild(m);

    const spend = (cost) => {
      if (typeof onSpend === 'function') return onSpend(cost);
      return false;
    };

    m.querySelectorAll('[data-paint]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const key = btn.getAttribute('data-paint');
        if (spend(1000)) {
          this.applyPaint(key);
          btn.style.outline = '3px solid #ffcc00';
        }
      };
    });

    m.querySelector('#shop-neon')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.upgrades.neon) return;
      if (spend(3500)) this.applyNeon();
    });
    m.querySelector('#shop-sub')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (spend(5000)) this.installSubwoofer();
    });
    m.querySelector('#shop-bumper')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (spend(6500)) this.installBumper();
    });
    m.querySelector('#shop-close')?.addEventListener('click', () => m.remove());
    m.addEventListener('click', (e) => {
      if (e.target === m) m.remove();
    });
  }
}
