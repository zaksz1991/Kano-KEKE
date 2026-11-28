import * as THREE from 'three';

/**
 * NAPEP physics — stable forward speed, mild lean, no phantom tilt
 */
export class KekePhysicsController {
  constructor(group) {
    this.group = group;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 36;
    this.accelForce = 28;
    this.brakingForce = 42;
    this.coastFriction = 10;
    this.reverseMax = 7;
    this.steerInput = 0;
    this.lateral = 0;
    this.lean = 0;
    this.engineRPM = 0;
    this.roadLimit = 8.5;
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(Number(throttle) || 0, -1, 1);
    // steer: -1 left, +1 right (screen/control space)
    this.steerInput = THREE.MathUtils.clamp(Number(steer) || 0, -1, 1);
  }

  update(dt) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    const throttle = this.throttleInput || 0;
    const top = Math.max(28, this.maxSpeed || 36);

    if (throttle > 0.05) {
      if (this.velocity < 0) this.velocity += 40 * dt;
      const ratio = THREE.MathUtils.clamp(Math.max(0, this.velocity) / top, 0, 1);
      const push = this.accelForce * (1 - ratio * 0.72) * throttle;
      this.velocity += push * dt;
      if (this.velocity > top) this.velocity = top;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.15) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
        if (this.velocity < 0) this.velocity = 0;
      } else {
        const rev = this.reverseMax * Math.abs(throttle);
        if (this.velocity > -rev) this.velocity -= 18 * dt;
        if (this.velocity < -rev) this.velocity = -rev;
      }
    } else {
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.coastFriction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.coastFriction * 1.4 * dt);
    }

    if (Math.abs(this.velocity) < 0.05) this.velocity = 0;
    this.currentSpeed = Math.abs(this.velocity);

    // Steering — only when moving; speed-scaled
    const speedFactor = THREE.MathUtils.clamp(this.currentSpeed / 8, 0.15, 1);
    const latMax = 11 * speedFactor;
    if (Math.abs(this.steerInput) < 0.04) {
      this.lateral *= 0.5;
      if (Math.abs(this.lateral) < 0.12) this.lateral = 0;
    } else {
      // Positive steer (right) → positive X (Nigeria right-hand road)
      const targetLat = this.steerInput * latMax;
      this.lateral += (targetLat - this.lateral) * Math.min(1, 10 * dt);
    }

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;

    // Mild lean only (was too extreme / “instant mesh” look)
    const targetLean = this.steerInput * 0.07 * Math.min(1, this.currentSpeed / 14);
    this.lean += (targetLean - this.lean) * Math.min(1, 6 * dt);
    if (Math.abs(this.lean) < 0.002) this.lean = 0;
    // Lean into turn: right steer → slight negative Z roll (visual)
    this.group.rotation.z = -this.lean;
    this.group.rotation.x = THREE.MathUtils.clamp(-this.velocity * 0.002, -0.04, 0.05);
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
