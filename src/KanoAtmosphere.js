import * as THREE from 'three';

export function setupKanoAtmosphere(scene, renderer) {
  // Set warm Kano sky background
  scene.background = new THREE.Color(0xd4a373);

  // 1. Directional Sun Light with High-Resolution Shadows
  const sunLight = new THREE.DirectionalLight(0xfffaed, 2.5);
  sunLight.position.set(50, 80, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 250;
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  sunLight.shadow.bias = -0.0005;
  sunLight.name = 'sunLight';
  scene.add(sunLight);

  // 2. Hemisphere Ambient Light (Warm Sky / Ground Reflection)
  const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x3d2b1f, 1.2);
  hemiLight.name = 'hemiLight';
  scene.add(hemiLight);

  // 3. Volumetric Atmospheric Fog for Depth & Smooth Pop-in
  scene.fog = new THREE.FogExp2(0xd4a373, 0.006);

  // 4. Renderer Tone Mapping & Exposure Adjustments
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function updateAtmosphereByTime(scene, renderer, timeInMinutes) {
  const sunLight = scene.getObjectByName('sunLight');
  const hemiLight = scene.getObjectByName('hemiLight');

  // Convert time (0..1440 min) to normalized daylight cycle (0..1)
  const dayRatio = timeInMinutes / 1440;
  const angle = dayRatio * Math.PI * 2 - Math.PI / 2;

  if (sunLight) {
    sunLight.position.x = Math.cos(angle) * 100;
    sunLight.position.y = Math.sin(angle) * 100;

    // Day/Night transition intensity tuning
    if (sunLight.position.y > 0) {
      sunLight.intensity = Math.min(2.5, Math.sin(angle) * 3.0);
    } else {
      sunLight.intensity = 0.1; // Night ambient moon intensity
    }
  }

  // Adjust fog density and background tint based on time of day
  if (timeInMinutes < 360 || timeInMinutes > 1140) {
    // Night
    scene.background.setHex(0x0a0d18);
    if (scene.fog) scene.fog.color.setHex(0x0a0d18);
    if (hemiLight) hemiLight.intensity = 0.3;
  } else if (timeInMinutes >= 360 && timeInMinutes < 480) {
    // Dawn
    scene.background.setHex(0xe8985e);
    if (scene.fog) scene.fog.color.setHex(0xe8985e);
    if (hemiLight) hemiLight.intensity = 0.8;
  } else if (timeInMinutes >= 480 && timeInMinutes < 1020) {
    // Midday Harmattan Warmth
    scene.background.setHex(0xd4a373);
    if (scene.fog) scene.fog.color.setHex(0xd4a373);
    if (hemiLight) hemiLight.intensity = 1.2;
  } else {
    // Dusk / Sunset
    scene.background.setHex(0xba5432);
    if (scene.fog) scene.fog.color.setHex(0xba5432);
    if (hemiLight) hemiLight.intensity = 0.7;
  }
}