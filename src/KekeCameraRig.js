import * as THREE from 'three';

/**
 * Chase cam with speed FOV and lag for motion feel
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;
    this.idealOffset = new THREE.Vector3(0, 4.2, -11.0);
    this.lookAtOffset = new THREE.Vector3(0, 1.1, 9);
    this.baseFov = 56;
    this._shakeAmp = 0;
    this.mode = 'chase';
    this.modes = {
      chase: { offset: new THREE.Vector3(0, 4.2, -11.0), look: new THREE.Vector3(0, 1.1, 9), fov: 56 },
      near: { offset: new THREE.Vector3(0, 3.2, -7.5), look: new THREE.Vector3(0, 1.0, 7), fov: 60 },
      wide: { offset: new THREE.Vector3(0, 5.2, -14.5), look: new THREE.Vector3(0, 1.2, 12), fov: 52 },
      hood: { offset: new THREE.Vector3(0, 1.7, 0.5), look: new THREE.Vector3(0, 1.2, 12), fov: 70 }
    };
    this._snapToTarget();
  }

  _snapToTarget() {
    const t = this.target.position;
    this.camera.position.set(t.x + this.idealOffset.x, t.y + this.idealOffset.y, t.z + this.idealOffset.z);
    this.camera.lookAt(t.x + this.lookAtOffset.x, t.y + this.lookAtOffset.y, t.z + this.lookAtOffset.z);
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
    const spd = Math.max(0, speed || 0);
    // Pull back slightly at speed
    const zOff = this.idealOffset.z - Math.min(4, spd * 0.12);
    const desiredX = t.x + this.idealOffset.x;
    const desiredY = t.y + this.idealOffset.y;
    const desiredZ = t.z + zOff;

    const follow = Math.min(1, 0.22 + spd * 0.004);
    this.camera.position.x += (desiredX - this.camera.position.x) * follow;
    this.camera.position.y += (desiredY - this.camera.position.y) * follow;
    this.camera.position.z += (desiredZ - this.camera.position.z) * Math.min(1, 0.35);

    if (this._shakeAmp > 0.02) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmp * 0.35;
      this._shakeAmp *= 0.82;
    } else this._shakeAmp = 0;

    const look = new THREE.Vector3(
      t.x + this.lookAtOffset.x,
      t.y + this.lookAtOffset.y,
      t.z + this.lookAtOffset.z
    );
    this.camera.lookAt(look);

    const fov = this.baseFov + Math.min(10, spd * 0.28);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
