import * as THREE from 'three';
import { AssetManager } from './AssetManager.js';
import { setupKanoAtmosphere, updateAtmosphereByTime } from './KanoAtmosphere.js';
import { KekePhysicsController } from './KekePhysicsController.js';
import { KekeCameraRig } from './KekeCameraRig.js';
import { InfiniteRoadSystem } from './InfiniteRoadSystem.js';
import { PassengerManager } from './PassengerManager.js';
import { FuelManager } from './FuelManager.js';
import { KekeCustomizer } from './KekeCustomizer.js';
import { NightThugDangerEngine } from './NightThugDangerEngine.js';
import { SpatialHotspotManager } from './SpatialHotspotManager.js';
import { PrayerTimeManager } from './PrayerTimeManager.js';
import { HausaRadioManager } from './HausaRadioManager.js';
import { DailySettlementManager } from './DailySettlementManager.js';
import { CoinPickupManager } from './CoinPickupManager.js';
import { PassengerFightEngine } from './PassengerFightEngine.js';
import { KekeCollisionSystem } from './KekeCollisionSystem.js';
import { KanoWeatherManager } from './KanoWeatherManager.js';
import { DynamicTrafficManager } from './DynamicTrafficManager.js';
import { PoliceCheckpointEngine } from './PoliceCheckpointEngine.js';
import { KanoAudioEngine } from './KanoAudioEngine.js';
import { KanoLandmarkManager } from './KanoLandmarkManager.js';
import { CharacterSelectionManager } from './CharacterSelectionManager.js';
import { KekeMaintenanceEngine } from './KekeMaintenanceEngine.js';
import { PassengerDialogueManager } from './PassengerDialogueManager.js';
import { SaveSystem } from './SaveSystem.js';
import { setupMobileControls } from './MobileTouchControls.js';
import { RedisSyncManager } from './backend/RedisSyncManager.js';
import { KANO_ROUTES } from './KanoRoutesData.js';
import { setupPostProcessing } from './KanoPostProcessor.js';
import { KanoParticleSystem } from './KanoParticleSystem.js';
import { PedestrianManager } from './PedestrianManager.js';

// ============================================================
// 1. Renderer / Scene / Camera
// ============================================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

setupKanoAtmosphere(scene, renderer);
const composer = setupPostProcessing(renderer, scene, camera);

// ============================================================
// 2. Core state
// ============================================================
const assetManager = new AssetManager();
const savedData = SaveSystem.loadGame();

let redisSync = null;
try {
  redisSync = new RedisSyncManager();
  if (typeof redisSync.connect === 'function') redisSync.connect(() => {});
} catch (e) {
  console.log('ℹ️ Multiplayer sync fallback active.');
}

const input = { throttle: 0, steering: 0 };
let isHornActive = false;
// setupMobileControls moved after audio init

// ============================================================
// 3. Loading UI helper
// ============================================================
function showLoading(msg, percent = 0) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.style.cssText = `
      position:fixed;inset:0;background:#0a0a0f;z-index:200;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      color:#ffcc00;font-family:system-ui,sans-serif;`;
    el.innerHTML = `
      <div style="font-size:28px;font-weight:800;letter-spacing:3px;margin-bottom:12px;">KANO RUN</div>
      <div id="load-msg" style="font-size:14px;color:#00ffff;margin-bottom:18px;">Preparing streets of Kano...</div>
      <div style="width:260px;height:6px;background:#222;border-radius:4px;overflow:hidden;">
        <div id="load-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#ffcc00,#ff9800);transition:width 0.2s;"></div>
      </div>
      <div id="load-pct" style="margin-top:10px;font-size:12px;color:#888;">0%</div>`;
    document.body.appendChild(el);
  }
  const msgEl = document.getElementById('load-msg');
  const bar = document.getElementById('load-bar');
  const pct = document.getElementById('load-pct');
  if (msgEl) msgEl.textContent = msg;
  if (bar) bar.style.width = `${percent}%`;
  if (pct) pct.textContent = `${percent}%`;
}

function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 550);
  }
}

