import * as THREE from 'three';

/**
 * Light exhaust + dust – mobile-safe counts
 */
export class KanoParticleSystem {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;
    this.smokeCount = 24;
    this.dustCount = 28;
    this._tmp = new THREE.Vector3();
    this.enabled = true;

    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeVel = new Float32Array(this.smokeCount * 3);
    this.smokeLife = new Float32Array(this.smokeCount);
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLife[i] = Math.random();
      this._resetSmoke(i, true);
    }
    this.smokePoints = new THREE.Points(
      this.smokeGeo,
      new THREE.PointsMaterial({
        color: 0x9e9e9e,
        size: 0.32,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.scene.add(this.smokePoints);

    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVel = new Float32Array(this.dustCount * 3);
    this.dustLife = new Float32Array(this.dustCount);
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    for (let i = 0; i < this.dustCount; i++) this.dustLife[i] = Math.random();
    this.dustPoints = new THREE.Points(
      this.dustGeo,
      new THREE.PointsMaterial({
        color: 0xc2a878,
        size: 0.22,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.scene.add(this.dustPoints);
  }

  _resetSmoke(i, cold = false) {
    const p = this.keke.position;
    this.smokePositions[i * 3] = p.x + (Math.random() - 0.5) * 0.3;
    this.smokePositions[i * 3 + 1] = p.y + 0.4 + Math.random() * 0.15;
    this.smokePositions[i * 3 + 2] = p.z - 1.2 - Math.random() * 0.3;
    this.smokeVel[i * 3] = (Math.random() - 0.5) * 0.4;
    this.smokeVel[i * 3 + 1] = 0.8 + Math.random() * 0.6;
    this.smokeVel[i * 3 + 2] = -1.2 - Math.random() * 0.8;
    this.smokeLife[i] = cold ? Math.random() : 0;
  }

  _resetDust(i) {
    const p = this.keke.position;
    this.dustPositions[i * 3] = p.x + (Math.random() - 0.5) * 1.2;
    this.dustPositions[i * 3 + 1] = 0.05;
    this.dustPositions[i * 3 + 2] = p.z - 0.5 + (Math.random() - 0.5);
    this.dustVel[i * 3] = (Math.random() - 0.5) * 1.5;
    this.dustVel[i * 3 + 1] = 0.5 + Math.random() * 0.8;
    this.dustVel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    this.dustLife[i] = 0;
  }

  update(delta, speed = 0) {
    if (!this.enabled) return;
    const dt = Math.min(delta, 0.05);
    const moving = speed > 1.5;
    const hardAccel = speed > 8;

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLife[i] += dt * (hardAccel ? 1.4 : 0.9);
      if (this.smokeLife[i] > 1 || (!moving && this.smokeLife[i] > 0.3)) {
        if (moving) this._resetSmoke(i);
        else this.smokeLife[i] = 1.1;
      }
      this.smokePositions[i * 3] += this.smokeVel[i * 3] * dt;
      this.smokePositions[i * 3 + 1] += this.smokeVel[i * 3 + 1] * dt;
      this.smokePositions[i * 3 + 2] += this.smokeVel[i * 3 + 2] * dt;
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
    this.smokePoints.material.opacity = moving ? 0.35 : 0.08;

    for (let i = 0; i < this.dustCount; i++) {
      this.dustLife[i] += dt * 1.2;
      if (this.dustLife[i] > 1) {
        if (moving) this._resetDust(i);
        else this.dustLife[i] = 1.1;
      }
      this.dustPositions[i * 3] += this.dustVel[i * 3] * dt;
      this.dustPositions[i * 3 + 1] += this.dustVel[i * 3 + 1] * dt;
      this.dustPositions[i * 3 + 2] += this.dustVel[i * 3 + 2] * dt;
      this.dustVel[i * 3 + 1] -= 2 * dt;
    }
    this.dustGeo.attributes.position.needsUpdate = true;
    this.dustPoints.material.opacity = moving ? 0.4 : 0.05;
  }
}
