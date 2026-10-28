import * as THREE from 'three';

/**
 * KAROTA checkpoint – barrier, cones, stop/fine/pass, chase if you run it
 */
export class PoliceCheckpointEngine {
  constructor(scene, kekeController, passengerManager, assetManager = null) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.assets = assetManager;
    this.officerModel = null;
    this.checkpoints = [];
    this.active = null;
    this.chase = null;
    this._spawnedUntil = 180;
    this._warned = new Set();

    if (this.assets) {
      this.assets.loadGLB('/assets/models/pedestrian.glb', { scale: 1 }).then((m) => {
        this.officerModel = m;
      }).catch(() => {});
    }
  }

  spawnCheckpoint(z) {
    const g = new THREE.Group();
    g.position.z = z;

    // Booth
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 })
    );
    booth.position.set(-8.5, 1.2, 0);
    g.add(booth);

    // Barrier arm (yellow/black stripes feel)
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.45, metalness: 0.2 })
    );
    arm.position.set(-3.5, 1.15, 0);
    arm.name = 'barrierArm';
    g.add(arm);

    // Cones
    for (const x of [-6, -3, 0, 3, 6]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.85, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6f00, roughness: 0.65 })
      );
      cone.position.set(x, 0.42, 3);
      g.add(cone);
    }

    // Officer – GLB if ready
    if (this.officerModel) {
      const officer = this.officerModel.clone(true);
      officer.scale.setScalar(1.05);
      officer.position.set(-6.5, 0, 1.5);
      officer.rotation.y = Math.PI / 2;
      g.add(officer);
    } else {
      const officer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.7 })
      );
      officer.position.set(-6.5, 0.9, 1.5);
      g.add(officer);
    }

    // STOP sign board
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.8, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xc62828, emissive: 0x8b0000, emissiveIntensity: 0.3 })
    );
    sign.position.set(-8.5, 2.9, 1.2);
    g.add(sign);

    // Ground marker strip
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.55 })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.04, 0);
    g.add(strip);

    this.scene.add(g);
    this.checkpoints.push({ z, group: g, cleared: false, arm, open: false });
  }

  _raiseBarrier(cp) {
    if (!cp.arm || cp.open) return;
    cp.open = true;
    // Animate up by rotating
    cp.arm.rotation.z = -Math.PI / 2;
    cp.arm.position.y = 3.2;
  }

  _resolveStop(cp, hudCallback) {
    const roll = Math.random();
    cp.cleared = true;
    this._raiseBarrier(cp);
    this.active = null;

    if (roll < 0.45) {
      // Wave through
      if (hudCallback) hudCallback({ msg: '🟢 KAROTA: To haka — wuce. Drive safe.' });
    } else if (roll < 0.8) {
      const fine = 300 + Math.floor(Math.random() * 700);
      this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
      if (hudCallback) {
        hudCallback({
          msg: `🟡 Papers check — settlement ₦${fine}`,
          earnings: this.passengers.dailyEarnings
        });
      }
    } else {
      const fine = 800 + Math.floor(Math.random() * 1200);
      this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
      if (hudCallback) {
        hudCallback({
          msg: `🔴 Light fine ₦${fine}. Next time slow earlier.`,
          earnings: this.passengers.dailyEarnings
        });
      }
    }
  }

  update(hudCallback) {
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;

    if (playerZ > this._spawnedUntil - 100) {
      const nextZ = this._spawnedUntil + 260 + Math.random() * 140;
      this.spawnCheckpoint(nextZ);
      this._spawnedUntil = nextZ;
    }

    // Chase after running checkpoint
    if (this.chase) {
      this.chase.t += 0.016;
      this.keke.maxSpeed = Math.min(this.keke.maxSpeed, 11);
      if (this.chase.t > 11) {
        const fine = 2000 + Math.floor(Math.random() * 2500);
        this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
        if (hudCallback) {
          hudCallback({
            msg: `🚓 Caught! Fine ₦${fine}`,
            earnings: this.passengers.dailyEarnings
          });
        }
        this.chase = null;
        this.keke.maxSpeed = Math.max(this.keke.maxSpeed, 24);
      }
      return;
    }

    for (const cp of this.checkpoints) {
      if (cp.cleared) {
        // LOD hide far
        if (cp.group) cp.group.visible = Math.abs(cp.z - playerZ) < 180;
        continue;
      }
      if (cp.group) cp.group.visible = Math.abs(cp.z - playerZ) < 200;

      const dist = cp.z - playerZ;

      if (dist < 55 && dist > 8 && !this._warned.has(cp)) {
        this._warned.add(cp);
        if (hudCallback) hudCallback({ msg: '🚧 KAROTA checkpoint ahead — slow down!', type: 'KAROTA_AHEAD' });
      }

      if (dist < 10 && dist > -6) {
        if (speed > 7) {
          // Ran it
          cp.cleared = true;
          this.active = null;
          this.chase = { t: 0 };
          if (hudCallback) hudCallback({ msg: '🚨 You ran the checkpoint! KAROTA chase!', type: 'KAROTA_CHASE' });
        } else if (speed < 3) {
          this._resolveStop(cp, hudCallback);
        } else if (hudCallback && dist < 6) {
          // nudge
          if (!cp._nudge || performance.now() - cp._nudge > 2500) {
            cp._nudge = performance.now();
            hudCallback({ msg: '🛑 Stop at the barrier for KAROTA' });
          }
        }
      }
    }
  }
}
