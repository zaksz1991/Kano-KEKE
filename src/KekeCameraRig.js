import * as THREE from 'three';

/**
 * Chase camera – framed so keke is not oversized on screen
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;
    // Farther + higher so vehicle reads at natural size
    this.idealOffset = new THREE.Vector3(0, 4.2, -11.5);
    this.lookAtOffset = new THREE.Vector3(0, 1.0, 10);
    this.baseFov = 55;
    this.maxFov = 62;
    this._shakeAmp = 0;
    this.mode = 'chase';
    this.modes = {
      chase: { offset: new THREE.Vector3(0, 4.2, -11.5), look: new THREE.Vector3(0, 1.0, 10), fov: 55 },
      near: { offset: new THREE.Vector3(0, 3.4, -8.0), look: new THREE.Vector3(0, 1.0, 7), fov: 58 },
      wide: { offset: new THREE.Vector3(0, 5.5, -15), look: new THREE.Vector3(0, 1.2, 12), fov: 52 },
      hood: { offset: new THREE.Vector3(0, 1.8, 0.4), look: new THREE.Vector3(0, 1.2, 12), fov: 68 }
    };
    this._snapToTarget();
  }

  _snapToTarget() {
    const t = this.target.position;
    this.camera.position.set(
      t.x + this.idealOffset.x,
      t.y + this.idealOffset.y,
      t.z + this.idealOffset.z
    );
    this.camera.lookAt(
      t.x + this.lookAtOffset.x,
      t.y + this.lookAtOffset.y,
      t.z + this.lookAtOffset.z
    );
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this._shakeAmp = 0;
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
    if (amount > this._shakeAmp) this._shakeAmp = amount;
  }

  update(delta, speed = 0) {
    const t = this.target.position;
    const desiredX = t.x + this.idealOffset.x;
    const desiredY = t.y + this.idealOffset.y;
    const desiredZ = t.z + this.idealOffset.z;

    this.camera.position.x += (desiredX - this.camera.position.x) * 0.18;
    this.camera.position.y += (desiredY - this.camera.position.y) * 0.18;
    this.camera.position.z = desiredZ;

    if (this._shakeAmp > 0.02) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmp * 0.4;
      this._shakeAmp *= 0.8;
    } else {
      this._shakeAmp = 0;
    }

    this.camera.lookAt(
      t.x + this.lookAtOffset.x,
      t.y + this.lookAtOffset.y,
      t.z + this.lookAtOffset.z
    );

    const ratio = THREE.MathUtils.clamp((speed || 0) / 28, 0, 1);
    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.35);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 0.08);
    this.camera.updateProjectionMatrix();
  }
}
