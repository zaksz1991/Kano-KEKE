import * as THREE from 'three';

export class KekeCustomizer {
  constructor(scene, kekeGroup) {
    this.scene = scene;
    this.keke = kekeGroup;
    this.upgrades = { neon: false, subwoofer: false, bumper: false };
    this.neonLights = [];
  }

  applyNeon(colorHex = 0x00ffff) {
    if (this.upgrades.neon) return;
    // Under-glow point lights
    const positions = [
      [0, 0.15, 0.8],
      [0, 0.15, -0.8],
      [0.7, 0.15, 0],
      [-0.7, 0.15, 0]
    ];
    positions.forEach(([x, y, z]) => {
      const light = new THREE.PointLight(colorHex, 2.2, 5);
      light.position.set(x, y, z);
      this.keke.add(light);
      this.neonLights.push(light);
    });
    this.upgrades.neon = true;
  }

  installNeon(colorHex) {
    this.applyNeon(colorHex);
  }

  installSubwoofer() {
    this.upgrades.subwoofer = true;
  }

  installBumper() {
    if (this.upgrades.bumper) return;
    this.upgrades.bumper = true;
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.85, roughness: 0.3 })
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.35, 1.35);
    bar.castShadow = true;
    this.keke.add(bar);
  }
}
