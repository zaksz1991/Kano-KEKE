import * as THREE from 'three';

export class KanoParticleSystem {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;

    this.smokeCount = 48;
    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeLifetimes = new Float32Array(this.smokeCount);
    this.smokeGeo = new THREE.BufferGeometry();

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLifetimes[i] = Math.random();
      this.resetSmokeParticle(i);
    }

    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x999999,
      size: 0.4,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    this.smokePoints = new THREE.Points(this.smokeGeo, smokeMat);
    this.scene.add(this.smokePoints);
  }

  resetSmokeParticle(index) {
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      0.35 + Math.random() * 0.15,
      -1.25
    ).applyQuaternion(this.keke.quaternion);
    const pos = this.keke.position.clone().add(offset);
    this.smokePositions[index * 3] = pos.x;
    this.smokePositions[index * 3 + 1] = pos.y;
    this.smokePositions[index * 3 + 2] = pos.z;
    this.smokeLifetimes[index] = 0;
  }

  update(delta, currentSpeed) {
    const positions = this.smokeGeo.attributes.position.array;
    const emit = currentSpeed > 1.5;

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLifetimes[i] += delta * (1.8 + currentSpeed * 0.08);

      if (this.smokeLifetimes[i] > 1.0) {
        if (emit) this.resetSmokeParticle(i);
        else this.smokeLifetimes[i] = 1.1; // keep dead until moving
      } else {
        positions[i * 3 + 1] += delta * 0.55;
        positions[i * 3] += (Math.random() - 0.5) * delta * 0.4;
      }
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
  }
}
