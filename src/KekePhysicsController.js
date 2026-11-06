import * as THREE from 'three';

/**
 * Arcade drive with visible speed ramp + body lean
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 36;
    this.reverseMax = 7;
    this.acceleration = 42;
    this.brakingForce = 48;
    this.coastFriction = 3.2;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.lateral = 0;
    this.engineRPM = 0;
    this.roadLimit = 8.5;
    this._brakeHold = 0;
    this.lean = 0;
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(Number(throttle) || 0, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(Number(steer) || 0, -1, 1);
  }

  bindWheels() {}

  update(delta) {
    const dt = THREE.MathUtils.clamp(delta || 0.016, 0.001, 0.05);
    const throttle = this.throttleInput;
    const top = Math.max(28, this.maxSpeed || 36);

    if (throttle > 0.05) {
      if (this.velocity < 0) this.velocity += 25 * dt;
      this._brakeHold = 0;
      const ratio = THREE.MathUtils.clamp(Math.max(0, this.velocity) / top, 0, 1);
      // Punchy low-end, still climbs to top
      const push = this.acceleration * throttle * (1.5 - ratio * 0.65);
      this.velocity += push * dt;
      if (this.velocity > top) this.velocity = top;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.2) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
        if (this.velocity < 0) this.velocity = 0;
        this._brakeHold = 0;
      } else {
        this.velocity = 0;
        this._brakeHold += dt;
        if (this._brakeHold > 0.25) {
          this.velocity = -Math.min(this.reverseMax, (this._brakeHold - 0.25) * 10);
        }
      }
    } else {
      this._brakeHold = 0;
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.coastFriction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.coastFriction * 1.2 * dt);
    }

    if (Math.abs(this.velocity) < 0.06) this.velocity = 0;
    this.currentSpeed = Math.abs(this.velocity);

    // Steering
    const latMax = 18 / (1 + this.currentSpeed * 0.022);
    const targetLat = -this.steerInput * latMax;
    this.lateral += (targetLat - this.lateral) * Math.min(1, 14 * dt);
    if (Math.abs(this.steerInput) < 0.04) this.lateral *= 0.78;

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;
    if (this.group.position.y < 0) this.group.position.y = 0;

    // Lean / pitch for 3D feel (not flat)
    const targetLean = this.steerInput * 0.18 * Math.min(1, this.currentSpeed / 12);
    this.lean += (targetLean - this.lean) * Math.min(1, 8 * dt);
    const pitch = THREE.MathUtils.clamp(-this.velocity * 0.004, -0.06, 0.08);
    this.group.rotation.z = -this.lean;
    this.group.rotation.x = pitch;
    this.group.rotation.y = 0;

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
