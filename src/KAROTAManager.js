import * as THREE from 'three';

export class KAROTAManager {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengers = passengerManager;
    this.wantedLevel = 0;
    this.fineAmount = 0;
    this.patrolCarMesh = this.createPatrolVehicle();
    this.patrolSpeed = 0.85;
  }

  createPatrolVehicle() {
    const group = new THREE.Group();
    
    // Green and White KAROTA Pickup Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.6, 4), 
      new THREE.MeshStandardMaterial({ color: 0x008000 })
    );
    body.position.y = 0.8;
    group.add(body);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.4, 4.05), 
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stripe.position.y = 0.8;
    group.add(stripe);

    return group;
  }

  checkViolations(speed, overcapacity) {
    if (this.wantedLevel > 0) return;

    if (speed > 0.75 || overcapacity) {
      this.wantedLevel = 2;
      this.fineAmount = overcapacity ? 2000 : 1500;
      this.patrolCarMesh.position.copy(this.keke.position);
      this.patrolCarMesh.position.z -= 25;
      this.scene.add(this.patrolCarMesh);
    }
  }

  update(delta, hudCallback) {
    if (this.wantedLevel === 2) {
      const dir = new THREE.Vector3().subVectors(this.keke.position, this.patrolCarMesh.position).normalize();
      this.patrolCarMesh.position.add(dir.multiplyScalar(this.patrolSpeed));

      const dist = this.patrolCarMesh.position.distanceTo(this.keke.position);

      if (dist < 3.5) {
        this.wantedLevel = 0;
        this.scene.remove(this.patrolCarMesh);
        this.passengers.dailyEarnings = Math.max(0, this.passengers.dailyEarnings - this.fineAmount);
        if (hudCallback) hudCallback(`BUSTED BY KAROTA! Paid ₦${this.fineAmount} fine.`);
      } else if (dist > 60) {
        this.wantedLevel = 0;
        this.scene.remove(this.patrolCarMesh);
        if (hudCallback) hudCallback('Escaped KAROTA Patrol!');
      }
    }
  }
}