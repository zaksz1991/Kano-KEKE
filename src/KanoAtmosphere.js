import * as THREE from 'three';

/**
 * Kano Atmosphere – warm Sahelian sky, day/night cycle, fog, street lights
 */
export function setupKanoAtmosphere(scene, renderer) {
  scene.background = new THREE.Color(0xd4a373);
  scene.fog = new THREE.FogExp2(0xd4a373, 0.0035);

  // Sun
  const sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
  sunLight.position.set(40, 70, 25);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 220;
  sunLight.shadow.camera.left = -70;
  sunLight.shadow.camera.right = 70;
  sunLight.shadow.camera.top = 70;
  sunLight.shadow.camera.bottom = -70;
  sunLight.shadow.bias = -0.0004;
  sunLight.name = 'sunLight';
  scene.add(sunLight);

  // Hemisphere – warm sky / dusty ground
  const hemi = new THREE.HemisphereLight(0xffeeb1, 0x3d2b1f, 1.15);
  hemi.name = 'hemiLight';
  scene.add(hemi);

  // Subtle fill
  const fill = new THREE.DirectionalLight(0xffcc88, 0.35);
  fill.position.set(-30, 20, -40);
  fill.name = 'fillLight';
  scene.add(fill);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function updateAtmosphereByTime(scene, renderer, timeInMinutes, roadSystem = null) {
  const sun = scene.getObjectByName('sunLight');
  const hemi = scene.getObjectByName('hemiLight');
  if (!sun) return;

  // 0..1440 minutes → day cycle
  const t = timeInMinutes / 1440;
  // Sun rises ~6:00, sets ~18:30 (approximate for Kano)
  const angle = (t - 0.25) * Math.PI * 2; // shift so 6am is horizon

  sun.position.x = Math.cos(angle) * 90;
  sun.position.y = Math.sin(angle) * 85;
  sun.position.z = 30;

  const sunHeight = Math.max(0, Math.sin(angle));
  const isNight = sunHeight < 0.08;

  if (isNight) {
    sun.intensity = 0.08;
    if (hemi) hemi.intensity = 0.25;
    scene.background.set(0x0a0e18);
    if (scene.fog) scene.fog.color.set(0x0a0e18);
    if (scene.fog) scene.fog.density = 0.006;
    renderer.toneMappingExposure = 0.85;
  } else {
    sun.intensity = 0.6 + sunHeight * 2.1;
    if (hemi) hemi.intensity = 0.6 + sunHeight * 0.7;
    // Warm orange morning / golden evening
    const warm = sunHeight < 0.3 ? 0xe8a87c : 0xd4a373;
    scene.background.set(warm);
    if (scene.fog) {
      scene.fog.color.set(warm);
      scene.fog.density = 0.003 + (1 - sunHeight) * 0.002;
    }
    renderer.toneMappingExposure = 1.05 + sunHeight * 0.25;
  }

  if (roadSystem && typeof roadSystem.setNightMode === 'function') {
    roadSystem.setNightMode(isNight);
  }
}
