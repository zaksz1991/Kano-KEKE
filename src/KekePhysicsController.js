import * as THREE from 'three';

/**
 * Arcade dual-road physics
 * - Speed is along world +Z only (no curved path / back-forth from yaw)
 * - Steering slides on X (lanes)
 * - Facing locked forward (stable camera + road)
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0; // +Z forward, -Z reverse
    this.currentSpeed = 0;
    this.maxSpeed = 24;
    this.reverseMax = 7;
    this.acceleration = 16;
    this.brakingForce = 24;
    this.coastFriction = 5;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.lateral = 0; // smoothed lateral velocity
    this.engineRPM = 0;
    this.roadLimit = 7.0;
    this.laneAssist = false; // off – was fighting the player
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(Number(throttle) || 0, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(Number(steer) || 0, -1, 1);
  }

  bindWheels() {}

  update(delta) {
    const dt = THREE.MathUtils.clamp(delta || 0.016, 0.001, 0.033);

    // --- Forward speed (world Z only) ---
    const throttle = this.throttleInput;
    if (throttle > 0.05) {
      const top = Math.max(8, this.maxSpeed);
      const headroom = 1 - THREE.MathUtils.clamp(Math.max(0, this.velocity) / top, 0, 1);
      this.velocity += this.acceleration * throttle * (0.4 + 0.6 * headroom) * dt;
    } else if (throttle < -0.05) {
      if (this.velocity > 0.5) {
        this.velocity -= this.brakingForce * Math.abs(throttle) * dt;
      } else {
        this.velocity += this.acceleration * 0.45 * throttle * dt;
      }
    } else {
      const f = this.coastFriction * dt;
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - f);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + f);
    }

    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.reverseMax, Math.max(8, this.maxSpeed));
    this.currentSpeed = Math.abs(this.velocity);

    // --- Lateral steer (X) – responsive, not yaw spin ---
    // Higher speed = slightly less lateral authority
    const latMax = 14 / (1 + this.currentSpeed * 0.04);
    const targetLat = this.steerInput * latMax;
    this.lateral += (targetLat - this.lateral) * Math.min(1, 8 * dt);

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;
    this.group.position.y = 0;

    // Face down the road (or reverse)
    this.group.rotation.set(0, this.velocity < -0.3 ? Math.PI : 0, 0);

    // Soft road edges
    if (this.group.position.x > this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, this.roadLimit, 0.2);
      this.lateral *= 0.3;
    } else if (this.group.position.x < -this.roadLimit) {
      this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, -this.roadLimit, 0.2);
      this.lateral *= 0.3;
    }

    this.engineRPM = THREE.MathUtils.clamp(this.currentSpeed / Math.max(8, this.maxSpeed), 0, 1);
  }
}
