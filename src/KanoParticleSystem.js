import * as THREE from 'three';

export class KanoParticleSystem {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;

    // --- Exhaust Smoke Setup ---
    this.smokeCount = 40;
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeLifetimes = new Float32Array(this.smokeCount);

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLifetimes[i] = Math.random();
      this.resetSmokeParticle(i);
    }

    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    
    const smokeMat = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.35,
      transparent: true,
      opacity: 0.4,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.smokePoints = new THREE.Points(this.smokeGeo, smokeMat);
    this.scene.add(this.smokePoints);
  }

  resetSmokeParticle(index) {
    // Offset slightly behind Keke tailpipe
    const offset = new THREE.Vector3(0, 0.4, -1.3).applyQuaternion(this.keke.quaternion);
    const pos = this.keke.position.clone().add(offset);
    
    this.smokePositions[index * 3] = pos.x;
    this.smokePositions[index * 3 + 1] = pos.y;
    this.smokePositions[index * 3 + 2] = pos.z;
    this.smokeLifetimes[index] = 0;
  }

  update(delta, currentSpeed) {
    const positions = this.smokeGeo.attributes.position.array;

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLifetimes[i] += delta * 2.5;

      if (this.smokeLifetimes[i] > 1.0) {
        this.resetSmokeParticle(i);
      } else {
        // Drift upward and expand slightly
        positions[i * 3 + 1] += delta * 0.6;
      }
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
  }
}