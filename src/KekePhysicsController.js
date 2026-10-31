import * as THREE from 'three';

/**
 * Stable arcade drive – no in-place forward/back oscillation
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 24;
    this.reverseMax = 5;
    this.acceleration = 18;
    this.brakingForce = 30;
    this.coastFriction = 7;
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

    if (throttle > 0.05) {
      // Always go forward when accelerating – clear reverse junk
      if (this.velocity < 0) this.velocity = 0;
      this._brakeHold = 0;
      const top = Math.max(10, this.maxSpeed || 24);
      const headroom = 1 - THREE.MathUtils.clamp(this.velocity / top, 0, 1);
      this.velocity += this.acceleration * throttle * (0.5 + 0.5 * headroom) * dt;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.2) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
        if (this.velocity < 0) this.velocity = 0;
        this._brakeHold = 0;
      } else {
        this.velocity = 0;
        this._brakeHold += dt;
        // Reverse only after clear stop + hold
        if (this._brakeHold > 0.35) {
          this.velocity = -Math.min(this.reverseMax, (this._brakeHold - 0.35) * 6);
        }
      }
    } else {
      this._brakeHold = 0;
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.coastFriction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.coastFriction * dt);
    }

    // Hard zero – stops micro forward/back jitter
    if (Math.abs(this.velocity) < 0.2) this.velocity = 0;

    const top = Math.max(10, this.maxSpeed || 24);
    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.reverseMax, top);
    this.currentSpeed = Math.abs(this.velocity);

    // Lateral – INVERTED from previous (fix user report: left was going right)
    // steer +1 (right button) => +X was wrong for them; use opposite
    const latMax = 24 / (1 + this.currentSpeed * 0.02);
    const targetLat = -this.steerInput * latMax; // left(+1) → -X
    this.lateral += (targetLat - this.lateral) * Math.min(1, 22 * dt);
    if (Math.abs(this.steerInput) > 0.85) {
      this.lateral = targetLat * 0.9 + this.lateral * 0.1;
    }
    if (Math.abs(this.steerInput) < 0.05) this.lateral *= 0.8;

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;
    this.group.position.y = 0;

    // Never flip facing during normal drive
    this.group.rotation.set(0, 0, 0);

    if (this.group.position.x > this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.roadLimit, 0.3);
      this.lateral = Math.min(0, this.lateral);
    } else if (this.group.position.x < -this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, -this.roadLimit, 0.3);
      this.lateral = Math.max(0, this.lateral);
    }

    this.engineRPM = THREE.MathUtils.clamp(this.currentSpeed / top, 0, 1);
  }
}
