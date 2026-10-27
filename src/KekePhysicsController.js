import * as THREE from 'three';

export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 26;
    this.reverseMax = 9;
    this.acceleration = 24;
    this.brakingForce = 32;
    this.friction = 6;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.engineRPM = 0;
  }

  setInput(throttle, steer) {
    this.throttleInput = Math.max(-1, Math.min(1, Number(throttle) || 0));
    this.steerInput = Math.max(-1, Math.min(1, Number(steer) || 0));
  }

  bindWheels() {}

  update(delta) {
    const dt = Math.min(Math.max(delta || 0.016, 0.001), 0.05);

    if (this.throttleInput > 0.05) {
      // Forward accel – stronger from reverse through zero
      this.velocity += this.acceleration * this.throttleInput * dt;
    } else if (this.throttleInput < -0.05) {
      if (this.velocity > 0.4) {
        // Brake
        this.velocity -= this.brakingForce * Math.abs(this.throttleInput) * dt;
      } else {
        // Reverse
        this.velocity += this.acceleration * 0.55 * this.throttleInput * dt;
      }
    } else {
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.friction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.friction * dt);
    }

    const max = Math.max(8, this.maxSpeed || 26);
    this.velocity = Math.max(-this.reverseMax, Math.min(max, this.velocity));
    this.currentSpeed = Math.abs(this.velocity);

    // Steer in both forward and reverse (inverted feel in reverse)
    if (Math.abs(this.steerInput) > 0.05 && this.currentSpeed > 0.15) {
      const sign = this.velocity >= 0 ? 1 : -1;
      this.group.rotation.y += this.steerInput * sign * this.currentSpeed * 0.16 * dt;
    }

    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(dir, this.velocity * dt);
    this.group.position.y = 0;
    this.engineRPM = Math.min(1, this.currentSpeed / max);
  }
}
