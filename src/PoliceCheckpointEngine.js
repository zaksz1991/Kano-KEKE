import * as THREE from 'three';

/**
 * Real roadside KAROTA / police checkpoint interaction
 * States: idle → approach → stop demand → negotiate/fine/chase
 */
export class PoliceCheckpointEngine {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.checkpoints = [];
    this.active = null; // current encounter
    this.chase = null;
    this._spawnedUntil = 0;
  }

  spawnCheckpoint(z) {
    const g = new THREE.Group();
    g.position.z = z;

    // Barrier booth
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 })
    );
    booth.position.set(-8.5, 1.2, 0);
    booth.castShadow = true;
    g.add(booth);

    // Yellow/black barrier arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.15, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.5 })
    );
    arm.position.set(-4, 1.1, 0);
    arm.name = 'barrierArm';
    g.add(arm);

    // Cone markers
    for (const x of [-5, -2, 2, 5]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.7 })
      );
      cone.position.set(x, 0.45, 2.5);
      g.add(cone);
    }

    // Officer
    const officer = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.7 })
    );
    officer.position.set(-6.5, 1.05, 1.5);
    officer.castShadow = true;
    g.add(officer);

    // Sign
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.9, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xc62828 })
    );
    sign.position.set(-8.5, 2.8, 1.2);
    g.add(sign);

    this.scene.add(g);
    this.checkpoints.push({ z, group: g, cleared: false, arm });
  }

  update(hudCallback) {
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;

    // Spawn next checkpoint ahead
    if (playerZ > this._spawnedUntil - 80) {
      const nextZ = this._spawnedUntil + 280 + Math.random() * 120;
      this.spawnCheckpoint(nextZ);
      this._spawnedUntil = nextZ;
    }

    // Chase update
    if (this.chase) {
      this.chase.t += 0.016;
      this.keke.maxSpeed = Math.min(this.keke.maxSpeed, 12);
      if (this.chase.t > 12) {
        // Caught
        const fine = 2000 + Math.floor(Math.random() * 3000);
        this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
        if (hudCallback) hudCallback({ msg: `🚓 Caught! Fine ₦${fine}. Papers next time.` });
        this.chase = null;
        this.keke.maxSpeed = 28;
      }
      return;
    }

    for (const cp of this.checkpoints) {
      if (cp.cleared) continue;
      const dist = cp.z - playerZ;

      // Approaching
      if (dist < 45 && dist > 5 && !this.active) {
        if (hudCallback) hudCallback({ msg: '🚧 KAROTA checkpoint ahead — slow down!' });
        this.active = { cp, phase: 'approach' };
      }

      // At checkpoint
      if (dist < 8 && dist > -5 && this.active?.cp === cp) {
        if (speed > 6) {
          // Ran the checkpoint
          cp.cleared = true;
          this.active = null;
          this.chase = { t: 0 };
          if (hudCallback) hudCallback({ msg: '🚨 You ran the checkpoint! KAROTA is chasing!' });
        } else if (speed < 2.5 && this.active.phase !== 'stopped') {
          this.active.phase = 'stopped';
          this._resolveStop(cp, hudCallback);
        }
      }

      if (dist < -15 && this.active?.cp === cp) {
        cp.cleared = true;
        this.active = null;
      }
    }
  }

  _resolveStop(cp, hudCallback) {
    const roll = Math.random();
    const earnings = this.passengers.dailyEarnings;

    if (roll < 0.35) {
      // Wave through
      if (hudCallback) hudCallback({ msg: '👮 KAROTA: To haka, wuce. Go.' });
      cp.cleared = true;
      this.active = null;
    } else if (roll < 0.7) {
      // Fine
      const fine = 500 + Math.floor(Math.random() * 1500);
      this.passengers.dailyEarnings = Math.max(0, earnings - fine);
      if (hudCallback) hudCallback({ msg: `👮 KAROTA: Papers? Fine ₦${fine}. Next time carry documents.` });
      cp.cleared = true;
      this.active = null;
    } else {
      // Negotiate "settlement"
      const settle = 200 + Math.floor(Math.random() * 600);
      this.passengers.dailyEarnings = Math.max(0, earnings - settle);
      if (hudCallback) hudCallback({ msg: `👮 Officer: Gafara... ₦${settle} settlement. Move.` });
      cp.cleared = true;
      this.active = null;
    }

    // Raise barrier
    if (cp.arm) {
      cp.arm.rotation.z = -0.9;
    }
  }
}
