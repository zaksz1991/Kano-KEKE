import * as THREE from 'three';

/**
 * Arcade drive – clear acceleration, speed always rises with ACCEL
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 28;
    this.reverseMax = 5;
    this.acceleration = 26;
    this.brakingForce = 34;
    this.coastFriction = 5;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.lateral = 0;
    this.engineRPM = 0;
    this.roadLimit = 8.5;
    this._brakeHold = 0;
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(Number(throttle) || 0, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(Number(steer) || 0, -1, 1);
  }

  bindWheels() {}

  update(delta) {
    const dt = THREE.MathUtils.clamp(delta || 0.016, 0.001, 0.033);
    const throttle = this.throttleInput;
    const top = Math.max(18, this.maxSpeed || 28);

    if (throttle > 0.05) {
      if (this.velocity < 0) this.velocity = 0;
      this._brakeHold = 0;
      const ratio = THREE.MathUtils.clamp(this.velocity / top, 0, 1);
      // Always accelerate while ACCEL held – never flat zero
      this.velocity += this.acceleration * throttle * (1.2 - ratio * 0.5) * dt;
      if (this.velocity > top) this.velocity = top;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.15) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
        if (this.velocity < 0) this.velocity = 0;
        this._brakeHold = 0;
      } else {
        this.velocity = 0;
        this._brakeHold += dt;
        if (this._brakeHold > 0.35) {
          this.velocity = -Math.min(this.reverseMax, (this._brakeHold - 0.35) * 7);
        }
      }
    } else {
      this._brakeHold = 0;
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.coastFriction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.coastFriction * dt);
    }

    if (Math.abs(this.velocity) < 0.08) this.velocity = 0;
    this.currentSpeed = Math.abs(this.velocity);

    // Steer: left=-1 → -X (screen left when camera behind) — was confirmed correct with flip
    const latMax = 18 / (1 + this.currentSpeed * 0.03);
    const targetLat = -this.steerInput * latMax;
    this.lateral += (targetLat - this.lateral) * Math.min(1, 14 * dt);
    if (Math.abs(this.steerInput) < 0.05) this.lateral *= 0.85;

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;
    if (this.group.position.y < 0) this.group.position.y = 0;
    this.group.rotation.set(0, 0, 0);

    if (this.group.position.x > this.roadLimit) {
      this.group.position.x = this.roadLimit;
      this.lateral = Math.min(0, this.lateral);
    } else if (this.group.position.x < -this.roadLimit) {
      this.group.position.x = -this.roadLimit;
      this.lateral = Math.max(0, this.lateral);
    }

    this.engineRPM = THREE.MathUtils.clamp(this.currentSpeed / top, 0, 1);
  }
}
