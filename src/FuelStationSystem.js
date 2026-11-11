import * as THREE from 'three';

/**
 * PMS + CNG stations — Kano real areas for CNG
 * Jaen Sharada, Kwandila Maiduguri Rd, Hotoro, Gwarzo Gadon Kaya
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
    this.cngNames = [
      'CNG · Jaen Sharada',
      'CNG · Kwandila Maiduguri Rd',
      'CNG · Hotoro',
      'CNG · Gwarzo Gadon Kaya'
    ];
    this._cngIdx = 0;
  }

  init() {
    this._spawn(80, 'pms');
    this._spawn(200, 'cng');
    this._spawn(340, 'pms');
    this._spawn(480, 'cng');
    this._nextZ = 600;
  }

  _spawn(z, forceType = null) {
    const isCng = forceType === 'cng' || (forceType !== 'pms' && Math.random() < 0.4);
    const side = Math.random() > 0.5 ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(side * 13.5, 0, z);

    const canopyColor = isCng ? 0x0277bd : 0xf9a825;
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.25, 4.5),
      new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.55 })
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
      new THREE.MeshStandardMaterial({
        color: isCng ? 0x01579b : 0xc62828,
        roughness: 0.5
      })
    );
    pump.position.set(0, 0.8, 1.1);
    g.add(pump);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.7, 0.1),
      new THREE.MeshStandardMaterial({
        color: isCng ? 0x01579b : 0x1b5e20,
        emissive: isCng ? 0x0288d1 : 0x2e7d32,
        emissiveIntensity: 0.3
      })
    );
    sign.position.set(0, 4.4, 0);
    g.add(sign);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 12),
      new THREE.MeshBasicMaterial({
        color: isCng ? 0x29b6f6 : 0x00e676,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(-side * 3.5, 0.04, 0);
    g.add(disc);

    let label = isCng ? this.cngNames[this._cngIdx % this.cngNames.length] : 'PMS Station';
    if (isCng) this._cngIdx++;

    this.scene.add(g);
    this.stations.push({ mesh: g, z, side, type: isCng ? 'cng' : 'pms', label });
  }

  update(delta, playerPos, speed, hudCallback, opts = {}) {
    this._cooldown = Math.max(0, this._cooldown - delta);
    const playerZ = playerPos.z;
    const maintenance = opts.maintenance;
    const batterySys = opts.batterySys;

    if (playerZ > this._nextZ - 200) {
      this._spawn(this._nextZ, Math.random() < 0.45 ? 'cng' : 'pms');
      this._nextZ += 100 + Math.random() * 55;
    }

    for (const st of this.stations) {
      const dist = st.mesh.position.distanceTo(playerPos);
      st.mesh.visible = Math.abs(st.z - playerZ) < 180;

      if (dist < 12 && speed < 4.5 && this._cooldown <= 0) {
        // Cool engine whenever you stop at any station
        if (maintenance?.engineTemp > 90) {
          maintenance.radiateCool?.(20);
          maintenance.engineTemp = Math.max(75, (maintenance.engineTemp || 100) - 25);
          maintenance._overheatWarned = false;
        }

        if (batterySys?.converted) {
          batterySys.rechargeAtStation?.(35);
          this._cooldown = 6;
          if (hudCallback) {
            hudCallback({
              msg: `⚡ ${st.label} — battery ${Math.round(batterySys.batteryPct)}%`
            });
          }
          try {
            if (window.__kanoRepairEngine) window.__kanoRepairEngine();
          } catch (e) {}
          continue;
        }

        const level = this.fuel.fuel ?? 50;
        if (level >= 98) {
          if (performance.now() - this.lastMsg > 5000) {
            this.lastMsg = performance.now();
            if (hudCallback) hudCallback({ msg: `⛽ ${st.label} — tank full · engine cooled` });
          }
          this._cooldown = 3;
          continue;
        }
        const need = 100 - level;
        const rate = st.type === 'cng' ? 8 + Math.floor(Math.random() * 4) : 11 + Math.floor(Math.random() * 5);
        const cost = Math.max(180, Math.round(need * rate));
        const cash = this.passengers.dailyEarnings || 0;
        if (cash < cost) {
          if (performance.now() - this.lastMsg > 4000) {
            this.lastMsg = performance.now();
            if (hudCallback) hudCallback({ msg: `⛽ ${st.label}: need ₦${cost}` });
          }
          continue;
        }
        this.passengers.dailyEarnings -= cost;
        try {
          if (window.__kanoRepairEngine) window.__kanoRepairEngine();
        } catch (e) {}
        this.fuel.fuel = 100;
        this.fuel.isOut = false;
        if (this.fuel.keke) this.fuel.keke.maxSpeed = Math.max(this.fuel.keke.maxSpeed, 28);
        if (maintenance) {
          maintenance.engineTemp = 75;
          maintenance._overheatWarned = false;
        }
        this._cooldown = 8;
        if (hudCallback) {
          hudCallback({
            msg: `⛽ ${st.label} · ₦${rate}/% · −₦${cost} · cooled`,
            type: 'REFUEL',
            earnings: this.passengers.dailyEarnings
          });
        }
      } else if (dist < 28 && speed > 8 && performance.now() - this.lastMsg > 6000) {
        this.lastMsg = performance.now();
        if (hudCallback) hudCallback({ msg: `📍 ${st.label} ahead — SLOW to fill` });
      }
    }
  }
}
