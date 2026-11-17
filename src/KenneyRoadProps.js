import * as THREE from 'three';

/**
 * Kenney city-kit road props (GLB) – poles, lights, cones, barriers, dumpsters
 * Paths under /assets/models/roads/kenney/
 */
export class KenneyRoadProps {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.templates = {};
    this.props = [];
    this.maxProps = /Android|iPhone|Mobile/i.test(navigator.userAgent) ? 8 : 14;
    this._until = 0;
    this.ready = false;
  }

  async init() {
    if (!this.assets) return;
    this.assets.enableNetwork?.();
    const files = [
      ['pole', '/assets/models/roads/kenney/electricity-pole.glb', 1.0],
      ['light', '/assets/models/roads/kenney/light-square.glb', 1.0],
      ['light2', '/assets/models/roads/kenney/light-curved.glb', 1.0],
      ['cone', '/assets/models/roads/kenney/construction-cone.glb', 1.0],
      ['barrier', '/assets/models/roads/kenney/construction-barrier.glb', 1.0],
      ['dumpster', '/assets/models/roads/kenney/dumpster.glb', 1.0],
      ['stop', '/assets/models/roads/kenney/road-sign-object-stop.glb', 1.0],
      ['crossing', '/assets/models/roads/kenney/road-crossing.glb', 1.2]
    ];
    for (const [key, path, scale] of files) {
      try {
        const m = await this.assets.loadGLB(path, { scale, timeoutMs: 10000 });
        if (m) this.templates[key] = m;
      } catch (e) {}
    }
    this.ready = Object.keys(this.templates).length > 0;
    if (this.ready) {
      for (let i = 0; i < 5; i++) this._spawn(40 + i * 70);
      this._until = 40 + 5 * 70;
      console.log('[Kenney] props ready', Object.keys(this.templates));
    }
  }

  _pickKey() {
    const keys = Object.keys(this.templates);
    if (!keys.length) return null;
    // Prefer poles/lights
    const weighted = [
      'pole', 'pole', 'light', 'light2', 'cone', 'barrier', 'dumpster', 'stop', 'crossing'
    ].filter((k) => this.templates[k]);
    return weighted[Math.floor(Math.random() * weighted.length)] || keys[0];
  }

  _spawn(z) {
    if (this.props.length >= this.maxProps) return;
    const key = this._pickKey();
    if (!key) return;
    try {
      const mesh = this.templates[key].clone(true);
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (9.8 + Math.random() * 2.2);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.scene.add(mesh);
      this.props.push({ mesh, z, key });
    } catch (e) {}
  }

  update(playerZ) {
    if (!this.ready) return;
    // recycle
    this.props = this.props.filter((p) => {
      if (Math.abs(p.z - playerZ) > 220) {
        try {
          this.scene.remove(p.mesh);
        } catch (e) {}
        return false;
      }
      p.mesh.visible = Math.abs(p.z - playerZ) < 160;
      return true;
    });
    while (this._until < playerZ + 200 && this.props.length < this.maxProps) {
      this._until += 45 + Math.random() * 40;
      this._spawn(this._until);
    }
  }
}
