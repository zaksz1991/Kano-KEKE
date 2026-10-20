import * as THREE from 'three';

export class SpatialHotspotManager {
  constructor(scene, kekeController, fuelManager, passengerManager, prayerManager, maintenanceEngine) {
    this.scene = scene;
    this.keke = kekeController;
    this.fuelManager = fuelManager;
    this.passengerManager = passengerManager;
    this.prayerManager = prayerManager;
    this.maintenanceEngine = maintenanceEngine;

    this.hotspots = [];
    this.activePromptHotspot = null;

    // Build initial world POIs along the Kano road chunks
    this.spawnHotspot(new THREE.Vector3(3, 0, 150), 'PETROL_STATION', '🛢️ Total Filling Station');
    this.spawnHotspot(new THREE.Vector3(-3, 0, 270), 'VULCANIZER', '🛠️ Roadside Vulcanizer & Spare Parts');
    this.spawnHotspot(new THREE.Vector3(-3, 0, 300), 'MECHANIC_SHOP', '🔧 Garajin Keke (Mechanic Shop)');
    this.spawnHotspot(new THREE.Vector3(0, 0, 450), 'MOSQUE', '🕌 Central Mosque (Prayer & Rest Stop)');
  }

  spawnHotspot(position, type, label) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Glowing 3D Floor Marker Ring
    const ringGeo = new THREE.RingGeometry(2.5, 3.0, 32);
    let color = 0xffcc00;
    if (type === 'PETROL_STATION') color = 0x4CAF50;
    if (type === 'VULCANIZER') color = 0xFF5722;
    if (type === 'MOSQUE') color = 0x2196F3;

    const ringMat = new THREE.MeshBasicMaterial({ 
      color: color, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.7 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    this.scene.add(group);
    this.hotspots.push({ group, position, type, label });
  }

  update(hudCallback) {
    const kekePos = this.keke.position;
    let foundNear = null;

    this.hotspots.forEach((spot) => {
      const distance = kekePos.distanceTo(spot.position);
      if (distance < 3.8) {
        foundNear = spot;
      }
    });

    if (foundNear) {
      if (this.activePromptHotspot !== foundNear) {
        this.activePromptHotspot = foundNear;
        if (hudCallback) {
          hudCallback({
            type: 'HOTSPOT_PROMPT',
            msg: `Press [E] to enter ${foundNear.label}`
          });
        }
      }
    } else {
      if (this.activePromptHotspot) {
        this.activePromptHotspot = null;
        if (hudCallback) {
          hudCallback({ type: 'HIDE_PROMPT' });
        }
      }
    }
  }

  triggerInteraction(showBannerCallback) {
    if (!this.activePromptHotspot) return;

    if (this.activePromptHotspot.type === 'PETROL_STATION') {
      const success = this.fuelManager.refuel(1500, this.passengerManager);
      if (success) {
        const earningsEl = document.getElementById('earnings');
        if (earningsEl) earningsEl.innerText = this.passengerManager.dailyEarnings;
        showBannerCallback('🛢️ Refueled full tank at Filling Station! Paid ₦1,500.');
      } else {
        showBannerCallback('❌ Not enough money to refuel! Need ₦1,500.');
      }
    } else if (this.activePromptHotspot.type === 'VULCANIZER') {
      if (this.maintenanceEngine) {
        const success = this.maintenanceEngine.servicingRepair(2000, this.passengerManager, showBannerCallback);
        if (success) {
          const earningsEl = document.getElementById('earnings');
          if (earningsEl) earningsEl.innerText = this.passengerManager.dailyEarnings;
        }
      } else {
        showBannerCallback('🛠️ Vulcanizer inspected your tyres.');
      }
    } else if (this.activePromptHotspot.type === 'MECHANIC_SHOP') {
      const modal = document.getElementById('shop-modal');
      if (modal) modal.style.display = 'block';
      showBannerCallback('🔧 Entered Garajin Keke Mechanic Shop.');
    } else if (this.activePromptHotspot.type === 'MOSQUE') {
      if (this.prayerManager) {
        this.prayerManager.performPrayer(showBannerCallback);
      } else {
        showBannerCallback('🕌 Stopped at Mosque to rest.');
      }
    }
  }
}