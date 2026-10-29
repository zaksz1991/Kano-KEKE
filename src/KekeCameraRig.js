import * as THREE from 'three';

/**
 * Stable chase camera – no drift when parked, shake is one-shot
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;

    this.idealOffset = new THREE.Vector3(0, 3.4, -7.2);
    this.lookAtOffset = new THREE.Vector3(0, 1.2, 6.5);
    this.currentPos = new THREE.Vector3();
    this.lookAtPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this._shakeAmp = 0;

    this.stiffness = 24;
    this.damping = 12;
    this.lookStiffness = 12;
    this.baseFov = 58;
    this.maxFov = 66;
    this.mode = 'chase';

    this._yawQ = new THREE.Quaternion();
    this._euler = new THREE.Euler();

    this.modes = {
      chase: { offset: new THREE.Vector3(0, 3.4, -7.2), look: new THREE.Vector3(0, 1.2, 6.5), fov: 58 },
      near: { offset: new THREE.Vector3(0, 2.9, -5.6), look: new THREE.Vector3(0, 1.15, 5.5), fov: 60 },
      wide: { offset: new THREE.Vector3(0, 4.2, -9.5), look: new THREE.Vector3(0, 1.3, 8), fov: 55 },
      hood: { offset: new THREE.Vector3(0, 1.65, 0.2), look: new THREE.Vector3(0, 1.25, 9), fov: 72 }
    };

    this._snapToTarget();
  }

  _yawQuat() {
    this._euler.set(0, this.target.rotation.y, 0);
    this._yawQ.setFromEuler(this._euler);
    return this._yawQ;
  }

  _snapToTarget() {
    const q = this._yawQuat();
    this.currentPos.copy(this.target.position).add(this.idealOffset.clone().applyQuaternion(q));
    this.lookAtPos.copy(this.target.position).add(this.lookAtOffset.clone().applyQuaternion(q));
    this.velocity.set(0, 0, 0);
    this._shakeAmp = 0;
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.lookAtPos);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
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
    const order = ['chase', 'near', 'wide', 'hood'];
    return this.setMode(order[(order.indexOf(this.mode) + 1) % order.length]);
  }

  setShake(amount) {
    // Only raise shake, never called every frame with decaying value
    if (amount > this._shakeAmp) this._shakeAmp = amount;
  }

  update(delta, speed = 0) {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const q = this._yawQuat();

    // Parked: lock camera, kill residual spring + shake
    if (speed < 0.4) {
      this._shakeAmp = 0;
      this.velocity.set(0, 0, 0);
      const desired = this.target.position.clone().add(this.idealOffset.clone().applyQuaternion(q));
      this.currentPos.lerp(desired, 0.25);
      this.camera.position.copy(this.currentPos);
      const lookDesired = this.target.position.clone().add(this.lookAtOffset.clone().applyQuaternion(q));
      this.lookAtPos.lerp(lookDesired, 0.3);
      this.camera.lookAt(this.lookAtPos);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFov, 0.1);
      this.camera.updateProjectionMatrix();
      return;
    }

    const ratio = THREE.MathUtils.clamp(speed / 28, 0, 1);
    const offset = this.idealOffset.clone();
    offset.z -= ratio * 0.8;
    offset.y += ratio * 0.3;
    offset.applyQuaternion(q);

    const desired = this.target.position.clone().add(offset);
    const toDesired = desired.clone().sub(this.currentPos);
    this.velocity.addScaledVector(toDesired, this.stiffness * dt);
    this.velocity.multiplyScalar(Math.max(0, 1 - this.damping * dt));
    this.currentPos.addScaledVector(this.velocity, dt);

    if (this.currentPos.distanceTo(desired) > 12) {
      this.currentPos.lerp(desired, 0.35);
      this.velocity.multiplyScalar(0.3);
    }

    this.camera.position.copy(this.currentPos);

    // One-shot shake decay
    if (this._shakeAmp > 0.02) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmp * 0.4;
      this._shakeAmp *= 0.82;
    } else {
      this._shakeAmp = 0;
    }

    const lookDesired = this.target.position.clone().add(this.lookAtOffset.clone().applyQuaternion(q));
    this.lookAtPos.lerp(lookDesired, 1 - Math.exp(-this.lookStiffness * dt));
    this.camera.lookAt(this.lookAtPos);

    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.6);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 1 - Math.exp(-4 * dt));
    this.camera.updateProjectionMatrix();
  }
}
