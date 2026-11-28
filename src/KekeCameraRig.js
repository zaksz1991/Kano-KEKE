import * as THREE from 'three';

/**
 * Stable chase cam — readable keke size, mild speed zoom, soft collision shake
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;
    const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
    // Mobile: a bit further back so vehicle isn't huge / tilt looks saner
    this.idealOffset = new THREE.Vector3(0, mob ? 4.6 : 4.2, mob ? -12.5 : -11.0);
    this.lookAtOffset = new THREE.Vector3(0, 1.15, 9);
    this.baseFov = mob ? 54 : 56;
    this._shakeAmp = 0;
    this.mode = 'chase';
    this.modes = {
      chase: {
        offset: new THREE.Vector3(0, mob ? 4.6 : 4.2, mob ? -12.5 : -11.0),
        look: new THREE.Vector3(0, 1.15, 9),
        fov: mob ? 54 : 56
      },
      near: {
        offset: new THREE.Vector3(0, 3.4, -8.5),
        look: new THREE.Vector3(0, 1.0, 7),
        fov: 58
      },
      wide: {
        offset: new THREE.Vector3(0, 5.5, -15.5),
        look: new THREE.Vector3(0, 1.2, 12),
        fov: 50
      },
      hood: {
        offset: new THREE.Vector3(0, 1.7, 0.5),
        look: new THREE.Vector3(0, 1.2, 12),
        fov: 68
      }
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
    // Cap shake so collision doesn't look like broken tilt
    const a = Math.min(0.35, amount || 0);
    if (a > this._shakeAmp) this._shakeAmp = a;
  }

  update(delta, speed = 0) {
    const t = this.target.position;
    const spd = Math.max(0, speed || 0);
    const zOff = this.idealOffset.z - Math.min(3.2, spd * 0.1);
    const desiredX = t.x + this.idealOffset.x;
    const desiredY = t.y + this.idealOffset.y;
    const desiredZ = t.z + zOff;

    const follow = Math.min(1, 0.18 + spd * 0.003);
    this.camera.position.x += (desiredX - this.camera.position.x) * follow;
    this.camera.position.y += (desiredY - this.camera.position.y) * follow;
    this.camera.position.z += (desiredZ - this.camera.position.z) * Math.min(1, 0.32);

    if (this._shakeAmp > 0.015) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmp * 0.7;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmp * 0.25;
      this._shakeAmp *= 0.78;
    } else this._shakeAmp = 0;

    this.camera.lookAt(
      t.x + this.lookAtOffset.x,
      t.y + this.lookAtOffset.y,
      t.z + this.lookAtOffset.z
    );

    const fov = this.baseFov + Math.min(7, spd * 0.2);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
