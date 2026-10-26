import * as THREE from 'three';

export function setupKanoAtmosphere(scene, renderer) {
  scene.background = new THREE.Color(0xe8b87a);
  scene.fog = new THREE.FogExp2(0xe8b87a, 0.0028);

  const sunLight = new THREE.DirectionalLight(0xfff5e0, 3.2);
  sunLight.position.set(40, 80, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 200;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.bias = -0.0005;
  sunLight.name = 'sunLight';
  scene.add(sunLight);

  const hemi = new THREE.HemisphereLight(0xffeeb1, 0x5a4030, 1.6);
  hemi.name = 'hemiLight';
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0xffcc88, 0.7);
  fill.position.set(-40, 30, -20);
  fill.name = 'fillLight';
  scene.add(fill);

  // Ambient boost so streets never go pitch black
  const ambient = new THREE.AmbientLight(0xffe0b2, 0.55);
  ambient.name = 'ambientLight';
  scene.add(ambient);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (renderer.outputColorSpace !== undefined) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
}

export function updateAtmosphereByTime(scene, renderer, timeInMinutes, roadSystem = null) {
  const sun = scene.getObjectByName('sunLight');
  const hemi = scene.getObjectByName('hemiLight');
  const ambient = scene.getObjectByName('ambientLight');
  if (!sun) return;

  const t = timeInMinutes / 1440;
  const angle = (t - 0.25) * Math.PI * 2;

  sun.position.x = Math.cos(angle) * 90;
  sun.position.y = Math.sin(angle) * 85;
  sun.position.z = 30;

  const sunHeight = Math.max(0, Math.sin(angle));
  const isNight = sunHeight < 0.08;

  if (isNight) {
    sun.intensity = 0.15;
    if (hemi) hemi.intensity = 0.35;
    if (ambient) ambient.intensity = 0.25;
    scene.background.set(0x0d1520);
    if (scene.fog) {
      scene.fog.color.set(0x0d1520);
      scene.fog.density = 0.005;
    }
    renderer.toneMappingExposure = 1.0;
  } else {
    sun.intensity = 1.2 + sunHeight * 2.2;
    if (hemi) hemi.intensity = 1.0 + sunHeight * 0.7;
    if (ambient) ambient.intensity = 0.4 + sunHeight * 0.25;
    const warm = sunHeight < 0.3 ? 0xf0a868 : 0xe8b87a;
    scene.background.set(warm);
    if (scene.fog) {
      scene.fog.color.set(warm);
      scene.fog.density = 0.0025 + (1 - sunHeight) * 0.0015;
    }
    renderer.toneMappingExposure = 1.25 + sunHeight * 0.25;
  }

  if (roadSystem && typeof roadSystem.setNightMode === 'function') {
    roadSystem.setNightMode(isNight);
  }
}
