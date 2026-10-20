import * as THREE from 'three';

export class MainMenuManager {
  constructor(scene, camera, kekeGroup, onStartGameCallback) {
    this.scene = scene;
    this.camera = camera;
    this.keke = kekeGroup;
    this.onStartGame = onStartGameCallback;

    this.isInMenu = true;
    this.orbitAngle = 0;
    this.titleMesh = null;
    this.glowRing = null; // Explicitly initialized here to prevent undefined reference risks

    this.init3DTitleLogo();
  }

  // Build 3D Floating Title Mesh above Keke in the Start Screen
  init3DTitleLogo() {
    const group = new THREE.Group();
    group.position.set(0, 3.2, 0);

    // Dynamic 3D Ring Glow behind the Title
    const ringGeo = new THREE.TorusGeometry(2.2, 0.08, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    group.add(this.glowRing);

    this.scene.add(group);
    this.titleMesh = group;
  }

  updateMenuCamera(delta) {
    if (!this.isInMenu) return;

    // Cinematic 360-degree Orbit Camera around Keke on the Front Page
    this.orbitAngle += delta * 0.4;
    const radius = 6.5;
    this.camera.position.x = Math.sin(this.orbitAngle) * radius;
    this.camera.position.z = Math.cos(this.orbitAngle) * radius;
    this.camera.position.y = 2.2;
    this.camera.lookAt(0, 1.0, 0);

    // Floating animation for 3D Title Ring
    if (this.titleMesh && this.glowRing) {
      this.titleMesh.position.y = 3.2 + Math.sin(Date.now() * 0.002) * 0.15;
      this.glowRing.rotation.z += delta * 0.5;
      this.glowRing.rotation.x += delta * 0.3;
    }
  }

  startGame() {
    this.isInMenu = false;

    // Hide 3D Front Page Title Mesh
    if (this.titleMesh) {
      this.scene.remove(this.titleMesh);
      this.titleMesh = null;
    }

    // Hide Front Page DOM Overlay
    const menuUI = document.getElementById('main-menu-overlay');
    if (menuUI) menuUI.style.display = 'none';

    // Show Gameplay HUD
    const hudTopLeft = document.getElementById('top-left-hud');
    const hudTopRight = document.getElementById('top-right-hud');
    if (hudTopLeft) hudTopLeft.style.display = 'block';
    if (hudTopRight) hudTopRight.style.display = 'block';

    if (this.onStartGame) this.onStartGame();
  }
}