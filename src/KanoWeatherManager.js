import * as THREE from 'three';

/**
 * Kano Weather Manager
 * CLEAR | HARMATTAN_HAZE | HEAVY_RAIN
 * - Visual rain streaks + harmattan dust volume
 * - Gameplay impact: grip, fare surge, fog
 */
export class KanoWeatherManager {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengerManager = passengerManager;

    this.currentWeather = 'CLEAR';
    this.weatherTimer = 0;
    this.nextChange = 45 + Math.random() * 50; // first change 1.5–3.5 min

    this.rainCount = 900;
    this.dustCount = 400;

    this._initRain();
    this._initHarmattanDust();
  }

  _initRain() {
    const positions = new Float32Array(this.rainCount * 3);
    const velocities = new Float32Array(this.rainCount);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 110;
      velocities[i] = 18 + Math.random() * 14;
    }

    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainVel = velocities;

    this.rainPoints = new THREE.Points(
      this.rainGeo,
      new THREE.PointsMaterial({
        color: 0xa8d4f0,
        size: 0.22,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  _initHarmattanDust() {
    const positions = new Float32Array(this.dustCount * 3);
    for (let i = 0; i < this.dustCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }

    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.dustPoints = new THREE.Points(
      this.dustGeo,
      new THREE.PointsMaterial({
        color: 0xd4b483,
        size: 0.55,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      })
    );
    this.dustPoints.visible = false;
    this.scene.add(this.dustPoints);
  }

  getWeather() {
    return this.currentWeather;
  }

  setWeather(type, hudCallback) {
    this.currentWeather = type;

    // Reset visuals
    this.rainPoints.visible = false;
    this.dustPoints.visible = false;

    // Safe defaults (in case properties don't exist)
    if (this.keke) {
      // we don't hard-overwrite maxSpeed; grip is handled via a friction multiplier if available
      this.keke._weatherGrip = 1.0;
    }
    if (this.passengerManager) {
      this.passengerManager.fareMultiplier = 1.0;
    }

    if (type === 'CLEAR') {
      if (this.scene.fog) {
        this.scene.fog.density = 0.005;
        this.scene.fog.color.setHex(0xd4a373);
      }
      if (hudCallback) hudCallback('☀️ Clear Kano skies – standard fares');
    } else if (type === 'HARMATTAN_HAZE') {
      this.dustPoints.visible = true;
      if (this.keke) this.keke._weatherGrip = 0.92;
      if (this.passengerManager) this.passengerManager.fareMultiplier = 1.25;
      if (this.scene.fog) {
        this.scene.fog.density = 0.028;
        this.scene.fog.color.setHex(0xdcba87);
      }
      if (hudCallback) hudCallback('🌫️ HARMATTAN HAZE – low visibility, fares +25%');
    } else if (type === 'HEAVY_RAIN') {
      this.rainPoints.visible = true;
      if (this.keke) this.keke._weatherGrip = 0.78;
      if (this.passengerManager) this.passengerManager.fareMultiplier = 1.8;
      if (this.scene.fog) {
        this.scene.fog.density = 0.018;
        this.scene.fog.color.setHex(0x3a4a55);
      }
      if (hudCallback) hudCallback('🌧️ HEAVY RAIN – hydroplaning risk, fares +80%');
    }
  }

  update(delta, kekePosition, hudCallback) {
    this.weatherTimer += delta;
    if (this.weatherTimer > this.nextChange) {
      this.weatherTimer = 0;
      this.nextChange = 100 + Math.random() * 140;
      const roll = Math.random();
      if (roll < 0.48) this.setWeather('CLEAR', hudCallback);
      else if (roll < 0.78) this.setWeather('HARMATTAN_HAZE', hudCallback);
      else this.setWeather('HEAVY_RAIN', hudCallback);
    }

    // Keep particle volumes centred on player
    if (this.rainPoints.visible) {
      this.rainPoints.position.x = kekePosition.x;
      this.rainPoints.position.z = kekePosition.z;

      const pos = this.rainGeo.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        pos[i * 3 + 1] -= this.rainVel[i] * delta;
        // slight wind drift
        pos[i * 3] += delta * 1.5;
        if (pos[i * 3 + 1] < 0) {
          pos[i * 3 + 1] = 18 + Math.random() * 6;
          pos[i * 3] = (Math.random() - 0.5) * 70;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 110;
        }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    if (this.dustPoints.visible) {
      this.dustPoints.position.x = kekePosition.x;
      this.dustPoints.position.z = kekePosition.z;

      const pos = this.dustGeo.attributes.position.array;
      for (let i = 0; i < this.dustCount; i++) {
        // slow horizontal drift (harmattan wind)
        pos[i * 3] += delta * (0.8 + Math.sin(i * 0.1) * 0.4);
        pos[i * 3 + 1] += Math.sin(performance.now() * 0.0004 + i) * 0.01;
        if (pos[i * 3] > 50) pos[i * 3] = -50;
      }
      this.dustGeo.attributes.position.needsUpdate = true;
    }
  }

  forceWeather(name) {
    const allowed = ['CLEAR', 'HEAVY_RAIN', 'HARMATTAN_HAZE'];
    if (!allowed.includes(name)) name = 'CLEAR';
    this.currentWeather = name;
    this.weatherTimer = 0;
    this.nextChange = 40 + Math.random() * 40;
    if (this.rainPoints) this.rainPoints.visible = name === 'HEAVY_RAIN';
    if (this.dustPoints) this.dustPoints.visible = name === 'HARMATTAN_HAZE';
  }
}
