import * as THREE from 'three';

/**
 * Opening sequence: on foot → walk to keke → enter → start engine → drive
 * States: MENU | INTRO_WALK | ENTERING | ENGINE_START | DRIVING | PAUSED
 */
export class GameFlowManager {
  constructor(scene, camera, kekeGroup, kekeController, cameraRig) {
    this.scene = scene;
    this.camera = camera;
    this.kekeGroup = kekeGroup;
    this.controller = kekeController;
    this.cameraRig = cameraRig;

    this.state = 'MENU';
    this.driverMesh = null;
    this.introT = 0;
    this.onStateChange = null;
    this.engineStarted = false;
  }

  setState(s) {
    this.state = s;
    if (this.onStateChange) this.onStateChange(s);
  }

  /** Call when START SHIFT pressed */
  beginIntro() {
    this._spawnDriverOnFoot();
    this.introT = 0;
    this.engineStarted = false;
    this.setState('INTRO_WALK');
  }

  _spawnDriverOnFoot() {
    if (this.driverMesh) {
      this.scene.remove(this.driverMesh);
    }
    const g = new THREE.Group();
    // Simple driver body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.85, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.7 })
    );
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.65 })
    );
    head.position.y = 1.75;
    head.castShadow = true;
    g.add(head);

    // Start behind and to the side of the keke
    const kp = this.kekeGroup.position;
    g.position.set(kp.x - 3.5, 0, kp.z - 2.5);
    this.scene.add(g);
    this.driverMesh = g;

    // Camera starts on the walking driver
    this.camera.position.set(g.position.x - 2, 3.2, g.position.z - 4);
    this.camera.lookAt(g.position.x, 1.2, g.position.z);
  }

  update(delta, showBanner) {
    if (this.state === 'MENU' || this.state === 'PAUSED') return;
    const dt = Math.min(delta, 0.05);

    if (this.state === 'INTRO_WALK') {
      this.introT += dt;
      const target = this.kekeGroup.position.clone();
      target.x -= 0.9;
      target.z -= 0.3;
      if (this.driverMesh) {
        this.driverMesh.position.lerp(target, 1 - Math.exp(-2.2 * dt));
        // Walk bob
        this.driverMesh.position.y = Math.abs(Math.sin(this.introT * 8)) * 0.06;
        this.driverMesh.lookAt(this.kekeGroup.position);

        // Camera follow walker
        const camTarget = this.driverMesh.position.clone();
        this.camera.position.lerp(
          new THREE.Vector3(camTarget.x - 2.5, 3.0, camTarget.z - 4.5),
          1 - Math.exp(-3 * dt)
        );
        this.camera.lookAt(camTarget.x, 1.3, camTarget.z);

        if (this.driverMesh.position.distanceTo(target) < 0.35) {
          this.setState('ENTERING');
          this.introT = 0;
          if (showBanner) showBanner('Entering keke...');
        }
      }
    } else if (this.state === 'ENTERING') {
      this.introT += dt;
      // Fade out driver mesh into keke
      if (this.driverMesh) {
        this.driverMesh.position.lerp(this.kekeGroup.position, 1 - Math.exp(-4 * dt));
        this.driverMesh.scale.multiplyScalar(0.97);
      }
      // Camera moves to chase position
      const chase = this.kekeGroup.position.clone().add(new THREE.Vector3(0, 3.8, -7.5));
      this.camera.position.lerp(chase, 1 - Math.exp(-2.5 * dt));
      this.camera.lookAt(
        this.kekeGroup.position.x,
        this.kekeGroup.position.y + 1.2,
        this.kekeGroup.position.z + 6
      );

      if (this.introT > 1.4) {
        if (this.driverMesh) {
          this.scene.remove(this.driverMesh);
          this.driverMesh = null;
        }
        this.setState('ENGINE_START');
        this.introT = 0;
        if (showBanner) showBanner('Starting engine...');
      }
    } else if (this.state === 'ENGINE_START') {
      this.introT += dt;
      // Subtle keke shake while starting
      this.kekeGroup.position.y = Math.sin(this.introT * 25) * 0.03;
      if (this.introT > 1.6) {
        this.kekeGroup.position.y = 0;
        this.engineStarted = true;
        this.setState('DRIVING');
        if (showBanner) showBanner('🚗 Engine on — shift started! Drive safe.');
        // Sync camera rig
        if (this.cameraRig) {
          this.cameraRig.currentPos.copy(this.camera.position);
        }
      }
    } else if (this.state === 'DRIVING') {
      // Suspension bounce from speed
      const spd = this.controller.currentSpeed || 0;
      const bounce = Math.sin(performance.now() * 0.012 * (1 + spd * 0.08)) * 0.025 * Math.min(1, spd / 8);
      this.kekeGroup.position.y = bounce;
    }
  }

  isDriving() {
    return this.state === 'DRIVING';
  }

  togglePause() {
    if (this.state === 'DRIVING') {
      this.setState('PAUSED');
      return true;
    }
    if (this.state === 'PAUSED') {
      this.setState('DRIVING');
      return false;
    }
    return this.state === 'PAUSED';
  }
}
