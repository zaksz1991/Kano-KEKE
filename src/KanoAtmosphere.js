// KanoAtmosphere.js
import * as THREE from 'three';

export function setupKanoAtmosphere(scene, renderer) {
  const harmattanColor = new THREE.Color(0xdcba87);
  scene.fog = new THREE.FogExp2(harmattanColor, 0.012);
  renderer.setClearColor(harmattanColor);

  const ambientLight = new THREE.AmbientLight(0xfff2e0, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffeedd, 2.2);
  sunLight.position.set(45, 60, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);
}

export function updateAtmosphereByTime(scene, renderer, timeInMinutes) {
  const isNight = timeInMinutes >= 1140 || timeInMinutes < 360; // 7:00 PM to 6:00 AM
  const targetColor = isNight ? new THREE.Color(0x0b1329) : new THREE.Color(0xdcba87);
  scene.fog.color.lerp(targetColor, 0.05);
  renderer.setClearColor(scene.fog.color);
}