import * as THREE from 'three';

/**
 * Arcade-stable keke physics
 * - Steering is angular rate, not raw spin
 * - High speed = less turn (understeer)
 * - Smooth steer input lag (feels like weight)
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0; // m/s along facing
    this.currentSpeed = 0;
    this.maxSpeed = 24;
    this.reverseMax = 6;
    this.acceleration = 14;
    this.brakingForce = 22;
    this.friction = 4.5;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.steerAngle = 0; // smoothed wheel angle -1..1
    this.yawRate = 0;
    this.engineRPM = 0;
    this.roadLimit = 6.8;
    this._fwd = new THREE.Vector3();
  }

  setInput(throttle, steer) {
    this.throttleInput = Math.max(-1, Math.min(1, Number(throttle) || 0));
    this.steerInput = Math.max(-1, Math.min(1, Number(steer) || 0));
  }

  bindWheels() {}

  update(delta) {
    // Hard clamp – prevents freeze spikes after tab switch
    const dt = Math.min(Math.max(delta || 0.016, 0.001), 0.033);

    // --- Longitudinal ---
    if (this.throttleInput > 0.05) {
      const load = 1 - Math.min(0.5, this.currentSpeed / Math.max(1, this.maxSpeed));
      this.velocity += this.acceleration * this.throttleInput * load * dt;
    } else if (this.throttleInput < -0.05) {
      if (this.velocity > 0.5) {
        this.velocity -= this.brakingForce * Math.abs(this.throttleInput) * dt;
      } else {
        this.velocity += this.acceleration * 0.4 * this.throttleInput * dt;
      }
    } else {
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.friction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.friction * dt);
    }

    const max = Math.max(8, this.maxSpeed || 24);
    this.velocity = Math.max(-this.reverseMax, Math.min(max, this.velocity));
    this.currentSpeed = Math.abs(this.velocity);

    // --- Steering: smooth input, speed-limited yaw ---
    // Wheel angle lags behind finger (weight)
    const steerTarget = this.steerInput;
    this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1, 6 * dt);

    if (this.currentSpeed > 0.35 && Math.abs(this.steerAngle) > 0.02) {
      const sign = this.velocity >= 0 ? 1 : -1;
      // Max turn rate falls off hard with speed (real understeer feel)
      // At crawl ~1.1 rad/s, at 20 m/s ~0.25 rad/s
      const maxYaw = 1.05 / (1 + this.currentSpeed * 0.22);
      const targetYaw = this.steerAngle * sign * maxYaw;
      // Smooth yaw rate
      this.yawRate += (targetYaw - this.yawRate) * Math.min(1, 8 * dt);
      this.group.rotation.y += this.yawRate * dt;
    } else {
      this.yawRate *= 0.85;
    }

    // Light body lean for feedback (visual only)
    const lean = THREE.MathUtils.clamp(-this.steerAngle * this.currentSpeed * 0.012, -0.12, 0.12);
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, lean, 0.15);

    // Integrate position
    this._fwd.set(0, 0, 1).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(this._fwd, this.velocity * dt);
    this.group.position.y = 0;

    // Soft road edges
    const x = this.group.position.x;
    if (x > this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(x, this.roadLimit, 0.15);
      this.yawRate *= 0.5;
    } else if (x < -this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(x, -this.roadLimit, 0.15);
      this.yawRate *= 0.5;
    }

    this.engineRPM = Math.min(1, this.currentSpeed / max);
  }
}
