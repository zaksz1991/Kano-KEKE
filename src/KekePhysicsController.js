import * as THREE from 'three';

/**
 * Stable arcade drive – NO forward/back oscillation
 * - World +Z only when going forward
 * - Reverse only after a full stop while holding brake
 * - Facing locked forward (no flip jitter)
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 24;
    this.reverseMax = 6;
    this.acceleration = 18;
    this.brakingForce = 28;
    this.coastFriction = 6;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.lateral = 0;
    this.engineRPM = 0;
    this.roadLimit = 8.5;
    this._brakeHold = 0;
    this._baseMax = 24;
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(Number(throttle) || 0, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(Number(steer) || 0, -1, 1);
  }

  bindWheels() {}

  update(delta) {
    const dt = THREE.MathUtils.clamp(delta || 0.016, 0.001, 0.033);
    const throttle = this.throttleInput;

    // Remember designer max (fatigue/prayer should change maxSpeed, not multiply v every frame)
    if (this.maxSpeed > this._baseMax) this._baseMax = this.maxSpeed;

    if (throttle > 0.05) {
      // Forward only – clear any tiny reverse noise
      if (this.velocity < 0) this.velocity = 0;
      this._brakeHold = 0;
      const top = Math.max(8, this.maxSpeed);
      const headroom = 1 - THREE.MathUtils.clamp(this.velocity / top, 0, 1);
      this.velocity += this.acceleration * throttle * (0.45 + 0.55 * headroom) * dt;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.15) {
        // Brake to stop – never jump into reverse mid-motion
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
        if (this.velocity < 0) this.velocity = 0;
        this._brakeHold = 0;
      } else {
        // Must hold brake briefly at rest before reverse
        this.velocity = 0;
        this._brakeHold += dt;
        if (this._brakeHold > 0.25) {
          this.velocity = -Math.min(this.reverseMax, (this._brakeHold - 0.25) * 8);
        }
      }
    } else {
      this._brakeHold = 0;
      if (this.velocity > 0) {
        this.velocity = Math.max(0, this.velocity - this.coastFriction * dt);
      } else if (this.velocity < 0) {
        this.velocity = Math.min(0, this.velocity + this.coastFriction * dt);
      }
    }

    // Kill micro-jitter around zero (this was the "same place" shake)
    if (Math.abs(this.velocity) < 0.12) this.velocity = 0;

    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.reverseMax, Math.max(8, this.maxSpeed));
    this.currentSpeed = Math.abs(this.velocity);

    // Lateral
    const latMax = 22 / (1 + this.currentSpeed * 0.025);
    const targetLat = this.steerInput * latMax;
    this.lateral += (targetLat - this.lateral) * Math.min(1, 20 * dt);
    if (Math.abs(this.steerInput) > 0.9) {
      this.lateral = targetLat * 0.85 + this.lateral * 0.15;
    }
    if (Math.abs(this.steerInput) < 0.05) {
      this.lateral *= 0.85;
    }

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;
    this.group.position.y = 0;

    // Face FORWARD always while moving forward or stopped – no flip at -0.3
    if (this.velocity < -1.0) {
      this.group.rotation.set(0, Math.PI, 0);
    } else {
      this.group.rotation.set(0, 0, 0);
    }

    if (this.group.position.x > this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.roadLimit, 0.25);
      this.lateral = Math.min(0, this.lateral);
    } else if (this.group.position.x < -this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, -this.roadLimit, 0.25);
      this.lateral = Math.max(0, this.lateral);
    }

    this.engineRPM = THREE.MathUtils.clamp(this.currentSpeed / Math.max(8, this.maxSpeed), 0, 1);
  }
}