// ============================================================
// 4. Bootstrap (async)
// ============================================================
async function bootstrap() {
  showLoading('Loading Kano streets & assets...', 5);

  assetManager.setProgressCallback(({ percent, path }) => {
    const name = path ? path.split('/').pop() : '';
    showLoading(`Loading ${name}...`, Math.min(90, 10 + percent * 0.7));
  });

  // Critical assets
  const critical = [
    { path: '/assets/models/keke.glb', options: { scale: 1.15 } },
    { path: '/assets/models/textures/road_diffuse.jpg', type: 'texture' },
    { path: '/assets/models/environment/road_tile.glb', options: { scale: 1 } },
    { path: '/assets/models/traffic_vehicle.glb', options: { scale: 1.05 } },
    { path: '/assets/models/okada.glb', options: { scale: 1 } },
    { path: '/assets/models/landmarks/palace_gate.glb', options: { scale: 1.3 } },
    { path: '/assets/models/landmarks/dye_pits.glb', options: { scale: 1.1 } },
    { path: '/assets/models/landmarks/city_walls.glb', options: { scale: 1 } },
    { path: '/assets/models/landmarks/wheels.glb', options: { scale: 1.2 } },
    { path: '/assets/models/pedestrian.glb', options: { scale: 1.0 } }
  ];

  await assetManager.preload(critical);
  showLoading('Building world...', 92);

  // ---- Keke ----
  const kekeGroup = new THREE.Group();
  scene.add(kekeGroup);

  // Temporary body while model loads
  const tempBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.35, 2.5),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.45 })
  );
  tempBody.position.y = 0.75;
  tempBody.castShadow = true;
  kekeGroup.add(tempBody);

  let kekeModel = null;
  try {
    kekeModel = await assetManager.loadGLB('/assets/models/keke.glb', { scale: 1.15 });
    kekeGroup.remove(tempBody);
    kekeGroup.add(kekeModel);
  } catch (e) {
    console.warn('Keke GLB fallback to procedural box');
  }

  // ---- Systems ----
  const kekeController = new KekePhysicsController(kekeGroup);
  if (kekeModel) kekeController.bindWheels(kekeModel);

  const cameraRig = new KekeCameraRig(camera, kekeGroup);
  const roadSystem = new InfiniteRoadSystem(scene, assetManager);
  await roadSystem.init();

  const landmarkManager = new KanoLandmarkManager(scene, assetManager);
  await landmarkManager.init();

  const trafficManager = new DynamicTrafficManager(scene, kekeController, assetManager);
  await trafficManager.init();

  const passengerManager = new PassengerManager(scene, kekeController);
  passengerManager.dailyEarnings = savedData.cash ?? 1500;

  const fuelManager = new FuelManager(kekeController);
  const customizer = new KekeCustomizer(scene, kekeGroup);
  const nightEngine = new NightThugDangerEngine(scene, kekeController, customizer, {});
  const prayerManager = new PrayerTimeManager({ stamina: 100, stressLevel: 0 });
  const radioManager = new HausaRadioManager();
  const settlementManager = new DailySettlementManager(passengerManager, fuelManager, kekeController);
  const coinManager = new CoinPickupManager(scene, kekeController);
  const fightEngine = new PassengerFightEngine(kekeController, passengerManager);
  const collisionSystem = new KekeCollisionSystem(kekeGroup, kekeController);
  const weatherManager = new KanoWeatherManager(scene, kekeController, passengerManager);
  const policeEngine = new PoliceCheckpointEngine(scene, kekeController, passengerManager);
  const audioEngine = new KanoAudioEngine();
  audioEngine.setup(camera, kekeGroup);
  audioEngine.enableOnInteraction();

  // Mobile controls (now that we have audio for horn)
  setupMobileControls(input, () => audioEngine.playHorn());

  const pedestrianManager = new PedestrianManager(scene, kekeController, assetManager);
  await pedestrianManager.init();
  const maintenanceEngine = new KekeMaintenanceEngine(kekeController, fuelManager);
  const dialogueManager = new PassengerDialogueManager();
  const hotspotManager = new SpatialHotspotManager(
    scene, kekeController, fuelManager, passengerManager, prayerManager, maintenanceEngine
  );
  const particleSystem = new KanoParticleSystem(scene, kekeGroup);

  policeEngine.spawnCheckpoint(220);

  // Populate route select
  const routeSelect = document.getElementById('route-select');
  if (routeSelect) {
    KANO_ROUTES.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      routeSelect.appendChild(opt);
    });
  }

  // HUD helpers
  function showBanner(msg) {
    const banner = document.getElementById('notification-banner');
    const text = document.getElementById('banner-text');
    if (banner && text) {
      text.textContent = msg;
      banner.style.opacity = '1';
      banner.style.transform = 'translateY(0)';
      clearTimeout(window._bannerTimer);
      window._bannerTimer = setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-20px)';
      }, 3200);
    }
  }

  // Time system
  window.timeInMinutes = 6 * 60; // start 06:00
  let timeAccum = 0;

  // Input – keyboard
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyH' || e.code === 'Space') { isHornActive = true; audioEngine.playHorn(); }
    if (e.code === 'KeyR') {
      const on = radioManager.toggle();
      const el = document.getElementById('radio-display');
      if (el) el.textContent = on ? 'ON – Hausa FM' : 'OFF';
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'KeyH' || e.code === 'Space') isHornActive = false;
  });

  // Start button
  let gameStarted = false;
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      gameStarted = true;
      const menu = document.getElementById('main-menu-overlay');
      if (menu) menu.style.display = 'none';
      showBanner('🚗 Shift started! Drive safe in Kano.');
      // Set route name
      const sel = document.getElementById('route-select');
      const routeName = document.getElementById('route-name-display');
      if (sel && routeName && KANO_ROUTES[sel.value - 1]) {
        routeName.textContent = KANO_ROUTES[sel.value - 1].name.split('➔')[0].trim();
      }
    });
  }

  // Shop
  document.getElementById('buy-neon')?.addEventListener('click', () => {
    if (passengerManager.dailyEarnings >= 3500) {
      passengerManager.dailyEarnings -= 3500;
      customizer.applyNeon();
      showBanner('🚨 Neon Underglow installed!');
      document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    } else showBanner('Not enough cash for Neon.');
  });
  document.getElementById('buy-subwoofer')?.addEventListener('click', () => {
    if (passengerManager.dailyEarnings >= 5000) {
      passengerManager.dailyEarnings -= 5000;
      showBanner('🔊 Subwoofer System installed!');
      document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    } else showBanner('Not enough cash for Subwoofer.');
  });
  document.getElementById('buy-bumper')?.addEventListener('click', () => {
    if (passengerManager.dailyEarnings >= 6500) {
      passengerManager.dailyEarnings -= 6500;
      showBanner('🛡️ Reinforced Bumper installed!');
      document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    } else showBanner('Not enough cash for Bumper.');
  });
  document.getElementById('close-shop')?.addEventListener('click', () => {
    document.getElementById('shop-modal').style.display = 'none';
  });

  // Earnings display
  const earningsEl = document.getElementById('earnings');
  if (earningsEl) earningsEl.innerText = passengerManager.dailyEarnings;

  hideLoading();
  showBanner('Welcome to Kano Run v2.0 – Professional Upgrade');

  // ============================================================
  // 5. Game Loop
  // ============================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameStarted) {
      // Keyboard input merge with mobile
      let throttle = input.throttle;
      let steer = input.steering;
      if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
      if (keys['KeyS'] || keys['ArrowDown']) throttle = -1;
      if (keys['KeyA'] || keys['ArrowLeft']) steer = 1;
      if (keys['KeyD'] || keys['ArrowRight']) steer = -1;
      // Mobile horn state
      if (input.horn) isHornActive = true;

      kekeController.setInput(throttle, steer);
      kekeController.update(delta);
      cameraRig.update(delta, kekeController.currentSpeed);

      // Time advance (1 real second ≈ 30 game seconds for playable day cycle)
      timeAccum += delta;
      if (timeAccum > 0.5) {
        window.timeInMinutes = (window.timeInMinutes + 1) % 1440;
        timeAccum = 0;
        const hours = Math.floor(window.timeInMinutes / 60);
        const mins = Math.floor(window.timeInMinutes % 60);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        const clockEl = document.getElementById('clock-display');
        if (clockEl) clockEl.textContent = `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`;
      }

      roadSystem.update(kekeGroup.position.z);
      audioEngine.updateEngine?.(kekeController.currentSpeed, kekeController.maxSpeed);

      trafficManager.update(delta, isHornActive);
      policeEngine.update((e) => showBanner(e.msg));

      if (redisSync?.sendPlayerState) {
        redisSync.sendPlayerState(kekeGroup.position, kekeController.currentSpeed, 1);
      }

      updateAtmosphereByTime(scene, renderer, window.timeInMinutes, roadSystem);
      prayerManager.update(window.timeInMinutes, (e) => { if (e.msg) showBanner(e.msg); });
      weatherManager.update(delta, kekeGroup.position, (msg) => showBanner(msg));
      landmarkManager.update(kekeGroup.position.z, (msg) => showBanner(msg));

      coinManager.update(delta, passengerManager, (e) => {
        showBanner(`🪙 Collected Kano Coin (+₦${e.value})!`);
        if (earningsEl) earningsEl.innerText = passengerManager.dailyEarnings;
      });

      collisionSystem.checkCollisions((msg) => showBanner(msg));
      maintenanceEngine.update(delta, kekeController.currentSpeed, (msg) => showBanner(msg));
      dialogueManager.update(delta, kekeController.currentSpeed, (e) => { if (e.msg) showBanner(e.msg); });

      passengerManager.update(delta, (e) => {
        if (e.msg) showBanner(e.msg);
        if (earningsEl) earningsEl.innerText = passengerManager.dailyEarnings;
      });

      fuelManager.update(delta, (e) => {
        if (e.type === 'FUEL_UPDATE') {
          const fuelBar = document.getElementById('fuel-bar');
          if (fuelBar) fuelBar.style.width = `${e.level}%`;
        }
        if (e.type === 'OUT_OF_FUEL') showBanner(e.msg);
      });

      nightEngine.update(window.timeInMinutes, passengerManager.dailyEarnings, (e) => {
        if (e.msg) showBanner(e.msg);
      });

      hotspotManager.update((e) => {
        if (e.type === 'HOTSPOT_PROMPT') showBanner(e.msg);
      });

      particleSystem.update(delta, kekeController.currentSpeed);
      pedestrianManager.update(delta);

      const speedDisplay = document.getElementById('speed-display');
      if (speedDisplay) {
        // velocity is m/s → km/h
        speedDisplay.innerText = Math.round(Math.abs(kekeController.velocity) * 3.6);
      }
    } else {
      // Menu idle – gentle camera orbit
      camera.position.set(
        Math.sin(clock.elapsedTime * 0.15) * 14,
        6,
        Math.cos(clock.elapsedTime * 0.15) * 14
      );
      camera.lookAt(0, 1, 0);
    }

    composer.render();
  }

  animate();
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  hideLoading();
  alert('Failed to load game assets. Check console.');
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
