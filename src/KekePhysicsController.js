import * as THREE from 'three';

/** Stable drive feel – gentle steering, stays on road */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 26;
    this.reverseMax = 8;
    this.acceleration = 20;
    this.brakingForce = 28;
    this.friction = 5.5;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.engineRPM = 0;
    // Soft lane limits (world X)
    this.roadLimit = 7.2;
  }

  setInput(throttle, steer) {
    this.throttleInput = Math.max(-1, Math.min(1, Number(throttle) || 0));
    this.steerInput = Math.max(-1, Math.min(1, Number(steer) || 0));
  }

  bindWheels() {}

  update(delta) {
    const dt = Math.min(Math.max(delta || 0.016, 0.001), 0.05);

    if (this.throttleInput > 0.05) {
      this.velocity += this.acceleration * this.throttleInput * dt;
    } else if (this.throttleInput < -0.05) {
      if (this.velocity > 0.4) {
        this.velocity -= this.brakingForce * Math.abs(this.throttleInput) * dt;
      } else {
        this.velocity += this.acceleration * 0.5 * this.throttleInput * dt;
      }
    } else {
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.friction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.friction * dt);
    }

    const max = Math.max(8, this.maxSpeed || 26);
    this.velocity = Math.max(-this.reverseMax, Math.min(max, this.velocity));
    this.currentSpeed = Math.abs(this.velocity);

    // Gentle steering – stronger at low speed, weaker at high speed
    if (Math.abs(this.steerInput) > 0.05 && this.currentSpeed > 0.2) {
      const sign = this.velocity >= 0 ? 1 : -1;
      // Was 0.16 * speed (too sharp). Now curve down with speed.
      const agility = 0.55 / (1 + this.currentSpeed * 0.12);
      this.group.rotation.y += this.steerInput * sign * agility * this.currentSpeed * 0.045 * dt * 60;
    }

    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(dir, this.velocity * dt);
    this.group.position.y = 0;

    // Soft wall – ease back onto road if drifting off
    const x = this.group.position.x;
    if (x > this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(x, this.roadLimit, 0.12);
      // gentle straighten
      this.group.rotation.y *= 0.98;
    } else if (x < -this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(x, -this.roadLimit, 0.12);
      this.group.rotation.y *= 0.98;
    }

    this.engineRPM = Math.min(1, this.currentSpeed / max);
  }
}
