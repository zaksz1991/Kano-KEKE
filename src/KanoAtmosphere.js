import * as THREE from 'three';

/** Lighting tuned for mobile-first performance */
export function setupKanoAtmosphere(scene, renderer) {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;

  scene.background = new THREE.Color(0x87b7e8);
  scene.fog = new THREE.Fog(0xb8d4f0, mobile ? 60 : 110, mobile ? 160 : 300);

  const sun = new THREE.DirectionalLight(0xfff6e0, mobile ? 2.8 : 3.8);
  sun.position.set(50, 80, 30);
  sun.name = 'sunLight';
  if (!mobile) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.0004;
  } else {
    sun.castShadow = false;
  }
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0xffe8c0, 0x6b5344, mobile ? 1.6 : 2.0);
  hemi.name = 'hemiLight';
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffe8cc, mobile ? 0.9 : 1.0);
  ambient.name = 'ambientLight';
  scene.add(ambient);

  // Skip fill + night market lights on mobile (extra draw/light cost)
  if (!mobile) {
    const fill = new THREE.DirectionalLight(0xffd9a0, 1.0);
    fill.position.set(-40, 30, -20);
    fill.name = 'fillLight';
    scene.add(fill);
    for (let i = 0; i < 4; i++) {
      const nl = new THREE.PointLight(0xffb74d, 0, 30, 2);
      nl.position.set((i % 2 === 0 ? -11 : 11), 4.0, 30 + i * 50);
      nl.name = 'nightMarketLight';
      scene.add(nl);
    }
  }

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = mobile ? 1.35 : 1.5;
  renderer.shadowMap.enabled = !mobile;
  if (!mobile) renderer.shadowMap.type = THREE.PCFShadowMap; // cheaper than Soft
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
  sun.position.x = Math.cos(angle) * 80;
  sun.position.y = Math.max(6, Math.sin(angle) * 80);
  sun.position.z = 30;

  const h = Math.max(0, Math.sin(angle));
  const night = h < 0.12;
  const mobile = renderer.shadowMap && renderer.shadowMap.enabled === false;

  if (night) {
    sun.intensity = 0.2;
    if (hemi) hemi.intensity = 0.55;
    if (ambient) ambient.intensity = 0.5;
    if (fill) fill.intensity = 0.25;
    scene.background.set(0x121820);
    if (scene.fog) {
      scene.fog.color.set(0x121820);
      scene.fog.near = mobile ? 25 : 35;
      scene.fog.far = mobile ? 100 : 150;
    }
    renderer.toneMappingExposure = 1.25;
  } else {
    sun.intensity = 2.2 + h * 1.6;
    if (hemi) hemi.intensity = 1.4 + h * 0.5;
    if (ambient) ambient.intensity = 0.75 + h * 0.3;
    if (fill) fill.intensity = 0.9;
    const warm = h < 0.25 ? 0xf5b06a : 0x87b7e8;
    scene.background.set(warm);
    if (scene.fog) {
      scene.fog.color.set(warm);
      scene.fog.near = mobile ? 55 : 100;
      scene.fog.far = mobile ? 150 : 280;
    }
    renderer.toneMappingExposure = 1.35 + h * 0.2;
  }

  if (roadSystem?.setNightMode) roadSystem.setNightMode(night);

  // Only toggle night lights if they exist (desktop)
  scene.traverse((o) => {
    if (o.name === 'nightMarketLight' && o.isLight) o.intensity = night ? 2.0 : 0;
  });
}

export function setPrayerAmbient(scene, active) {
  const ambient = scene.getObjectByName('ambientLight');
  if (ambient) ambient.intensity = active ? 0.45 : ambient.intensity;
}
