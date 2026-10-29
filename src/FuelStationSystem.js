import * as THREE from 'three';

/**
 * PMS stations on dual-road shoulder – slow to refuel
 */
export class FuelStationSystem {
  constructor(scene, fuelManager, passengerManager) {
    this.scene = scene;
    this.fuel = fuelManager;
    this.passengers = passengerManager;
    this.stations = [];
    this._nextZ = 150;
    this._cooldown = 0;
    this.lastMsg = 0;
  }

  init() {
    for (let i = 0; i < 3; i++) {
      this._spawn(this._nextZ);
      this._nextZ += 240 + Math.random() * 90;
    }
  }

  _spawn(z) {
    // Outer shoulder of dual carriageway
    const side = Math.random() > 0.5 ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(side * 13.5, 0, z);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.25, 4.5),
      new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.55 })
    );
    canopy.position.y = 3.9;
    g.add(canopy);

    for (const px of [-2, 2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 3.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.45 })
      );
      post.position.set(px, 1.95, 0);
      g.add(post);
    }

    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 })
    );
    pump.position.set(0, 0.8, 1.1);
    g.add(pump);

    // PMS sign
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.65, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1b5e20, emissive: 0x2e7d32, emissiveIntensity: 0.25 })
    );
    sign.position.set(0, 4.4, 0);
    g.add(sign);

    // Approach marker on road edge
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 12),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.4 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(-side * 3.5, 0.04, 0);
    g.add(disc);

    this.scene.add(g);
    this.stations.push({ mesh: g, z, side });
  }

  update(delta, playerPos, speed, hudCallback) {
    this._cooldown = Math.max(0, this._cooldown - delta);
    const playerZ = playerPos.z;

    if (playerZ > this._nextZ - 200) {
      this._spawn(this._nextZ);
      this._nextZ += 220 + Math.random() * 100;
    }

    for (const st of this.stations) {
      const dist = st.mesh.position.distanceTo(playerPos);
      st.mesh.visible = Math.abs(st.z - playerZ) < 180;

      if (dist < 11 && speed < 4.5 && this._cooldown <= 0) {
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
            if (hudCallback) hudCallback({ msg: `⛽ Need ₦${cost} to fill` });
          }
          continue;
        }
        this.passengers.dailyEarnings -= cost;
        this.fuel.fuel = 100;
        this.fuel.isOut = false;
        if (this.fuel.keke) this.fuel.keke.maxSpeed = Math.max(this.fuel.keke.maxSpeed, 22);
        this._cooldown = 8;
        if (hudCallback) {
          hudCallback({
            msg: `⛽ Filled up! −₦${cost}`,
            type: 'REFUEL',
            earnings: this.passengers.dailyEarnings
          });
        }
      } else if (dist < 16 && speed < 7) {
        if (performance.now() - this.lastMsg > 5000) {
          this.lastMsg = performance.now();
          if (hudCallback) hudCallback({ msg: '⛽ PMS ahead — slow down to refuel' });
        }
      }
    }
  }
}
