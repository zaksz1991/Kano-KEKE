import * as THREE from 'three';

/**
 * Responsive arcade drive for KANO KEKE
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 32;
    this.reverseMax = 6;
    this.acceleration = 34;
    this.brakingForce = 42;
    this.coastFriction = 4;
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
    const top = Math.max(20, this.maxSpeed || 32);

    if (throttle > 0.05) {
      if (this.velocity < 0) this.velocity = 0;
      this._brakeHold = 0;
      const ratio = THREE.MathUtils.clamp(this.velocity / top, 0, 1);
      // Strong pull at low speed, still climbs at mid speed
      this.velocity += this.acceleration * throttle * (1.35 - ratio * 0.55) * dt;
      if (this.velocity > top) this.velocity = top;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.15) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
        if (this.velocity < 0) this.velocity = 0;
        this._brakeHold = 0;
      } else {
        this.velocity = 0;
        this._brakeHold += dt;
        if (this._brakeHold > 0.3) {
          this.velocity = -Math.min(this.reverseMax, (this._brakeHold - 0.3) * 8);
        }
      }
    } else {
      this._brakeHold = 0;
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.coastFriction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.coastFriction * dt);
    }

    if (Math.abs(this.velocity) < 0.08) this.velocity = 0;
    this.currentSpeed = Math.abs(this.velocity);

    const latMax = 20 / (1 + this.currentSpeed * 0.028);
    const targetLat = -this.steerInput * latMax;
    this.lateral += (targetLat - this.lateral) * Math.min(1, 16 * dt);
    if (Math.abs(this.steerInput) < 0.05) this.lateral *= 0.82;

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
