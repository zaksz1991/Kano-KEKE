import * as THREE from 'three';

/**
 * Opening sequence – short & reliable, always reaches DRIVING
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

  beginIntro() {
    this._spawnDriverOnFoot();
    this.introT = 0;
    this.engineStarted = false;
    this.setState('INTRO_WALK');
    // Safety: force DRIVING after 5s no matter what
    clearTimeout(this._forceTimer);
    this._forceTimer = setTimeout(() => {
      if (this.state !== 'DRIVING' && this.state !== 'PAUSED') {
        this._finishIntro();
      }
    }, 5000);
  }

  _finishIntro() {
    if (this.driverMesh) {
      try { this.scene.remove(this.driverMesh); } catch (e) {}
      this.driverMesh = null;
    }
    this.kekeGroup.position.y = 0;
    this.engineStarted = true;
    this.setState('DRIVING');
    if (this.cameraRig) {
      try {
        this.cameraRig.currentPos.set(
          this.kekeGroup.position.x,
          this.kekeGroup.position.y + 3.8,
          this.kekeGroup.position.z - 7.5
        );
      } catch (e) {}
    }
  }

  _spawnDriverOnFoot() {
    if (this.driverMesh) {
      try { this.scene.remove(this.driverMesh); } catch (e) {}
    }
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.35), bodyMat);
    body.position.y = 1.05;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.65 })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    g.add(head);
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.55, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x1a237e })
    );
    leg.position.set(-0.1, 0.3, 0);
    g.add(leg);
    const leg2 = leg.clone();
    leg2.position.x = 0.1;
    g.add(leg2);

    const kp = this.kekeGroup.position;
    g.position.set(kp.x - 3.2, 0, kp.z - 2.0);
    this.scene.add(g);
    this.driverMesh = g;

    this.camera.position.set(g.position.x - 2, 3.0, g.position.z - 4);
    this.camera.lookAt(g.position.x, 1.2, g.position.z);
  }

  update(delta, showBanner) {
    if (this.state === 'MENU' || this.state === 'PAUSED') return;
    const dt = Math.min(delta, 0.05);

    if (this.state === 'INTRO_WALK') {
      this.introT += dt;
      const target = this.kekeGroup.position.clone();
      target.x -= 0.8;
      target.z -= 0.2;
      if (this.driverMesh) {
        this.driverMesh.position.lerp(target, 1 - Math.exp(-3.5 * dt));
        this.driverMesh.position.y = Math.abs(Math.sin(this.introT * 10)) * 0.05;
        this.driverMesh.lookAt(this.kekeGroup.position);

        const camTarget = this.driverMesh.position.clone();
        this.camera.position.lerp(
          new THREE.Vector3(camTarget.x - 2.2, 2.8, camTarget.z - 4.0),
          1 - Math.exp(-4 * dt)
        );
        this.camera.lookAt(camTarget.x, 1.2, camTarget.z);

        if (this.driverMesh.position.distanceTo(target) < 0.45 || this.introT > 2.2) {
          this.setState('ENTERING');
          this.introT = 0;
          if (showBanner) showBanner('Entering keke...');
        }
      } else {
        this.setState('ENTERING');
        this.introT = 0;
      }
    } else if (this.state === 'ENTERING') {
      this.introT += dt;
      if (this.driverMesh) {
        this.driverMesh.position.lerp(this.kekeGroup.position, 1 - Math.exp(-5 * dt));
        this.driverMesh.scale.multiplyScalar(0.96);
      }
      const chase = this.kekeGroup.position.clone().add(new THREE.Vector3(0, 3.8, -7.5));
      this.camera.position.lerp(chase, 1 - Math.exp(-3 * dt));
      this.camera.lookAt(
        this.kekeGroup.position.x,
        this.kekeGroup.position.y + 1.2,
        this.kekeGroup.position.z + 6
      );
      if (this.introT > 1.0) {
        if (this.driverMesh) {
          try { this.scene.remove(this.driverMesh); } catch (e) {}
          this.driverMesh = null;
        }
        this.setState('ENGINE_START');
        this.introT = 0;
        if (showBanner) showBanner('Starting engine...');
      }
    } else if (this.state === 'ENGINE_START') {
      this.introT += dt;
      this.kekeGroup.position.y = Math.sin(this.introT * 28) * 0.025;
      if (this.introT > 0.9) {
        this._finishIntro();
        if (showBanner) showBanner('🚗 Engine on — drive!');
      }
    } else if (this.state === 'DRIVING') {
      const spd = this.controller.currentSpeed || 0;
      const bounce =
        Math.sin(performance.now() * 0.012 * (1 + spd * 0.08)) *
        0.02 *
        Math.min(1, spd / 8);
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
