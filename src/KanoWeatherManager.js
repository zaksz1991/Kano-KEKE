import * as THREE from 'three';

export class KanoWeatherManager {
  constructor(scene, kekeController, passengerManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.passengerManager = passengerManager;

    // Weather States: CLEAR, HARMATTAN_HAZE, HEAVY_RAIN
    this.currentWeather = 'CLEAR';
    this.weatherTimer = 0;
    this.rainParticles = null;
    this.rainGeo = null;
    this.rainCount = 3000;

    this.initRainSystem();
  }

  initRainSystem() {
    this.rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.15,
      transparent: true,
      opacity: 0.6
    });

    this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  setWeather(type, hudCallback) {
    this.currentWeather = type;

    if (type === 'CLEAR') {
      this.rainParticles.visible = false;
      this.keke.deceleration = 0.98; // Standard road grip
      this.passengerManager.fareMultiplier = 1.0;
      this.scene.fog.density = 0.012;
      if (hudCallback) hudCallback('☀️ Clear Kano Skies. Standard fare rates active.');
    } 
    else if (type === 'HARMATTAN_HAZE') {
      this.rainParticles.visible = false;
      this.keke.deceleration = 0.97;
      this.passengerManager.fareMultiplier = 1.25; // Slight surge pricing
      this.scene.fog.density = 0.035; // Dense dust fog
      this.scene.fog.color.setHex(0xdcba87);
      if (hudCallback) hudCallback('🌫️ HARMATTAN DUST HAZE! Low visibility. Fares SURGED by +25%!');
    } 
    else if (type === 'HEAVY_RAIN') {
      this.rainParticles.visible = true;
      this.keke.deceleration = 0.94; // Reduced tire grip / hydroplaning
      this.passengerManager.fareMultiplier = 1.8; // High rain surge pricing
      this.scene.fog.density = 0.025;
      this.scene.fog.color.setHex(0x334455);
      if (hudCallback) hudCallback('🌧️ TORRENTIAL KANO RAIN & FLOODS! Hydroplaning risk! Fares SURGED by +80%!');
    }
  }

  update(delta, kekePosition, hudCallback) {
    // Random Weather Change Cycle every ~3 minutes
    this.weatherTimer += delta;
    if (this.weatherTimer > 180) {
      this.weatherTimer = 0;
      const roll = Math.random();
      if (roll < 0.5) this.setWeather('CLEAR', hudCallback);
      else if (roll < 0.8) this.setWeather('HARMATTAN_HAZE', hudCallback);
      else this.setWeather('HEAVY_RAIN', hudCallback);
    }

    // Animate Rain Particles following Keke camera
    if (this.currentWeather === 'HEAVY_RAIN' && this.rainParticles) {
      this.rainParticles.position.x = kekePosition.x;
      this.rainParticles.position.z = kekePosition.z;

      const positions = this.rainGeo.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) {
        positions[i * 3 + 1] -= delta * 25.0; // Fall downward fast
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 20; // Reset to top
        }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }
  }
}