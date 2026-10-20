export class PoliceCheckpointEngine {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.activeCheckpoint = null;
  }

  spawnCheckpoint(zPos) {
    const group = new THREE.Group();
    group.position.set(0, 0, zPos);

    // Barrier cones
    const coneGeo = new THREE.ConeGeometry(0.4, 0.8, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const cone1 = new THREE.Mesh(coneGeo, coneMat);
    cone1.position.set(-1.8, 0.4, 0);
    const cone2 = new THREE.Mesh(coneGeo, coneMat);
    cone2.position.set(1.8, 0.4, 0);

    group.add(cone1);
    group.add(cone2);
    this.scene.add(group);

    this.activeCheckpoint = { group, zPos, triggered: false };
  }

  update(hudCallback) {
    if (!this.activeCheckpoint) return;

    const dist = Math.abs(this.keke.position.z - this.activeCheckpoint.zPos);
    if (dist < 5.0 && Math.abs(this.keke.currentSpeed) < 0.1 && !this.activeCheckpoint.triggered) {
      this.activeCheckpoint.triggered = true;
      this.keke.maxSpeed = 0;

      if (hudCallback) {
        hudCallback({
          type: 'POLICE_STOP',
          msg: '👮 KAROTA CHECKPOINT! Demand vehicle particulars & ₦500 tea money!\n[Press 1: Give ₦500 Bribe] | [Press 2: Attempt Escape]'
        });
      }
    }
  }

  handleChoice(choice) {
    if (!this.activeCheckpoint) return '';

    let msg = '';
    if (choice === 1) {
      if (this.passengers.dailyEarnings >= 500) {
        this.passengers.dailyEarnings -= 500;
        msg = '👮 Handed ₦500 "Kudin Shayi". Officer waved you through safely.';
      } else {
        msg = '⚠️ No cash! Officer impounded your windscreen wiper.';
      }
    } else {
      msg = '🚨 SPEED AWAY! Escaped checkpoint, but KAROTA noted your plate number!';
    }

    this.scene.remove(this.activeCheckpoint.group);
    this.activeCheckpoint = null;
    this.keke.maxSpeed = 0.8;
    return msg;
  }
}