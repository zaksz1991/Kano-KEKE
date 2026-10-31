import * as THREE from 'three';

/**
 * Punchy arcade accel – strong launch, smooth top end, no oscillation
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 34;
    this.reverseMax = 6;
    this.acceleration = 55; // strong arcade launch
    this.brakingForce = 36;
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
    const top = Math.max(14, this.maxSpeed || 28);

    if (throttle > 0.04) {
      if (this.velocity < 0) this.velocity = 0;
      this._brakeHold = 0;

      // Launch boost from standstill, then ease near top speed
      const ratio = THREE.MathUtils.clamp(this.velocity / top, 0, 1);
      const launch = 1.6 - ratio * 0.5; // strong launch, still eases at top
      this.velocity += this.acceleration * throttle * launch * dt;
    } else if (throttle < -0.04) {
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

    // Only kill true noise – was 0.2 and ate the first frames of accel
    if (Math.abs(this.velocity) < 0.08) this.velocity = 0;

    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.reverseMax, top);
    this.currentSpeed = Math.abs(this.velocity);

    // Steer: left(+1) → -X
    const latMax = 26 / (1 + this.currentSpeed * 0.02);
    const targetLat = -this.steerInput * latMax;
    this.lateral += (targetLat - this.lateral) * Math.min(1, 22 * dt);
    if (Math.abs(this.steerInput) > 0.85) {
      this.lateral = targetLat * 0.9 + this.lateral * 0.1;
    }
    if (Math.abs(this.steerInput) < 0.05) this.lateral *= 0.8;

    this.group.position.x += this.lateral * dt;
    this.group.position.z += this.velocity * dt;
    this.group.position.y = 0;
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
