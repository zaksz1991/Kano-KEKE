import * as THREE from 'three';

/**
 * KAROTA – live checkpoint + real pursuit when you bolt
 */
export class PoliceCheckpointEngine {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.checkpoints = [];
    this.chase = null;
    this._spawnedUntil = 280;
    this._warned = new WeakSet();
    this._chaseMesh = null;
  }

  spawnCheckpoint(z) {
    const g = new THREE.Group();
    g.position.z = z;

    // Booth
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.6, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.7 })
    );
    booth.position.set(-10.2, 1.3, 0);
    g.add(booth);

    // Roof plate
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.15, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20 })
    );
    roof.position.set(-10.2, 2.7, 0);
    g.add(roof);

    // Barrier arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.2, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xffa000, emissiveIntensity: 0.2 })
    );
    arm.position.set(-5.2, 1.2, 0);
    arm.name = 'barrierArm';
    g.add(arm);

    // Standing officer (simple figure that idles)
    const officer = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20 })
    );
    body.position.y = 0.95;
    officer.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xc4a574 })
    );
    head.position.y = 1.7;
    officer.add(head);
    officer.position.set(-8.2, 0, 1.2);
    officer.name = 'officer';
    g.add(officer);

    // Cones
    for (const x of [-7.5, -4, 4, 7.5]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0xff6f00 })
      );
      cone.position.set(x, 0.45, 3);
      g.add(cone);
    }

    // Road strip
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.5, depthWrite: false })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.05, 0);
    g.add(strip);

    // Sign
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.7, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xb71c1c, emissive: 0xff1744, emissiveIntensity: 0.15 })
    );
    sign.position.set(-10.2, 3.3, 0);
    g.add(sign);

    this.scene.add(g);
    this.checkpoints.push({
      z,
      group: g,
      cleared: false,
      arm,
      officer,
      open: false,
      phase: Math.random() * Math.PI * 2
    });
  }

  _raiseBarrier(cp) {
    if (!cp.arm || cp.open) return;
    cp.open = true;
    cp.arm.rotation.z = -Math.PI / 2;
    cp.arm.position.y = 3.1;
  }

  _ensureChaseMesh() {
    if (this._chaseMesh) return this._chaseMesh;
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2 })
    );
    body.position.y = 0.55;
    g.add(body);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.25, 3.42),
      new THREE.MeshStandardMaterial({ color: 0x1565c0, emissive: 0x0d47a1, emissiveIntensity: 0.3 })
    );
    stripe.position.y = 0.85;
    g.add(stripe);
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.15, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.8 })
    );
    light.position.set(0, 1.15, -0.2);
    g.add(light);
    this.scene.add(g);
    this._chaseMesh = g;
    return g;
  }

  _startChase(hudCallback) {
    this.chase = {
      t: 0,
      maxT: 18,
      catchDist: 9,
      speed: 16
    };
    const mesh = this._ensureChaseMesh();
    const p = this.keke.group.position;
    mesh.position.set(p.x - 2.5, 0, p.z - 25);
    mesh.visible = true;
    if (hudCallback) {
      hudCallback({
        msg: '🚨 KAROTA CHASE! SLOW & stop or lose them',
        type: 'KAROTA_CHASE'
      });
    }
  }

  _resolveStop(cp, hudCallback) {
    if (cp.cleared) return;
    cp.cleared = true;
    this._raiseBarrier(cp);
    const roll = Math.random();
    if (roll < 0.72) {
      try {
        this.passengers.dailyEarnings = (this.passengers.dailyEarnings || 0) + 50;
      } catch (e) {}
      if (hudCallback) {
        hudCallback({
          msg: '🟢 KAROTA: "Toh, wuce." · +₦50 respect',
          type: 'KAROTA_CLEAR',
          earnings: this.passengers.dailyEarnings
        });
      }
    } else if (roll < 0.9) {
      const fine = 200 + Math.floor(Math.random() * 300);
      this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
      if (hudCallback) {
        hudCallback({
          msg: `🟡 Settlement ₦${fine}`,
          earnings: this.passengers.dailyEarnings
        });
      }
    } else {
      const fine = 500 + Math.floor(Math.random() * 500);
      this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - fine);
      if (hudCallback) {
        hudCallback({
          msg: `🔴 Fine ₦${fine}`,
          earnings: this.passengers.dailyEarnings
        });
      }
    }
  }

  update(hudCallback, delta = 0.016) {
    const playerZ = this.keke.group.position.z;
    const playerX = this.keke.group.position.x;
    const speed = this.keke.currentSpeed || 0;
    const dt = Math.min(delta || 0.016, 0.05);

    if (playerZ > this._spawnedUntil - 100) {
      const nextZ = this._spawnedUntil + 280 + Math.random() * 140;
      this.spawnCheckpoint(nextZ);
      this._spawnedUntil = nextZ;
    }

    // Animate officers / barrier pulse
    for (const cp of this.checkpoints) {
      if (!cp.group) continue;
      cp.phase = (cp.phase || 0) + dt;
      if (cp.officer && !cp.cleared) {
        cp.officer.position.x = -8.2 + Math.sin(cp.phase * 1.2) * 0.15;
        cp.officer.rotation.y = Math.sin(cp.phase * 0.8) * 0.25;
      }
      if (cp.arm && !cp.open) {
        cp.arm.position.y = 1.2 + Math.sin(cp.phase * 3) * 0.03;
      }
      cp.group.visible = Math.abs(cp.z - playerZ) < 200;
    }

    // Active chase
    if (this.chase) {
      this.chase.t += dt;
      this.keke.maxSpeed = Math.min(this.keke.maxSpeed || 36, 18);
      const mesh = this._ensureChaseMesh();
      mesh.visible = true;
      // Pursue toward player
      const targetZ = playerZ - 8;
      const targetX = playerX + (Math.sin(this.chase.t * 2) * 0.4);
      mesh.position.z += (targetZ - mesh.position.z) * Math.min(1, 2.2 * dt);
      mesh.position.x += (targetX - mesh.position.x) * Math.min(1, 1.5 * dt);
      mesh.position.z += this.chase.speed * dt * 0.35;
      // Siren flash
      const flash = mesh.children[2];
      if (flash?.material) {
        flash.material.emissiveIntensity = 0.4 + Math.sin(this.chase.t * 12) * 0.5;
      }

      const dist = Math.hypot(mesh.position.x - playerX, mesh.position.z - playerZ);
      if (speed < 3.5 && dist < this.chase.catchDist) {
        // Caught
        const fine = 800 + Math.floor(Math.random() * 700);
        this.passengers.dailyEarnings = Math.max(0, (this.passengers.dailyEarnings || 0) - fine);
        this.chase = null;
        mesh.visible = false;
        this.keke.maxSpeed = Math.max(this.keke.maxSpeed, 28);
        try { window.__kanoHeat = Math.min(100, (window.__kanoHeat || 0) + 15); } catch (e) {}
        if (hudCallback) {
          hudCallback({
            msg: `🚔 Caught — fine ₦${fine}`,
            earnings: this.passengers.dailyEarnings
          });
        }
        return;
      }
      if (this.chase.t > this.chase.maxT || (speed > 20 && this.chase.t > 10 && dist > 40)) {
        this.chase = null;
        mesh.visible = false;
        this.keke.maxSpeed = Math.max(this.keke.maxSpeed, 28);
        try { window.__kanoHeat = Math.max(0, (window.__kanoHeat || 0) - 5); } catch (e) {}
        if (hudCallback) hudCallback({ msg: '🟢 Lost KAROTA — next time slow down' });
      }
      return;
    }

    if (this._chaseMesh) this._chaseMesh.visible = false;

    for (const cp of this.checkpoints) {
      if (cp.cleared) continue;
      const dist = cp.z - playerZ;
      if (dist < 55 && dist > 12 && !this._warned.has(cp)) {
        this._warned.add(cp);
        if (hudCallback) hudCallback({ msg: '🚧 KAROTA ahead — SLOW to stop', type: 'KAROTA_AHEAD' });
      }
      if (dist < 9 && dist > -6) {
        if (speed > 12) {
          // Bolt → chase
          cp.cleared = true;
          this._raiseBarrier(cp);
          this._startChase(hudCallback);
          try {
            window.__kanoHeat = Math.min(100, (window.__kanoHeat || 0) + 25);
          } catch (e) {}
        } else if (speed < 3.2) {
          this._resolveStop(cp, hudCallback);
        } else if (!cp._passed) {
          cp._passed = true;
          // Medium speed: wave through if not reckless
          if (speed < 8) {
            this._resolveStop(cp, hudCallback);
          } else {
            cp.cleared = true;
            this._raiseBarrier(cp);
            if (hudCallback) hudCallback({ msg: '🟢 KAROTA waved you on' });
          }
        }
      }
    }
  }
}
