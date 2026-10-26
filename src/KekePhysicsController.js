import * as THREE from 'three';

/**
 * Professional 3-Wheeler (Keke Napep) Physics Controller
 * - Realistic acceleration / braking curve
 * - Speed-dependent steering
 * - Body lean on turns
 * - Wheel rotation for visual fidelity
 * - Ground friction & handbrake feel
 */
export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;           // signed forward speed (m/s)
    this.currentSpeed = 0;       // absolute
    this.maxSpeed = 22;          // ~80 km/h realistic for loaded keke
    this.reverseMax = 6;
    this.acceleration = 9.5;
    this.brakingForce = 18;
    this.engineBrake = 4.5;
    this.friction = 3.2;
    this.steeringAngle = 0;
    this.maxSteerAngle = 0.55;
    this.steerSpeed = 2.8;
    this.steerReturn = 4.5;

    this.throttleInput = 0;      // -1 .. 1
    this.steerInput = 0;         // -1 .. 1

    // Visual state
    this.wheelRotation = 0;
    this.leanAngle = 0;
    this.targetLean = 0;

    // Wheel meshes (filled later when model loads)
    this.frontWheel = null;
    this.rearWheels = [];

    // Exhaust / particle hook
    this.engineRPM = 0;
  }

  setInput(throttle, steer) {
    this.throttleInput = THREE.MathUtils.clamp(throttle, -1, 1);
    this.steerInput = THREE.MathUtils.clamp(steer, -1, 1);
  }

  /** Call after GLB is loaded to bind wheel meshes for rotation */
  bindWheels(model) {
    // Heuristic: look for nodes containing "wheel", "tyre", "tire", "front", "rear"
    model.traverse((node) => {
      const name = (node.name || '').toLowerCase();
      if (node.isMesh || node.isGroup) {
        if (name.includes('front') && (name.includes('wheel') || name.includes('tyre') || name.includes('tire'))) {
          this.frontWheel = node;
        } else if ((name.includes('rear') || name.includes('back')) && (name.includes('wheel') || name.includes('tyre') || name.includes('tire'))) {
          this.rearWheels.push(node);
        } else if (name.includes('wheel') || name.includes('tyre') || name.includes('tire')) {
          // fallback – treat first as front, others rear
          if (!this.frontWheel) this.frontWheel = node;
          else this.rearWheels.push(node);
        }
      }
    });
  }

  update(delta) {
    const dt = Math.min(delta, 0.05); // safety clamp

    // --- Longitudinal forces ---
    if (this.throttleInput > 0.05) {
      // Acceleration falls off as we approach max speed
      const speedRatio = this.currentSpeed / this.maxSpeed;
      const accel = this.acceleration * (1 - speedRatio * 0.65) * this.throttleInput;
      this.velocity += accel * dt;
    } else if (this.throttleInput < -0.05) {
      // Braking or reverse
      if (this.velocity > 0.3) {
        this.velocity -= this.brakingForce * Math.abs(this.throttleInput) * dt;
      } else {
        this.velocity += this.throttleInput * (this.acceleration * 0.6) * dt;
      }
    } else {
      // Engine braking + rolling resistance
      if (Math.abs(this.velocity) > 0.05) {
        const sign = Math.sign(this.velocity);
        this.velocity -= sign * (this.engineBrake + this.friction) * dt;
        if (Math.sign(this.velocity) !== sign) this.velocity = 0;
      } else {
        this.velocity = 0;
      }
    }

    this.velocity = THREE.MathUtils.clamp(this.velocity, -this.reverseMax, this.maxSpeed);
    this.currentSpeed = Math.abs(this.velocity);

    // Weather grip (set by KanoWeatherManager)
    if (this._weatherGrip !== undefined && this._weatherGrip < 1) {
      // Slight loss of traction – velocity drifts toward lower magnitude
      this.velocity *= 1 - (1 - this._weatherGrip) * 0.015;
    }

    // --- Steering (speed dependent) ---
    const speedFactor = THREE.MathUtils.clamp(this.currentSpeed / 8, 0.15, 1);
    if (Math.abs(this.steerInput) > 0.02 && this.currentSpeed > 0.4) {
      this.steeringAngle += this.steerInput * this.steerSpeed * speedFactor * dt;
    } else {
      // Auto-center
      this.steeringAngle *= (1 - this.steerReturn * dt);
    }
    this.steeringAngle = THREE.MathUtils.clamp(this.steeringAngle, -this.maxSteerAngle, this.maxSteerAngle);

    // Yaw rate
    if (this.currentSpeed > 0.3) {
      const turnRate = (this.velocity / this.maxSpeed) * this.steeringAngle * 2.35;
      this.group.rotation.y += turnRate * dt;
    }

    // Forward translation in local space
    this.group.translateZ(this.velocity * dt);

    // --- Visual lean (tricycle feel) ---
    this.targetLean = -this.steeringAngle * 0.35 * THREE.MathUtils.clamp(this.currentSpeed / 12, 0, 1);
    this.leanAngle = THREE.MathUtils.lerp(this.leanAngle, this.targetLean, 1 - Math.exp(-8 * dt));
    this.group.rotation.z = this.leanAngle;

    // --- Wheel spin ---
    const wheelCircumference = 2.1; // approx meters
    const rotationDelta = (this.velocity * dt) / (wheelCircumference / (2 * Math.PI));
    this.wheelRotation += rotationDelta;

    if (this.frontWheel) {
      this.frontWheel.rotation.x = this.wheelRotation;
      // Steering visual on front wheel if it has a parent pivot
      if (this.frontWheel.parent) {
        this.frontWheel.parent.rotation.y = this.steeringAngle * 0.7;
      }
    }
    this.rearWheels.forEach(w => {
      w.rotation.x = this.wheelRotation;
    });

    // Engine RPM (0-1) for audio / particles
    this.engineRPM = THREE.MathUtils.clamp(
      (this.currentSpeed / this.maxSpeed) * 0.7 + Math.abs(this.throttleInput) * 0.3,
      0, 1
    );
  }
}
