import * as THREE from 'three';

export class KekePhysicsController {
  constructor(kekeMesh) {
    this.mesh = kekeMesh;
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.heading = 0;

    this.maxSpeed = 0.8;
    this.acceleration = 0.015;
    this.deceleration = 0.98;
    this.steeringSensitivity = 0.04;
    
    this.currentSpeed = 0;
    this.steeringInput = 0;
    this.throttleInput = 0;
    this.currentTilt = 0;
    this.tiltFactor = 0.35;
    this.engineHealth = 100;
  }

  setInput(throttle, steering) {
    this.throttleInput = THREE.MathUtils.clamp(throttle, -1, 1);
    this.steeringInput = THREE.MathUtils.clamp(steering, -1, 1);
  }

  update(delta) {
    // Speed reduction based on engine damage
    const effectiveMaxSpeed = this.maxSpeed * (this.engineHealth / 100);

    if (this.throttleInput !== 0) {
      this.currentSpeed += this.throttleInput * this.acceleration;
    } else {
      this.currentSpeed *= this.deceleration;
    }
    this.currentSpeed = THREE.MathUtils.clamp(this.currentSpeed, -effectiveMaxSpeed * 0.4, effectiveMaxSpeed);

    if (Math.abs(this.currentSpeed) < 0.001) this.currentSpeed = 0;

    if (this.currentSpeed !== 0) {
      const turnFactor = (this.currentSpeed / this.maxSpeed);
      this.heading -= this.steeringInput * this.steeringSensitivity * turnFactor;
    }

    const forwardDir = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.velocity.copy(forwardDir).multiplyScalar(this.currentSpeed);
    this.position.add(this.velocity);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    // Signature 3-wheel Keke roll tilt dynamic
    const targetTilt = -this.steeringInput * (Math.abs(this.currentSpeed) / this.maxSpeed) * this.tiltFactor;
    this.currentTilt = THREE.MathUtils.lerp(this.currentTilt, targetTilt, 0.1);
    this.mesh.rotation.z = this.currentTilt;
  }
}