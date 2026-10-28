import * as THREE from 'three';

/**
 * Balanced third-person chase camera
 * Not too far (tiny keke mid-road), not too close (funny zoom)
 */
export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;

    // Comfortable arcade chase distance
    this.idealOffset = new THREE.Vector3(0, 3.4, -7.2);
    this.lookAtOffset = new THREE.Vector3(0, 1.2, 6.5);
    this.currentPos = new THREE.Vector3();
    this.lookAtPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    this.stiffness = 22;
    this.damping = 11;
    this.lookStiffness = 14;
    this.baseFov = 58;
    this.maxFov = 68;
    this.mode = 'chase';

    this.modes = {
      // Standard arcade – full vehicle + some road ahead
      chase: {
        offset: new THREE.Vector3(0, 3.4, -7.2),
        look: new THREE.Vector3(0, 1.2, 6.5),
        fov: 58
      },
      // Slightly tighter
      near: {
        offset: new THREE.Vector3(0, 2.9, -5.6),
        look: new THREE.Vector3(0, 1.15, 5.5),
        fov: 60
      },
      // Wider cinematic
      wide: {
        offset: new THREE.Vector3(0, 4.2, -9.5),
        look: new THREE.Vector3(0, 1.3, 8),
        fov: 55
      },
      hood: {
        offset: new THREE.Vector3(0, 1.65, 0.2),
        look: new THREE.Vector3(0, 1.25, 9),
        fov: 72
      }
    };

    this._shakeAmp = 0;
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
    if (this._shakeAmp > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmp * 0.6;
      this._shakeAmp *= 0.9;
    }
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

  setShake(amount) {
    this._shakeAmp = Math.max(this._shakeAmp || 0, amount);
  }

  cycleMode() {
    const order = ['chase', 'near', 'wide', 'hood'];
    const i = order.indexOf(this.mode);
    return this.setMode(order[(i + 1) % order.length]);
  }

  update(delta, speed = 0) {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const ratio = THREE.MathUtils.clamp(speed / 28, 0, 1);

    // Mild speed pull-back only
    const offset = this.idealOffset.clone();
    offset.z -= ratio * 0.9;
    offset.y += ratio * 0.35;

    const desired = new THREE.Vector3()
      .copy(this.target.position)
      .add(offset.applyQuaternion(this.target.quaternion));

    // Smooth spring – no aggressive snap that feels “stuck to bumper”
    const toDesired = desired.clone().sub(this.currentPos);
    this.velocity.addScaledVector(toDesired, this.stiffness * dt);
    this.velocity.multiplyScalar(Math.max(0, 1 - this.damping * dt));
    this.currentPos.addScaledVector(this.velocity, dt);

    // Soft catch-up if lag is large (e.g. after spawn)
    const lag = this.currentPos.distanceTo(desired);
    if (lag > 12) {
      this.currentPos.lerp(desired, 0.4);
      this.velocity.multiplyScalar(0.3);
    } else if (lag > 5) {
      this.currentPos.lerp(desired, 1 - Math.exp(-4 * dt));
    }

    this.camera.position.copy(this.currentPos);
    if (this._shakeAmp > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this._shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this._shakeAmp * 0.6;
      this._shakeAmp *= 0.9;
    }

    const lookDesired = new THREE.Vector3()
      .copy(this.target.position)
      .add(this.lookAtOffset.clone().applyQuaternion(this.target.quaternion));
    this.lookAtPos.lerp(lookDesired, 1 - Math.exp(-this.lookStiffness * dt));
    this.camera.lookAt(this.lookAtPos);

    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.7);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();
  }
}
