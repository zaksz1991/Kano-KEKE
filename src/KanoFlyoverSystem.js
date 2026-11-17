import * as THREE from 'three';

/**
 * Kano flyovers along major corridors
 * Zoo Road, Murtala, Gwarzo, Hotoro, Farm Centre, Sabon Gari
 */
export class KanoFlyoverSystem {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.templates = [];
    this.instances = [];
    this.ready = false;
    this.spacing = 420;
    this._nextZ = 180;
    this.maxVisible = 3;
    this.corridorNames = [
      'Zoo Road Flyover',
      'Murtala Mohammed Way',
      'Gwarzo Road Overpass',
      'Hotoro Junction',
      'Farm Centre Link',
      'Sabon Gari Approach'
    ];
    this._nameIdx = 0;
    this._lastAnnounce = 0;
  }

  async init() {
    if (!this.assets) return;
    this.assets.enableNetwork?.();
    const files = [
      {
        path: '/assets/models/kano_urban_flyover.glb',
        scale: 0.095,
        y: 0.2,
        label: 'Urban'
      },
      {
        path: '/assets/models/kai_tak_flyovers.glb',
        scale: 0.038,
        y: 0.15,
        label: 'Multi-level'
      }
    ];
    for (const f of files) {
      try {
        const mesh = await this.assets.loadGLB(f.path, {
          scale: f.scale,
          timeoutMs: 25000
        });
        if (!mesh) continue;
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;
        this.templates.push({ mesh, y: f.y, label: f.label });
        console.log('[Flyover] loaded', f.label);
      } catch (e) {
        console.warn('[Flyover] fail', f.path, e);
      }
    }
    this.ready = this.templates.length > 0;
    if (this.ready) {
      this._spawn(120, 0);
      this._spawn(120 + this.spacing, 1);
      this._nextZ = 120 + this.spacing * 2;
    }
  }

  _spawn(z, tplIndex) {
    if (!this.templates.length) return;
    const tpl = this.templates[tplIndex % this.templates.length];
    try {
      const mesh = tpl.mesh.clone(true);
      mesh.position.set(0, tpl.y, z);
      mesh.rotation.y = tplIndex % 2 === 0 ? 0 : Math.PI;
      this.scene.add(mesh);
      const name = this.corridorNames[this._nameIdx % this.corridorNames.length];
      this._nameIdx++;
      this.instances.push({ mesh, z, label: tpl.label, name });
    } catch (e) {}
  }

  update(playerZ) {
    if (!this.ready) return;
    this.instances = this.instances.filter((inst) => {
      const dz = inst.z - playerZ;
      if (dz < -180) {
        try {
          this.scene.remove(inst.mesh);
        } catch (e) {}
        return false;
      }
      inst.mesh.visible = Math.abs(dz) < 350;
      if (dz > 40 && dz < 95 && performance.now() - this._lastAnnounce > 14000) {
        this._lastAnnounce = performance.now();
        try {
          window.showBanner?.('🛤️ ' + (inst.name || 'Kano flyover') + ' ahead');
        } catch (e) {}
      }
      return true;
    });
    while (this._nextZ < playerZ + 500 && this.instances.length < this.maxVisible + 1) {
      this._spawn(this._nextZ, this.instances.length);
      this._nextZ += this.spacing + Math.random() * 80;
    }
  }
}
