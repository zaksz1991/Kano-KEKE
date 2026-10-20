// PassengerManager.js
import * as THREE from 'three';

const KANO_LOCATIONS = ["Sabon Gari Market", "Kofar Nasarawa", "Farm Centre", "Gidan Rumfa", "Brigade Junction"];

export class PassengerManager {
  constructor(scene, kekeController) {
    this.scene = scene;
    this.keke = kekeController;
    this.hailingPassengers = [];
    this.activePassengers = [];
    this.maxCapacity = 3;
    this.dailyEarnings = 1500;
    this.fareMultiplier = 1.0;
    this.activeTrip = null;
    
    this.npcGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.6, 8);
    this.npcMat = new THREE.MeshStandardMaterial({ color: 0x2b5b84 });
  }

  spawnPassenger(position) {
    const mesh = new THREE.Mesh(this.npcGeo, this.npcMat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    
    const passengerData = {
      mesh,
      destination: KANO_LOCATIONS[Math.floor(Math.random() * KANO_LOCATIONS.length)],
      fare: Math.floor(Math.random() * 4 + 2) * 100,
      position: position.clone()
    };
    this.hailingPassengers.push(passengerData);
    this.scene.add(mesh);
  }

  update(delta, hudCallback) {
    const kekePos = this.keke.position;

    this.hailingPassengers.forEach((p, index) => {
      if (kekePos.distanceTo(p.position) < 4.0 && Math.abs(this.keke.currentSpeed) < 0.1 && this.activePassengers.length < this.maxCapacity) {
        this.pickUp(p, index, hudCallback);
      }
    });

    if (this.activeTrip && kekePos.distanceTo(this.activeTrip.dropOffPos) < 6.0 && Math.abs(this.keke.currentSpeed) < 0.1) {
      this.dropOff(hudCallback);
    }
  }

  pickUp(passenger, index, hudCallback) {
    this.scene.remove(passenger.mesh);
    this.hailingPassengers.splice(index, 1);
    
    const calculatedFare = Math.round(passenger.fare * this.fareMultiplier);
    passenger.fare = calculatedFare;
    this.activePassengers.push(passenger);

    if (!this.activeTrip) {
      this.activeTrip = {
        destination: passenger.destination,
        dropOffPos: new THREE.Vector3(0, 0, this.keke.position.z + 180)
      };
    }

    this.keke.maxSpeed = 0.8 * (1 - this.activePassengers.length * 0.08);

    if (hudCallback) hudCallback({ type: 'PICKUP', passCount: this.activePassengers.length, trip: this.activeTrip, msg: `Picked passenger for ${passenger.destination} (₦${calculatedFare})` });
  }

  dropOff(hudCallback) {
    let earned = 0;
    this.activePassengers.forEach(p => earned += p.fare);
    this.dailyEarnings += earned;
    this.activePassengers = [];
    this.activeTrip = null;
    this.keke.maxSpeed = 0.8;

    if (hudCallback) hudCallback({ type: 'DROPOFF', earnings: this.dailyEarnings, msg: `Dropped off! Earned ₦${earned}` });
  }
}