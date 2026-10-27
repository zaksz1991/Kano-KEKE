import * as THREE from 'three';

/**
 * Brake lights + turn signals on the player keke
 */
export class KekeSignalLights {
  constructor(kekeGroup) {
    this.keke = kekeGroup;
    this.brakeL = null;
    this.brakeR = null;
    this.indL = null;
    this.indR = null;
    this._blinkT = 0;
    this._build();
  }

  _build() {
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0xff0000,
      emissiveIntensity: 0,
      roughness: 0.4
    });
    const indMat = new THREE.MeshStandardMaterial({
      color: 0x332200,
      emissive: 0xff9800,
      emissiveIntensity: 0,
      roughness: 0.4
    });

    this.brakeL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), brakeMat.clone());
    this.brakeR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), brakeMat.clone());
    this.brakeL.position.set(-0.55, 0.7, -1.25);
    this.brakeR.position.set(0.55, 0.7, -1.25);
    this.keke.add(this.brakeL);
    this.keke.add(this.brakeR);

    this.indL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.06), indMat.clone());
    this.indR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.06), indMat.clone());
    this.indL.position.set(-0.75, 0.75, 1.1);
    this.indR.position.set(0.75, 0.75, 1.1);
    this.keke.add(this.indL);
    this.keke.add(this.indR);

    // Rear indicators too
    this.indLR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), indMat.clone());
    this.indRR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.06), indMat.clone());
    this.indLR.position.set(-0.7, 0.7, -1.25);
    this.indRR.position.set(0.7, 0.7, -1.25);
    this.keke.add(this.indLR);
    this.keke.add(this.indRR);
  }

  update(delta, throttle, steer) {
    this._blinkT += delta * 6;
    const blinkOn = Math.sin(this._blinkT) > 0;

    // Brake when throttle negative
    const braking = throttle < -0.1;
    const brakeIntensity = braking ? 1.8 : 0.05;
    [this.brakeL, this.brakeR].forEach((m) => {
      if (m?.material) m.material.emissiveIntensity = brakeIntensity;
    });

    // Indicators
    const left = steer > 0.25;
    const right = steer < -0.25;
    const setInd = (mesh, on) => {
      if (mesh?.material) mesh.material.emissiveIntensity = on && blinkOn ? 2.0 : 0;
    };
    setInd(this.indL, left);
    setInd(this.indLR, left);
    setInd(this.indR, right);
    setInd(this.indRR, right);
  }
}
