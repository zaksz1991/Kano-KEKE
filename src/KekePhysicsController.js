import * as THREE from 'three';

/**
 * Production arcade keke physics (senior pass)
 * - Smooth throttle response
 * - Speed-sensitive steering with understeer
 * - Steer smoothing + yaw damping
 * - Soft road bounds + light lane assist
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 24;
    this.reverseMax = 6;
    this.acceleration = 13;
    this.brakingForce = 20;
    this.coastFriction = 3.8;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.steerAngle = 0;
    this.yawRate = 0;
    this.engineRPM = 0;
    this.roadLimit = 6.5;
    this.laneAssist = true;
    this._fwd = new THREE.Vector3();
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(Number(throttle) || 0, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(Number(steer) || 0, -1, 1);
  }

  bindWheels() {}

  update(delta) {
    const dt = THREE.MathUtils.clamp(delta || 0.016, 0.001, 0.033);

    // Throttle curve – progressive, not binary
    const throttle = this.throttleInput;
    if (throttle > 0.05) {
      const top = Math.max(8, this.maxSpeed);
      const headroom = 1 - THREE.MathUtils.clamp(this.velocity / top, 0, 1);
      this.velocity += this.acceleration * throttle * (0.35 + 0.65 * headroom) * dt;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.6) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
      } else {
        this.velocity += this.acceleration * 0.38 * throttle * dt;
      }
    } else {
      const f = this.coastFriction * dt;
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - f);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + f);
    }

    const max = Math.max(8, this.maxSpeed || 24);
    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.reverseMax, max);
    this.currentSpeed = Math.abs(this.velocity);

    // Steering: ease toward input, then limited yaw rate
    const steerLerp = 1 - Math.exp(-7 * dt);
    this.steerAngle += (this.steerInput - this.steerAngle) * steerLerp;

    if (this.currentSpeed > 0.4 && Math.abs(this.steerAngle) > 0.03) {
      const dirSign = this.velocity >= 0 ? 1 : -1;
      // Understeer curve: slow = agile, fast = wide arc
      const maxYaw = 0.95 / (1 + this.currentSpeed * 0.28);
      const desiredYaw = this.steerAngle * dirSign * maxYaw;
      this.yawRate += (desiredYaw - this.yawRate) * (1 - Math.exp(-9 * dt));
      this.group.rotation.y += this.yawRate * dt;
    } else {
      this.yawRate *= Math.exp(-6 * dt);
    }

    // Subtle body roll
    const lean = THREE.MathUtils.clamp(-this.steerAngle * this.currentSpeed * 0.01, -0.1, 0.1);
    this.group.rotation.z += (lean - this.group.rotation.z) * 0.12;

    this._fwd.set(0, 0, 1).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(this._fwd, this.velocity * dt);
    this.group.position.y = 0;

    // Soft walls
    const x = this.group.position.x;
    if (x > this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(x, this.roadLimit, 0.18);
      this.yawRate *= 0.4;
    } else if (x < -this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(x, -this.roadLimit, 0.18);
      this.yawRate *= 0.4;
    }

    // Lane assist only when hands off
    if (this.laneAssist && Math.abs(this.steerInput) < 0.1 && this.currentSpeed > 1.5) {
      const lane = x >= 0 ? 2.3 : -2.3;
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, lane, 0.015);
      this.yawRate *= 0.94;
    }

    this.engineRPM = THREE.MathUtils.clamp(this.currentSpeed / max, 0, 1);
  }
}
