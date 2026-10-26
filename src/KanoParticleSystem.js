import * as THREE from 'three';

/**
 * Dual Particle System – Exhaust + Road Dust
 * Professional feel for a loaded Keke on Kano asphalt
 */
export class KanoParticleSystem {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;

    // ---- Exhaust smoke ----
    this.smokeCount = 56;
    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeVel = new Float32Array(this.smokeCount * 3);
    this.smokeLife = new Float32Array(this.smokeCount);
    this.smokeGeo = new THREE.BufferGeometry();
    this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLife[i] = 1.1;
      this.resetSmoke(i);
    }

    this.smokePoints = new THREE.Points(
      this.smokeGeo,
      new THREE.PointsMaterial({
        color: 0x8a8a8a,
        size: 0.38,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: true
      })
    );
    this.scene.add(this.smokePoints);

    // ---- Road dust (kicked up by wheels) ----
    this.dustCount = 80;
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVel = new Float32Array(this.dustCount * 3);
    this.dustLife = new Float32Array(this.dustCount);
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

    for (let i = 0; i < this.dustCount; i++) {
      this.dustLife[i] = 1.1;
    }

    this.dustPoints = new THREE.Points(
      this.dustGeo,
      new THREE.PointsMaterial({
        color: 0xc2a878,
        size: 0.28,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.NormalBlending,
        sizeAttenuation: true
      })
    );
    this.scene.add(this.dustPoints);

    this._tmp = new THREE.Vector3();
  }

  resetSmoke(i) {
    const off = this._tmp.set(
      (Math.random() - 0.5) * 0.35,
      0.32 + Math.random() * 0.12,
      -1.35
    ).applyQuaternion(this.keke.quaternion);

    const p = this.keke.position;
    this.smokePositions[i * 3]     = p.x + off.x;
    this.smokePositions[i * 3 + 1] = p.y + off.y;
    this.smokePositions[i * 3 + 2] = p.z + off.z;

    // Drift mostly upward + slight side
    this.smokeVel[i * 3]     = (Math.random() - 0.5) * 0.6;
    this.smokeVel[i * 3 + 1] = 0.7 + Math.random() * 0.5;
    this.smokeVel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

    this.smokeLife[i] = 0;
  }

  resetDust(i, side = 0) {
    // Emit near rear wheels
    const off = this._tmp.set(
      side * 0.65 + (Math.random() - 0.5) * 0.25,
      0.08,
      -0.9 + (Math.random() - 0.5) * 0.4
    ).applyQuaternion(this.keke.quaternion);

    const p = this.keke.position;
    this.dustPositions[i * 3]     = p.x + off.x;
    this.dustPositions[i * 3 + 1] = p.y + off.y;
    this.dustPositions[i * 3 + 2] = p.z + off.z;

    this.dustVel[i * 3]     = (Math.random() - 0.5) * 1.8;
    this.dustVel[i * 3 + 1] = 0.4 + Math.random() * 1.1;
    this.dustVel[i * 3 + 2] = -1.5 - Math.random() * 2.0; // trail behind

    this.dustLife[i] = 0;
  }

  update(delta, currentSpeed, weather = 'CLEAR') {
    const dt = Math.min(delta, 0.05);
    const moving = currentSpeed > 1.2;
    const fast = currentSpeed > 8;

    // ---- Exhaust ----
    const sp = this.smokeGeo.attributes.position.array;
    for (let i = 0; i < this.smokeCount; i++) {
      this.smokeLife[i] += dt * (1.6 + currentSpeed * 0.06);

      if (this.smokeLife[i] > 1.0) {
        if (moving) this.resetSmoke(i);
        else this.smokeLife[i] = 1.1;
      } else {
        sp[i * 3]     += this.smokeVel[i * 3] * dt;
        sp[i * 3 + 1] += this.smokeVel[i * 3 + 1] * dt;
        sp[i * 3 + 2] += this.smokeVel[i * 3 + 2] * dt;
        // slow down
        this.smokeVel[i * 3 + 1] *= 0.98;
      }
    }
    this.smokeGeo.attributes.position.needsUpdate = true;

    // Opacity tied to speed (more smoke when accelerating hard)
    this.smokePoints.material.opacity = moving ? 0.28 + Math.min(0.35, currentSpeed * 0.025) : 0.05;

    // ---- Road dust ----
    const dp = this.dustGeo.attributes.position.array;
    const dustRate = weather === 'HARMATTAN_HAZE' ? 2.4 : (weather === 'HEAVY_RAIN' ? 0.3 : 1.0);

    for (let i = 0; i < this.dustCount; i++) {
      this.dustLife[i] += dt * (2.2 + currentSpeed * 0.1);

      if (this.dustLife[i] > 1.0) {
        if (moving && Math.random() < 0.35 * dustRate) {
          this.resetDust(i, Math.random() > 0.5 ? 1 : -1);
        } else {
          this.dustLife[i] = 1.1;
        }
      } else {
        dp[i * 3]     += this.dustVel[i * 3] * dt;
        dp[i * 3 + 1] += this.dustVel[i * 3 + 1] * dt;
        dp[i * 3 + 2] += this.dustVel[i * 3 + 2] * dt;
        this.dustVel[i * 3 + 1] -= 4.5 * dt; // gravity
        if (dp[i * 3 + 1] < 0.02) {
          dp[i * 3 + 1] = 0.02;
          this.dustVel[i * 3 + 1] *= -0.15;
        }
      }
    }
    this.dustGeo.attributes.position.needsUpdate = true;

    // Dust more visible when fast or in harmattan
    const dustOpacity = weather === 'HARMATTAN_HAZE'
      ? 0.55
      : (fast ? 0.4 : (moving ? 0.22 : 0.0));
    this.dustPoints.material.opacity = dustOpacity;
    this.dustPoints.material.color.setHex(
      weather === 'HARMATTAN_HAZE' ? 0xd4b483 : 0xc2a878
    );
  }
}
