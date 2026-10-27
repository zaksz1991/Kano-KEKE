import * as THREE from 'three';

/**
 * Interactive petrol stations – slow/stop nearby to refuel for cash
 */
export class FuelStationSystem {
  constructor(scene, fuelManager, passengerManager) {
    this.scene = scene;
    this.fuel = fuelManager;
    this.passengers = passengerManager;
    this.stations = [];
    this._nextZ = 120;
    this._cooldown = 0;
    this.lastMsg = 0;
  }

  init() {
    for (let i = 0; i < 3; i++) {
      this._spawn(this._nextZ);
      this._nextZ += 220 + Math.random() * 80;
    }
  }

  _spawn(z) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(side * 11, 0, z);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.28, 5),
      new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.5 })
    );
    canopy.position.y = 4.1;
    canopy.castShadow = true;
    g.add(canopy);

    for (const px of [-2.2, 2.2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4.1, 6),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.5 })
      );
      post.position.set(px, 2.05, 0);
      g.add(post);
    }

    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 1.7, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.45 })
    );
    pump.position.set(0, 0.85, 1.3);
    pump.castShadow = true;
    g.add(pump);

    // PMS sign
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.7, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20, emissive: 0x2e7d32, emissiveIntensity: 0.2 })
    );
    sign.position.set(0, 4.6, 0);
    g.add(sign);

    // Marker disc on ground
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.35 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.03;
    g.add(disc);

    this.scene.add(g);
    this.stations.push({ mesh: g, z, side, used: false });
  }

  update(delta, playerPos, speed, hudCallback) {
    this._cooldown = Math.max(0, this._cooldown - delta);
    const playerZ = playerPos.z;

    // Spawn ahead
    if (playerZ > this._nextZ - 200) {
      this._spawn(this._nextZ);
      this._nextZ += 200 + Math.random() * 100;
    }

    for (const st of this.stations) {
      const dist = st.mesh.position.distanceTo(playerPos);
      st.mesh.visible = Math.abs(st.z - playerZ) < 200;

      if (dist < 9 && speed < 4 && this._cooldown <= 0) {
        const level = this.fuel.fuel ?? 50;
        if (level >= 98) {
          if (performance.now() - this.lastMsg > 4000) {
            this.lastMsg = performance.now();
            if (hudCallback) hudCallback({ msg: '⛽ Tank already full' });
          }
          continue;
        }
        const need = 100 - level;
        const cost = Math.max(200, Math.round(need * 12));
        const cash = this.passengers.dailyEarnings || 0;
        if (cash < cost) {
          if (performance.now() - this.lastMsg > 4000) {
            this.lastMsg = performance.now();
            if (hudCallback) hudCallback({ msg: `⛽ Need ₦${cost} to fill up` });
          }
          continue;
        }
        this.passengers.dailyEarnings -= cost;
        this.fuel.fuel = 100;
        this.fuel.isOut = false;
        if (this.fuel.keke && this.fuel.baseMaxSpeed) {
          this.fuel.keke.maxSpeed = this.fuel.baseMaxSpeed;
        } else if (this.fuel.keke) {
          this.fuel.keke.maxSpeed = Math.max(this.fuel.keke.maxSpeed, 22);
        }
        this._cooldown = 8;
        if (hudCallback) {
          hudCallback({
            msg: `⛽ Filled up! −₦${cost}`,
            type: 'REFUEL',
            earnings: this.passengers.dailyEarnings
          });
        }
      } else if (dist < 14 && speed < 6) {
        if (performance.now() - this.lastMsg > 5000) {
          this.lastMsg = performance.now();
          if (hudCallback) hudCallback({ msg: '⛽ Petrol station — slow down to refuel' });
        }
      }
    }
  }
}
