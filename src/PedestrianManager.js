import * as THREE from 'three';

/**
 * Living Pedestrian System for Kano streets
 * - Uses real pedestrian.glb when available
 * - Sidewalk walking + occasional road crossing
 * - Simple avoidance of the player keke
 * - Object pooling + recycling
 */
export class PedestrianManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.player = kekeController;
    this.assets = assetManager;
    this.pedestrians = [];
    this.maxPeds = 18;
    this.model = null;
    this.ready = false;
  }

  async init() {
    for (let i = 0; i < this.maxPeds; i++) {
      this._spawn(true);
    }
    this.ready = true;
    // Optional real model later
    this.assets.loadGLB('/assets/models/pedestrian.glb', { scale: 1.0, castShadow: true })
      .then((m) => { if (m) this.model = m; })
      .catch(() => {});
  }

  _createFallback() {
    const g = new THREE.Group();
    // Simple stylized person
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 })
    );
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.7 })
    );
    head.position.y = 1.65;
    head.castShadow = true;
    g.add(head);

    // Random clothing colour
    const colors = [0x1565c0, 0xc62828, 0x2e7d32, 0x6a1b9a, 0xef6c00, 0x00838f];
    body.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
    return g;
  }

  _spawn(initial = false) {
    let mesh;
    if (this.model) {
      mesh = this.model.clone(true);
      // Random slight scale variation
      const s = 0.92 + Math.random() * 0.18;
      mesh.scale.setScalar(s);
    } else {
      mesh = this._createFallback();
    }

    const playerZ = this.player?.group?.position.z || 0;
    const side = Math.random() > 0.5 ? 1 : -1;
    const sidewalkX = side * (7.2 + Math.random() * 2.5);

    const z = initial
      ? playerZ - 30 + Math.random() * 220
      : playerZ + 80 + Math.random() * 140;

    mesh.position.set(sidewalkX, 0, z);
    mesh.rotation.y = Math.random() > 0.5 ? 0 : Math.PI; // face along road

    // State machine
    const state = {
      mesh,
      side,
      sidewalkX,
      speed: 1.1 + Math.random() * 1.4,          // m/s walk speed
      dir: Math.random() > 0.5 ? 1 : -1,         // along Z
      state: 'walk',                             // walk | cross | wait
      crossProgress: 0,
      targetX: sidewalkX,
      waitTimer: 0,
      bobPhase: Math.random() * Math.PI * 2
    };

    this.scene.add(mesh);
    this.pedestrians.push(state);
  }

  update(delta) {
    if (!this.ready) return;
    const dt = Math.min(delta, 0.05);
    const playerPos = this.player.group.position;
    const playerSpeed = this.player.currentSpeed || 0;

    this.pedestrians.forEach((p) => {
      const mesh = p.mesh;

      // --- Simple state machine ---
      if (p.state === 'walk') {
        // Walk along sidewalk
        mesh.position.z += p.dir * p.speed * dt;

        // Occasional desire to cross
        if (Math.random() < 0.0008 * (60 * dt) && Math.abs(mesh.position.z - playerPos.z) > 12) {
          p.state = 'cross';
          p.targetX = -p.sidewalkX; // opposite sidewalk
          p.crossProgress = 0;
          // Face the road
          mesh.rotation.y = p.sidewalkX > 0 ? -Math.PI / 2 : Math.PI / 2;
        }

        // Face travel direction
        if (p.state === 'walk') {
          mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
        }
      } else if (p.state === 'cross') {
        // Cross the road
        const crossSpeed = 1.6;
        const dx = p.targetX - mesh.position.x;
        const step = Math.sign(dx) * crossSpeed * dt;
        if (Math.abs(dx) < 0.15) {
          mesh.position.x = p.targetX;
          p.sidewalkX = p.targetX;
          p.side = Math.sign(p.targetX);
          p.state = 'walk';
          mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
        } else {
          mesh.position.x += step;
        }

        // Avoid player while crossing – freeze briefly if keke is very close
        const dist = mesh.position.distanceTo(playerPos);
        if (dist < 4.5 && playerSpeed > 2) {
          // step back a little
          mesh.position.x -= step * 0.7;
        }
      }

      // Subtle walk bob
      p.bobPhase += dt * 8 * p.speed;
      mesh.position.y = Math.abs(Math.sin(p.bobPhase)) * 0.04;

      // Avoid player on sidewalk (gentle push)
      const distXZ = Math.hypot(mesh.position.x - playerPos.x, mesh.position.z - playerPos.z);
      if (distXZ < 3.5 && p.state === 'walk') {
        const push = (3.5 - distXZ) * 0.8;
        mesh.position.x += Math.sign(mesh.position.x - playerPos.x) * push * dt * 4;
      }

      // Recycle far pedestrians
      if (mesh.position.z < playerPos.z - 50 || mesh.position.z > playerPos.z + 200) {
        mesh.position.z = playerPos.z + 90 + Math.random() * 100;
        mesh.position.x = p.sidewalkX;
        p.state = 'walk';
        p.dir = Math.random() > 0.45 ? 1 : -1;
      }
    });
  }
}
