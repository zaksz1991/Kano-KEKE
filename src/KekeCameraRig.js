import * as THREE from 'three';

/**
 * Hard-follow chase camera – NO spring rubber-band (was causing snap-back look)
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;
    this.idealOffset = new THREE.Vector3(0, 3.6, -7.5);
    this.lookAtOffset = new THREE.Vector3(0, 1.2, 8);
    this.baseFov = 58;
    this.maxFov = 62;
    this._shakeAmp = 0;
    this.mode = 'chase';
    this.modes = {
      chase: { offset: new THREE.Vector3(0, 3.6, -7.5), look: new THREE.Vector3(0, 1.2, 8), fov: 58 },
      near: { offset: new THREE.Vector3(0, 3.0, -5.5), look: new THREE.Vector3(0, 1.1, 6), fov: 60 },
      wide: { offset: new THREE.Vector3(0, 4.5, -10), look: new THREE.Vector3(0, 1.3, 10), fov: 55 },
      hood: { offset: new THREE.Vector3(0, 1.6, 0.3), look: new THREE.Vector3(0, 1.2, 10), fov: 70 }
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
    // Direct follow – camera is always glued behind the keke
    const desiredX = t.x + this.idealOffset.x;
    const desiredY = t.y + this.idealOffset.y;
    const desiredZ = t.z + this.idealOffset.z;

    // Light smooth only on X/Y; Z is hard-follow so road never rubber-bands
    this.camera.position.x += (desiredX - this.camera.position.x) * 0.2;
    this.camera.position.y += (desiredY - this.camera.position.y) * 0.2;
    this.camera.position.z = desiredZ; // HARD lock Z to vehicle

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

    const ratio = THREE.MathUtils.clamp((speed || 0) / 26, 0, 1);
    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.3);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 0.08);
    this.camera.updateProjectionMatrix();
  }
}
