import * as THREE from 'three';

/**
 * Sidewalk pedestrians – uses pedestrian.glb when available
 */
export class PedestrianManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.assets = assetManager;
    this.pedestrians = [];
    this.template = null;
    this.ready = false;
    this.maxPeds = /Android|iPhone|Mobile/i.test(navigator.userAgent) ? 6 : 10;
    this._timer = 0;
  }

  async init() {
    this.ready = true;
    try {
      if (this.assets?.enableNetwork) this.assets.enableNetwork();
      this.template = await this.assets.loadGLB('/assets/models/pedestrian.glb', {
        scale: 1.15,
        timeoutMs: 15000
      });
      if (this.template) console.log('[Peds] pedestrian.glb ready');
    } catch (e) {
      console.warn('[Peds]', e);
    }
    for (let i = 0; i < 4; i++) this._spawn(true);
  }

  async initModels() {
    return this.init();
  }

  _makeMesh() {
    if (this.template) {
      try {
        return this.template.clone(true);
      } catch (e) {}
    }
    // Minimal humanoid (only if GLB missing)
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.7 });
    const cloth = new THREE.MeshStandardMaterial({
      color: [0x1565c0, 0xc62828, 0x2e7d32, 0x6a1b9a][Math.floor(Math.random() * 4)],
      roughness: 0.8
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 8), cloth);
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), skin);
    head.position.y = 1.65;
    g.add(head);
    return g;
  }

  _spawn(initial) {
    if (this.pedestrians.length >= this.maxPeds) return;
    const mesh = this._makeMesh();
    const playerZ = this.keke?.group?.position.z || 0;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (10.5 + Math.random() * 2.5);
    const z = initial ? playerZ + 20 + Math.random() * 80 : playerZ + 90 + Math.random() * 60;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    this.pedestrians.push({
      mesh,
      side,
      speed: 0.6 + Math.random() * 0.8,
      baseX: x
    });
  }

  update(delta) {
    if (!this.ready) return;
    const dt = Math.min(delta, 0.05);
    const playerZ = this.keke?.group?.position.z || 0;
    this._timer += dt;
    if (this._timer > 2.5) {
      this._timer = 0;
      this._spawn(false);
    }
    this.pedestrians.forEach((p) => {
      // Walk along roadside in Z
      p.mesh.position.z += p.speed * dt * (Math.random() > 0.5 ? 1 : 0.3);
      p.mesh.position.x = p.baseX + Math.sin(performance.now() * 0.001 + p.baseX) * 0.15;
      p.mesh.visible = Math.abs(p.mesh.position.z - playerZ) < 120;
      if (p.mesh.position.z < playerZ - 40 || p.mesh.position.z > playerZ + 200) {
        p.mesh.position.z = playerZ + 80 + Math.random() * 50;
        p.side = Math.random() > 0.5 ? 1 : -1;
        p.baseX = p.side * (10.5 + Math.random() * 2.5);
        p.mesh.position.x = p.baseX;
        p.mesh.rotation.y = p.side > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
    });
  }
}
