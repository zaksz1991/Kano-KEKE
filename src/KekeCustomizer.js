import * as THREE from 'three';

/**
 * Paint shop + visual upgrades
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
    const hex = this.paintColors[colorKey] ?? colorKey;
    this.upgrades.paint = colorKey;
    this.keke.traverse((n) => {
      if (!n.isMesh || !n.material) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m || !m.color) return;
        // Paint body-like materials (skip very dark rubber/glass)
        const lum = (m.color.r + m.color.g + m.color.b) / 3;
        if (lum > 0.08 && lum < 0.95) {
          m.color.setHex(typeof hex === 'number' ? hex : 0xffcc00);
          m.needsUpdate = true;
        }
      });
    });
  }

  applyNeon(colorHex = 0x00ffff) {
    if (this.upgrades.neon) return;
    [[0, 0.12, 0.9], [0, 0.12, -0.9], [0.65, 0.12, 0], [-0.65, 0.12, 0]].forEach(([x, y, z]) => {
      const light = new THREE.PointLight(colorHex, 2.5, 5.5);
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
    bar.castShadow = true;
    this.keke.add(bar);
  }

  /** Full paint shop modal */
  openShop(earnings, onSpend) {
    const old = document.getElementById('paint-shop-modal');
    if (old) old.remove();

    const m = document.createElement('div');
    m.id = 'paint-shop-modal';
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:125;display:flex;align-items:center;justify-content:center;padding:12px;';

    const swatches = Object.entries(this.paintColors)
      .map(
        ([k, hex]) =>
          `<button data-paint="${k}" style="width:40px;height:40px;border-radius:8px;border:2px solid #fff;background:#${hex.toString(16).padStart(6, '0')};cursor:pointer;margin:3px;"></button>`
      )
      .join('');

    m.innerHTML = `
      <div style="background:#14141c;border:2px solid #ffcc00;border-radius:16px;padding:18px;max-width:320px;width:100%;color:#fff;font-family:system-ui,sans-serif;">
        <h3 style="margin:0 0 10px;color:#ffcc00;text-align:center;">🔧 Garajin Keke Shop</h3>
        <div style="font-size:12px;color:#aaa;margin-bottom:8px;">Cash: ₦${earnings}</div>
        <div style="margin-bottom:10px;">
          <div style="color:#00ffff;font-size:12px;margin-bottom:6px;">PAINT (₦1,500)</div>
          <div style="display:flex;flex-wrap:wrap;">${swatches}</div>
        </div>
        <button id="shop-neon" style="width:100%;margin:4px 0;padding:10px;background:#222;color:#00ffff;border:1px solid #00ffff;border-radius:8px;cursor:pointer;">🚨 Neon Underglow — ₦3,500</button>
        <button id="shop-sub" style="width:100%;margin:4px 0;padding:10px;background:#222;color:#ff9800;border:1px solid #ff9800;border-radius:8px;cursor:pointer;">🔊 Subwoofer — ₦5,000</button>
        <button id="shop-bumper" style="width:100%;margin:4px 0;padding:10px;background:#222;color:#4caf50;border:1px solid #4caf50;border-radius:8px;cursor:pointer;">🛡️ Steel Bumper — ₦6,500</button>
        <button id="shop-close" style="width:100%;margin-top:10px;padding:10px;background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;">Close</button>
      </div>`;
    document.body.appendChild(m);

    m.querySelectorAll('[data-paint]').forEach((btn) => {
      btn.onclick = () => {
        if (onSpend(1500)) {
          this.applyPaint(btn.getAttribute('data-paint'));
        }
      };
    });
    document.getElementById('shop-neon').onclick = () => {
      if (onSpend(3500)) this.applyNeon();
    };
    document.getElementById('shop-sub').onclick = () => {
      if (onSpend(5000)) this.installSubwoofer();
    };
    document.getElementById('shop-bumper').onclick = () => {
      if (onSpend(6500)) this.installBumper();
    };
    document.getElementById('shop-close').onclick = () => m.remove();
  }
}
