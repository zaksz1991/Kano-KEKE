import * as THREE from 'three';

/**
 * Close chase camera – stays tight WHILE driving (not only at spawn)
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;

    // Tight follow distances (local space behind keke)
    this.idealOffset = new THREE.Vector3(0, 2.0, -3.0);
    this.lookAtOffset = new THREE.Vector3(0, 1.05, 3.5);
    this.currentPos = new THREE.Vector3();
    this.lookAtPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    // Snappy follow so it doesn't lag and leave keke far ahead
    this.stiffness = 48;
    this.damping = 14;
    this.lookStiffness = 22;
    this.baseFov = 65;
    this.maxFov = 72;
    this.mode = 'near';

    this.modes = {
      // z is behind the vehicle (negative local Z)
      near: { offset: new THREE.Vector3(0, 2.0, -3.0), look: new THREE.Vector3(0, 1.05, 3.5), fov: 66 },
      chase: { offset: new THREE.Vector3(0, 2.5, -4.2), look: new THREE.Vector3(0, 1.1, 5), fov: 62 },
      hood: { offset: new THREE.Vector3(0, 1.55, 0.15), look: new THREE.Vector3(0, 1.2, 8), fov: 75 }
    };

    this._snapToTarget();
  }

  _snapToTarget() {
    const offset = this.idealOffset.clone().applyQuaternion(this.target.quaternion);
    this.currentPos.copy(this.target.position).add(offset);
    this.lookAtPos.copy(this.target.position).add(
      this.lookAtOffset.clone().applyQuaternion(this.target.quaternion)
    );
    this.velocity.set(0, 0, 0);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.lookAtPos);
  }

  setMode(mode) {
    if (!this.modes[mode]) return this.mode;
    this.mode = mode;
    const m = this.modes[mode];
    this.idealOffset.copy(m.offset);
    this.lookAtOffset.copy(m.look);
    this.baseFov = m.fov;
    this._snapToTarget();
    return this.mode;
  }

  cycleMode() {
    const order = ['near', 'chase', 'hood'];
    const i = order.indexOf(this.mode);
    return this.setMode(order[(i + 1) % order.length]);
  }

  update(delta, speed = 0) {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const ratio = THREE.MathUtils.clamp(speed / 28, 0, 1);

    // Stay close while moving – only slight pull-back at high speed
    const offset = this.idealOffset.clone();
    offset.z -= ratio * 0.45; // was 1.2 (too far)
    offset.y += ratio * 0.2;

    const desired = new THREE.Vector3()
      .copy(this.target.position)
      .add(offset.applyQuaternion(this.target.quaternion));

    // Blend spring with direct lerp so camera cannot fall far behind
    const force = desired.clone().sub(this.currentPos).multiplyScalar(this.stiffness);
    this.velocity.addScaledVector(force, dt);
    this.velocity.multiplyScalar(Math.max(0, 1 - this.damping * dt));
    this.currentPos.addScaledVector(this.velocity, dt);
    // Hard catch-up: if lag > 4m, snap partially every frame
    const lag = this.currentPos.distanceTo(desired);
    if (lag > 2.5) {
      this.currentPos.lerp(desired, 0.35);
      this.velocity.multiplyScalar(0.5);
    } else {
      this.currentPos.lerp(desired, 1 - Math.exp(-10 * dt));
    }
    this.camera.position.copy(this.currentPos);

    const lookDesired = new THREE.Vector3()
      .copy(this.target.position)
      .add(this.lookAtOffset.clone().applyQuaternion(this.target.quaternion));
    this.lookAtPos.lerp(lookDesired, 1 - Math.exp(-this.lookStiffness * dt));
    this.camera.lookAt(this.lookAtPos);

    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.6);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 1 - Math.exp(-6 * dt));
    this.camera.updateProjectionMatrix();
  }
}
