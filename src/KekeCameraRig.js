import * as THREE from 'three';

/**
 * Cinematic Spring-Damper Camera Rig for Keke
 * - Smooth follow with look-ahead
 * - Speed-based FOV and height
 * - Subtle camera shake on rough surface / high speed
 * - Third-person chase feel optimized for mobile + desktop
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;

    // Ideal offset in local space of the keke
    this.idealOffset = new THREE.Vector3(0, 4.8, -9.5);
    this.lookAtOffset = new THREE.Vector3(0, 1.4, 6);

    // Spring state
    this.currentPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.lookAtPos = new THREE.Vector3();

    this.stiffness = 18;
    this.damping = 9;
    this.lookStiffness = 12;

    this.baseFov = 58;
    this.maxFov = 72;
    this.shakeIntensity = 0;

    // Initialize
    this.currentPos.copy(this.target.position).add(
      this.idealOffset.clone().applyQuaternion(this.target.quaternion)
    );
    this.camera.position.copy(this.currentPos);
  }

  update(delta, speed = 0) {
    const dt = Math.min(delta, 0.05);
    const speedRatio = THREE.MathUtils.clamp(speed / 22, 0, 1);

    // Dynamic offset – pull back and raise slightly at speed
    const dynamicOffset = this.idealOffset.clone();
    dynamicOffset.z -= speedRatio * 2.5;
    dynamicOffset.y += speedRatio * 0.8;

    // Desired world position
    const desired = this.target.position.clone().add(
      dynamicOffset.applyQuaternion(this.target.quaternion)
    );

    // Spring-damper toward desired
    const force = desired.clone().sub(this.currentPos).multiplyScalar(this.stiffness);
    this.velocity.add(force.multiplyScalar(dt));
    this.velocity.multiplyScalar(1 - this.damping * dt);
    this.currentPos.add(this.velocity.clone().multiplyScalar(dt));

    // Subtle high-speed shake
    this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, speedRatio * 0.045, 0.1);
    if (this.shakeIntensity > 0.001) {
      this.currentPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.currentPos.y += (Math.random() - 0.5) * this.shakeIntensity * 0.6;
    }

    this.camera.position.copy(this.currentPos);

    // Look-ahead target
    const lookDesired = this.target.position.clone().add(
      this.lookAtOffset.clone().applyQuaternion(this.target.quaternion)
    );
    this.lookAtPos.lerp(lookDesired, 1 - Math.exp(-this.lookStiffness * dt));
    this.camera.lookAt(this.lookAtPos);

    // FOV punch
    const targetFov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, speedRatio * 0.85);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.exp(-4 * dt));
    this.camera.updateProjectionMatrix();
  }
}
