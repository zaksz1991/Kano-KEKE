import * as THREE from 'three';

export class KekeCameraRig {
  constructor(camera, targetGroup) {
    this.camera = camera;
    this.target = targetGroup;
    this.idealOffset = new THREE.Vector3(0, 3.8, -7.5);
    this.lookAtOffset = new THREE.Vector3(0, 1.3, 8);
    this.currentPos = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.lookAtPos = new THREE.Vector3();
    this.stiffness = 22;
    this.damping = 10;
    this.lookStiffness = 14;
    this.baseFov = 60;
    this.maxFov = 74;

    this.currentPos.copy(this.target.position).add(
      this.idealOffset.clone().applyQuaternion(this.target.quaternion)
    );
    this.camera.position.copy(this.currentPos);
  }

  update(delta, speed = 0) {
    const dt = Math.min(delta, 0.05);
    const ratio = THREE.MathUtils.clamp(speed / 28, 0, 1);

    const offset = this.idealOffset.clone();
    offset.z -= ratio * 2.2;
    offset.y += ratio * 0.6;

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

    const fov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, ratio * 0.9);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();
  }
}
