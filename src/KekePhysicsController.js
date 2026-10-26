import * as THREE from 'three';

/**
 * Simple, reliable keke physics – prioritizes responsiveness
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 28;
    this.reverseMax = 8;
    this.acceleration = 18;   // snappy
    this.brakingForce = 28;
    this.friction = 6;
    this.steeringAngle = 0;
    this.maxSteerAngle = 0.7;
    this.throttleInput = 0;
    this.steerInput = 0;
    this.wheelRotation = 0;
    this.leanAngle = 0;
    this.engineRPM = 0;
    this.frontWheel = null;
    this.rearWheels = [];
  }

  setInput(throttle, steer) {
    this.throttleInput = Math.max(-1, Math.min(1, throttle || 0));
    this.steerInput = Math.max(-1, Math.min(1, steer || 0));
  }

  bindWheels(model) {
    if (!model) return;
    model.traverse((node) => {
      const name = (node.name || '').toLowerCase();
      if (!node.isMesh && !node.isGroup) return;
      if (name.includes('wheel') || name.includes('tyre') || name.includes('tire')) {
        if (name.includes('front') && !this.frontWheel) this.frontWheel = node;
        else this.rearWheels.push(node);
      }
    });
  }

  update(delta) {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);

    // Accelerate / brake
    if (this.throttleInput > 0.01) {
      this.velocity += this.acceleration * this.throttleInput * dt;
    } else if (this.throttleInput < -0.01) {
      if (this.velocity > 0.2) {
        this.velocity -= this.brakingForce * Math.abs(this.throttleInput) * dt;
      } else {
        this.velocity += this.acceleration * 0.5 * this.throttleInput * dt;
      }
    } else {
      // coast
      if (this.velocity > 0) this.velocity = Math.max(0, this.velocity - this.friction * dt);
      else if (this.velocity < 0) this.velocity = Math.min(0, this.velocity + this.friction * dt);
    }

    this.velocity = Math.max(-this.reverseMax, Math.min(this.maxSpeed, this.velocity));
    this.currentSpeed = Math.abs(this.velocity);

    // Steering
    if (Math.abs(this.steerInput) > 0.01 && this.currentSpeed > 0.3) {
      const turn = this.steerInput * this.velocity * 0.12 * dt;
      this.group.rotation.y += turn;
      this.leanAngle = THREE.MathUtils.lerp(this.leanAngle, -this.steerInput * 0.25, 0.15);
    } else {
      this.leanAngle = THREE.MathUtils.lerp(this.leanAngle, 0, 0.1);
    }
    this.group.rotation.z = this.leanAngle;

    // MOVE – world space based on facing direction (most reliable)
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(direction, this.velocity * dt);

    // Keep on ground
    this.group.position.y = 0;

    this.wheelRotation += this.velocity * dt * 2.5;
    if (this.frontWheel) this.frontWheel.rotation.x = this.wheelRotation;
    this.rearWheels.forEach((w) => { w.rotation.x = this.wheelRotation; });

    this.engineRPM = Math.min(1, this.currentSpeed / this.maxSpeed);
  }
}
