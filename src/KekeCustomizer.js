// KekeCustomizer.js
import * as THREE from 'three';

export class KekeCustomizer {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;
    this.upgrades = { neon: false, subwoofer: false, bumper: false };
  }

  installNeon(colorHex = 0x00ffff) {
    const light = new THREE.PointLight(colorHex, 3, 6);
    light.position.set(0, 0.2, 0);
    this.keke.add(light);
    this.upgrades.neon = true;
  }

  installSubwoofer() {
    this.upgrades.subwoofer = true;
  }

  installBumper() {
    this.upgrades.bumper = true;
    const barGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.4, 1.2);
    this.keke.add(bar);
  }
}