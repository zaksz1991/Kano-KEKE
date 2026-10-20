// KekeCameraRig.js
import * as THREE from 'three';

export class KekeCameraRig {
  constructor(camera, targetMesh) {
    this.camera = camera;
    this.targetMesh = targetMesh;
    this.idealOffset = new THREE.Vector3(0, 2.8, -5.5);
    this.idealLookAt = new THREE.Vector3(0, 1.0, 1.5);
    this.currentLookAt = new THREE.Vector3();
    this.baseFOV = 60;
  }

  update(delta, currentSpeed, maxSpeed) {
    const worldOffset = this.idealOffset.clone().applyQuaternion(this.targetMesh.quaternion);
    const targetPosition = this.targetMesh.position.clone().add(worldOffset);
    this.camera.position.lerp(targetPosition, 0.12);

    const worldLookAt = this.idealLookAt.clone().applyQuaternion(this.targetMesh.quaternion);
    const targetLookAt = this.targetMesh.position.clone().add(worldLookAt);
    this.currentLookAt.lerp(targetLookAt, 0.18);
    this.camera.lookAt(this.currentLookAt);

    const speedRatio = Math.abs(currentSpeed) / maxSpeed;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.baseFOV + (speedRatio * 14), 0.05);
    this.camera.updateProjectionMatrix();
  }
}