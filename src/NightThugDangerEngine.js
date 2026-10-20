// NightThugDangerEngine.js
import * as THREE from 'three';

export class NightThugDangerEngine {
  constructor(scene, kekeController, customizer, driverState) {
    this.scene = scene;
    this.keke = kekeController;
    this.customizer = customizer;
    this.driver = driverState;
    this.activeRoadblock = null;
  }

  update(timeInMinutes, playerMoney, hudCallback) {
    const isNight = timeInMinutes >= 1200 || timeInMinutes < 300; // 8:00 PM - 5:00 AM
    if (!isNight) return;

    let attractionScore = 1.0;
    if (this.customizer.upgrades.neon) attractionScore += 0.8;
    if (this.customizer.upgrades.subwoofer) attractionScore += 0.6;

    if (!this.activeRoadblock && Math.random() < 0.0015 * attractionScore) {
      this.spawnRoadblock(this.keke.position.z + 80, hudCallback);
    }

    if (this.activeRoadblock) {
      const distance = Math.abs(this.keke.position.z - this.activeRoadblock.zPos);
      if (distance < 4.0 && Math.abs(this.keke.currentSpeed) < 0.1 && !this.activeRoadblock.isTriggered) {
        this.activeRoadblock.isTriggered = true;
        this.keke.maxSpeed = 0;
        if (hudCallback) hudCallback({ type: 'AMBUSH', msg: '🗡️ YAN DABA AMBUSH! Demand ₦1,500 Night Levy!\n[Press 1: Pay ₦1,500] | [Press 2: Ram Roadblock]' });
      }
    }
  }

  spawnRoadblock(spawnZ, hudCallback) {
    const group = new THREE.Group();
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x3d2314 }));
    barrier.position.set(0, 0.3, spawnZ);
    group.add(barrier);

    const thugGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.7, 8);
    const thugMat = new THREE.MeshStandardMaterial({ color: 0x221111 });
    for (let i = 0; i < 3; i++) {
      const thug = new THREE.Mesh(thugGeo, thugMat);
      thug.position.set((i - 1) * 1.8, 0.85, spawnZ + 1.2);
      group.add(thug);
    }

    this.scene.add(group);
    this.activeRoadblock = { group, zPos: spawnZ, isTriggered: false };
    if (hudCallback) hudCallback({ type: 'WARNING', msg: '⚠️ NIGHT DANGER: Yan Daba Roadblock spotted ahead!' });
  }

  handleChoice(choice, passengerManager) {
    if (!this.activeRoadblock) return '';
    let msg = '';
    if (choice === 1) {
      if (passengerManager.dailyEarnings >= 1500) {
        passengerManager.dailyEarnings -= 1500;
        msg = '💸 Paid ₦1,500 Yan Daba levy. Barrier cleared.';
      } else {
        passengerManager.dailyEarnings = 0;
        msg = '⚠️ No cash! They seized your battery and daily earnings.';
      }
    } else {
      if (this.customizer.upgrades.bumper) {
        msg = '💥 STEEL BUMPER smashed through the barrier safely!';
      } else {
        this.keke.engineHealth = Math.max(20, this.keke.engineHealth - 35);
        msg = '💥 CRASH! Smashed through, but damaged radiator (Engine -35%).';
      }
    }
    this.scene.remove(this.activeRoadblock.group);
    this.activeRoadblock = null;
    this.keke.maxSpeed = 0.8;
    return msg;
  }
}