import * as THREE from 'three';

/**
 * KAROTA – procedural only, no GLB
 */
export class PoliceCheckpointEngine {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.checkpoints = [];
    this.chase = null;
    this._spawnedUntil = 400;
    this._warned = new WeakSet();
  }

  spawnCheckpoint(z) {
    const g = new THREE.Group();
    g.position.z = z;
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.4, 2.2),
      new THREE.MeshBasicMaterial({ color: 0x37474f })
    );
    booth.position.set(-9.5, 1.2, 0);
    g.add(booth);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.18, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xffc107 })
    );
    arm.position.set(-5, 1.15, 0);
    arm.name = 'barrierArm';
    g.add(arm);
    for (const x of [-7, -4, 4, 7]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.85, 6),
        new THREE.MeshBasicMaterial({ color: 0xff6f00 })
      );
      cone.position.set(x, 0.42, 2.5);
      g.add(cone);
    }
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.45 })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.04, 0);
    g.add(strip);
    this.scene.add(g);
    this.checkpoints.push({ z, group: g, cleared: false, arm });
  }

  _raiseBarrier(cp) {
    if (!cp.arm || cp.open) return;
    cp.open = true;
    cp.arm.rotation.z = -Math.PI / 2;
    cp.arm.position.y = 3.0;
  }

  _resolveStop(cp, hudCallback) {
    if (cp.cleared) return;
    cp.cleared = true;
    this._raiseBarrier(cp);
    const roll = Math.random();
    if (roll < 0.75) {
      if (hudCallback) hudCallback({ msg: '🟢 KAROTA: Toh — wuce. Drive safe.', type: 'KAROTA_CLEAR' });
    } else if (roll < 0.92) {
      const fine = 200 + Math.floor(Math.random() * 300);
      this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
      if (hudCallback) hudCallback({ msg: `🟡 Small settlement ₦${fine}`, earnings: this.passengers.dailyEarnings });
    } else {
      const fine = 500 + Math.floor(Math.random() * 500);
      this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
      if (hudCallback) hudCallback({ msg: `🔴 Fine ₦${fine}`, earnings: this.passengers.dailyEarnings });
    }
  }

  update(hudCallback, delta = 0.016) {
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;
    const dt = Math.min(delta || 0.016, 0.05);

    if (playerZ > this._spawnedUntil - 120) {
      const nextZ = this._spawnedUntil + 450 + Math.random() * 200;
      this.spawnCheckpoint(nextZ);
      this._spawnedUntil = nextZ;
    }

    if (this.chase) {
      this.chase.t += dt;
      this.keke.maxSpeed = Math.min(this.keke.maxSpeed, 14);
      if (this.chase.t > 8) {
        this.chase = null;
        this.keke.maxSpeed = Math.max(this.keke.maxSpeed, 24);
        if (hudCallback) hudCallback({ msg: '🟢 You lost KAROTA — slow next time.' });
      }
      return;
    }

    for (const cp of this.checkpoints) {
      if (cp.cleared) {
        if (cp.group) cp.group.visible = Math.abs(cp.z - playerZ) < 160;
        continue;
      }
      if (cp.group) cp.group.visible = Math.abs(cp.z - playerZ) < 200;
      const dist = cp.z - playerZ;
      if (dist < 50 && dist > 10 && !this._warned.has(cp)) {
        this._warned.add(cp);
        if (hudCallback) hudCallback({ msg: '🚧 KAROTA ahead — slow down', type: 'KAROTA_AHEAD' });
      }
      if (dist < 8 && dist > -5) {
        if (speed > 14) {
          cp.cleared = true;
          this.chase = { t: 0 };
          if (hudCallback) hudCallback({ msg: '🚨 Ran KAROTA at high speed!', type: 'KAROTA_CHASE' });
        } else if (speed < 2.5) {
          this._resolveStop(cp, hudCallback);
        } else if (!cp._passed) {
          cp._passed = true;
          cp.cleared = true;
          this._raiseBarrier(cp);
          if (hudCallback) hudCallback({ msg: '🟢 KAROTA waved you on', type: 'KAROTA_CLEAR' });
        }
      }
    }
  }
}
