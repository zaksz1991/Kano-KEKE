import * as THREE from 'three';

/** Bright, cinematic Kano daylight – never muddy */
export function setupKanoAtmosphere(scene, renderer) {
  scene.background = new THREE.Color(0xf2c58a);
  scene.fog = new THREE.Fog(0xf2c58a, 80, 280);

  const sun = new THREE.DirectionalLight(0xfff6e0, 4.5);
  sun.position.set(60, 100, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.name = 'sunLight';
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xffe8c0, 0x6b5344, 2.2);
  hemi.name = 'hemiLight';
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0xffd9a0, 1.4);
  fill.position.set(-50, 40, -30);
  fill.name = 'fillLight';
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0xffe8cc, 1.1);
  ambient.name = 'ambientLight';
  scene.add(ambient);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.65;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function updateAtmosphereByTime(scene, renderer, timeInMinutes, roadSystem = null) {
  const sun = scene.getObjectByName('sunLight');
  const hemi = scene.getObjectByName('hemiLight');
  const ambient = scene.getObjectByName('ambientLight');
  const fill = scene.getObjectByName('fillLight');
  if (!sun) return;

  const t = timeInMinutes / 1440;
  const angle = (t - 0.25) * Math.PI * 2;
  sun.position.x = Math.cos(angle) * 100;
  sun.position.y = Math.max(8, Math.sin(angle) * 95);
  sun.position.z = 35;

  const h = Math.max(0, Math.sin(angle));
  const night = h < 0.12;

  if (night) {
    sun.intensity = 0.35;
    if (hemi) hemi.intensity = 0.5;
    if (ambient) ambient.intensity = 0.4;
    if (fill) fill.intensity = 0.2;
    scene.background.set(0x1a2233);
    if (scene.fog) {
      scene.fog.color.set(0x1a2233);
      if (scene.fog.near !== undefined) { scene.fog.near = 40; scene.fog.far = 180; }
    }
    renderer.toneMappingExposure = 1.15;
  } else {
    sun.intensity = 2.5 + h * 2.5;
    if (hemi) hemi.intensity = 1.6 + h * 0.8;
    if (ambient) ambient.intensity = 0.85 + h * 0.4;
    if (fill) fill.intensity = 1.0;
    const warm = h < 0.25 ? 0xf5b06a : 0xf2c58a;
    scene.background.set(warm);
    if (scene.fog) {
      scene.fog.color.set(warm);
      if (scene.fog.near !== undefined) { scene.fog.near = 90; scene.fog.far = 300; }
    }
    renderer.toneMappingExposure = 1.5 + h * 0.25;
  }
  if (roadSystem?.setNightMode) roadSystem.setNightMode(night);
}
