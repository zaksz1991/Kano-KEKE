import * as THREE from 'three';

/**
 * Player keke headlights – auto on at night, manual toggle with L
 */
export class KekeHeadlights {
  constructor(kekeGroup) {
    this.keke = kekeGroup;
    this.enabled = false;
    this.manual = null; // null = auto, true/false = force

    const mat = new THREE.MeshStandardMaterial({
      color: 0xfff8e1,
      emissive: 0xffe082,
      emissiveIntensity: 0,
      roughness: 0.3
    });

    this.lampL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.08), mat.clone());
    this.lampR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.08), mat.clone());
    this.lampL.position.set(-0.5, 0.75, 1.2);
    this.lampR.position.set(0.5, 0.75, 1.2);
    this.keke.add(this.lampL);
    this.keke.add(this.lampR);

    this.spotL = new THREE.SpotLight(0xfff5e0, 0, 28, Math.PI / 7, 0.45, 1.2);
    this.spotR = new THREE.SpotLight(0xfff5e0, 0, 28, Math.PI / 7, 0.45, 1.2);
    this.spotL.position.set(-0.45, 0.85, 1.25);
    this.spotR.position.set(0.45, 0.85, 1.25);
    this.targetL = new THREE.Object3D();
    this.targetR = new THREE.Object3D();
    this.targetL.position.set(-0.5, 0.3, 12);
    this.targetR.position.set(0.5, 0.3, 12);
    this.keke.add(this.spotL);
    this.keke.add(this.spotR);
    this.keke.add(this.targetL);
    this.keke.add(this.targetR);
    this.spotL.target = this.targetL;
    this.spotR.target = this.targetR;
  }

  toggle() {
    if (this.manual === null) this.manual = true;
    else if (this.manual === true) this.manual = false;
    else this.manual = null; // back to auto
    return this.manual;
  }

  update(timeInMinutes) {
    const hour = (timeInMinutes / 60) % 24;
    const isNight = hour < 6.5 || hour > 18.5;
    const on = this.manual === null ? isNight : this.manual;
    this.enabled = on;

    const intensity = on ? 1.6 : 0;
    const emissive = on ? 1.4 : 0;
    this.spotL.intensity = intensity;
    this.spotR.intensity = intensity;
    if (this.lampL.material) this.lampL.material.emissiveIntensity = emissive;
    if (this.lampR.material) this.lampR.material.emissiveIntensity = emissive;
  }
}
