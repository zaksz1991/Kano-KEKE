import * as THREE from 'three';

export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;
    // Close chase – keke fills the frame
    this.idealOffset = new THREE.Vector3(0, 2.6, -4.8);
    this.lookAtOffset = new THREE.Vector3(0, 1.1, 5);
    this.currentPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.lookAtPos = new THREE.Vector3();
    this.stiffness = 28;
    this.damping = 12;
    this.lookStiffness = 16;
    this.baseFov = 62;
    this.maxFov = 76;
    this.mode = 'near';
    this.modes = {
      chase: { offset: new THREE.Vector3(0, 3.2, -6.2), look: new THREE.Vector3(0, 1.2, 7), fov: 60 },
      near: { offset: new THREE.Vector3(0, 2.6, -4.8), look: new THREE.Vector3(0, 1.1, 5), fov: 64 },
      hood: { offset: new THREE.Vector3(0, 1.7, -0.2), look: new THREE.Vector3(0, 1.3, 9), fov: 74 }
    };
    this.currentPos.copy(this.target.position).add(
      this.idealOffset.clone().applyQuaternion(this.target.quaternion)
    );
    this.camera.position.copy(this.currentPos);
  }

  setMode(mode) {
    if (!this.modes[mode]) return this.mode;
    this.mode = mode;
    const m = this.modes[mode];
    this.idealOffset.copy(m.offset);
    this.lookAtOffset.copy(m.look);
    this.baseFov = m.fov;
    return this.mode;
  }

  cycleMode() {
    const order = ['near', 'chase', 'hood'];
    const i = order.indexOf(this.mode);
    return this.setMode(order[(i + 1) % order.length]);
  }

  update(delta, speed = 0) {
    const dt = Math.min(delta, 0.05);
    const ratio = THREE.MathUtils.clamp(speed / 26, 0, 1);
    const offset = this.idealOffset.clone();
    offset.z -= ratio * 1.2;
    offset.y += ratio * 0.35;

    const desired = this.target.position.clone().add(
      offset.applyQuaternion(this.target.quaternion)
    );
    const force = desired.sub(this.currentPos).multiplyScalar(this.stiffness);
    this.velocity.add(force.multiplyScalar(dt));
    this.velocity.multiplyScalar(1 - this.damping * dt);
    this.currentPos.add(this.velocity.clone().multiplyScalar(dt));
    this.camera.position.copy(this.currentPos);

    const lookDesired = this.target.position.clone().add(
      this.lookAtOffset.clone().applyQuaternion(this.target.quaternion)
    );
    this.lookAtPos.lerp(lookDesired, 1 - Math.exp(-this.lookStiffness * dt));
    this.camera.lookAt(this.lookAtPos);

    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.85);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 1 - Math.exp(-6 * dt));
    this.camera.updateProjectionMatrix();
  }
}
