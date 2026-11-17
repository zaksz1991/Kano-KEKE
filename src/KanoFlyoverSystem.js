import * as THREE from 'three';

/**
 * Kano flyovers / overpasses along major corridors
 * Placement inspired by Zoo Road, Murtala, Gwarzo, Hotoro junctions
 */
export class KanoFlyoverSystem {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assets = assetManager;
    this.templates = [];
    this.instances = [];
    this.ready = false;
    // Spacing between flyovers along Z (route distance)
    this.spacing = 420;
    this._nextZ = 180;
    this.maxVisible = 3;
  }

  async init() {
    if (!this.assets) return;
    this.assets.enableNetwork?.();
    const files = [
      {
        path: '/assets/models/kano_urban_flyover.glb',
        // Lowpoly urban – bounds ~235 wide; scale for dual carriageway
        scale: 0.085,
        y: 0,
        label: 'Kano Urban Flyover'
      },
      {
        path: '/assets/models/kai_tak_flyovers.glb',
        // Large multi-level – scale down hard
        scale: 0.045,
        y: 0,
        label: 'Kano Multi-level Flyover'
      }
    ];
    for (const f of files) {
      try {
        const mesh = await this.assets.loadGLB(f.path, {
          scale: f.scale,
          timeoutMs: 25000
        });
        if (!mesh) continue;
        // Normalize orientation (Sketchfab often Y-up wrong for our Z-forward road)
        mesh.rotation.x = 0;
        mesh.rotation.y = 0;
        this.templates.push({ mesh, scale: f.scale, y: f.y, label: f.label });
        console.log('[Flyover] loaded', f.label);
      } catch (e) {
        console.warn('[Flyover] fail', f.path, e);
      }
    }
    this.ready = this.templates.length > 0;
    if (this.ready) {
      // Seed a few along the route
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
      // Slight yaw variation so they don’t look identical
      mesh.rotation.y = (tplIndex % 2 === 0 ? 0 : Math.PI);
      this.scene.add(mesh);
      this.instances.push({ mesh, z, label: tpl.label });
    } catch (e) {}
  }

  update(playerZ) {
    if (!this.ready) return;
    // Despawn far behind
    this.instances = this.instances.filter((inst) => {
      const dz = inst.z - playerZ;
      if (dz < -180) {
        try {
          this.scene.remove(inst.mesh);
        } catch (e) {}
        return false;
      }
      inst.mesh.visible = Math.abs(dz) < 350;
      return true;
    });
    // Spawn ahead
    while (this._nextZ < playerZ + 500 && this.instances.length < this.maxVisible + 1) {
      this._spawn(this._nextZ, this.instances.length);
      this._nextZ += this.spacing + Math.random() * 80;
    }
  }
}
