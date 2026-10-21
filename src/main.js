import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setupKanoAtmosphere, updateAtmosphereByTime } from './KanoAtmosphere.js';
import { KekePhysicsController } from './KekePhysicsController.js';
import { KekeCameraRig } from './KekeCameraRig.js';
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
import { MainMenuManager } from './MainMenuManager.js';
import { CharacterSelectionManager } from './CharacterSelectionManager.js';
import { KekeMaintenanceEngine } from './KekeMaintenanceEngine.js';
import { PassengerDialogueManager } from './PassengerDialogueManager.js';
import { SaveSystem } from './SaveSystem.js';
import { setupMobileControls } from './MobileTouchControls.js';
import { SupabaseManager } from './backend/SupabaseManager.js';
import { RedisSyncManager } from './backend/RedisSyncManager.js';
import { GameplayAnalyticsTracker } from './backend/GameplayAnalyticsTracker.js';
import { KANO_ROUTES } from './KanoRoutesData.js';
import { setupPostProcessing } from './KanoPostProcessor.js';
import { KanoParticleSystem } from './KanoParticleSystem.js';

// 1. Setup Canvas, Scene, Camera, and WebGL Renderer
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 2. Setup Kano Atmosphere & Cinematic Post-Processing Composer Stack
setupKanoAtmosphere(scene, renderer);
const composer = setupPostProcessing(renderer, scene, camera);

// 3. Load Saved Profile Data via SaveSystem & Backend Services
const savedData = SaveSystem.loadGame();

// Safe Redis/Supabase sync initialization with fallback protection
let redisSync = null;
try {
  redisSync = new RedisSyncManager();
  if (typeof redisSync.connect === 'function') {
    redisSync.connect(() => {});
  }
} catch (e) {
  console.log("ℹ️ Multiplayer sync fallback active.");
}

// 4. Input State Objects & Mobile Touch Controls
const input = { throttle: 0, steering: 0 };
let isHornActive = false;
setupMobileControls(input);

// 5. Create Ground Plane for Shadows and Keke Root Group
const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.1 });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

const kekeGroup = new THREE.Group();
const bodyMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.6, 1.4, 2.6),
  new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 })
);
bodyMesh.position.y = 0.8;
bodyMesh.castShadow = true;
kekeGroup.add(bodyMesh);
scene.add(kekeGroup);

// Load GLTF Model with Full PBR Mesh Traversal & Shadow Mapping
const gltfLoader = new GLTFLoader();
gltfLoader.load('/assets/models/keke.glb', (gltf) => {
  kekeGroup.remove(bodyMesh);
  const kekeModel = gltf.scene;

  // Traverse model nodes to apply high-quality PBR lighting & shadows
  kekeModel.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        node.material.envMapIntensity = 1.5;
        node.material.needsUpdate = true;
      }
    }
  });

  kekeModel.scale.set(1.2, 1.2, 1.2);
  kekeModel.position.y = 0;
  kekeGroup.add(kekeModel);
}, undefined, () => {
  console.log("ℹ️ Using procedural fallback box mesh for Keke (GLB asset pending).");
});

// 6. Initialize Game Systems & Core Controllers
const kekeController = new KekePhysicsController(kekeGroup);
const cameraRig = new KekeCameraRig(camera, kekeGroup);
const passengerManager = new PassengerManager(scene, kekeController);
passengerManager.dailyEarnings = savedData.cash;

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
const trafficManager = new DynamicTrafficManager(scene, kekeController);
const policeEngine = new PoliceCheckpointEngine(scene, kekeController, passengerManager);
const audioEngine = new KanoAudioEngine();
const landmarkManager = new KanoLandmarkManager(scene);
const charManager = new CharacterSelectionManager();
const maintenanceEngine = new KekeMaintenanceEngine(kekeController, fuelManager);
const dialogueManager = new PassengerDialogueManager();

const hotspotManager = new SpatialHotspotManager(
  scene, 
  kekeController, 
  fuelManager, 
  passengerManager, 
  prayerManager,
  maintenanceEngine
);
const particleSystem = new KanoParticleSystem(scene, kekeGroup);

policeEngine.spawnCheckpoint(220);

// 7. Populate 50 Real Kano Routes in UI Select Dropdown
const routeSelectEl = document.getElementById('route-select');
if (routeSelectEl) {
  KANO_ROUTES.forEach((route) => {
    const opt = document.createElement('option');
    opt.value = route.id;
    opt.innerText = `${route.id}. ${route.name} (₦${route.baseFare})`;
    routeSelectEl.appendChild(opt);
  });
}

const earningsElInit = document.getElementById('earnings');
if (earningsElInit) earningsElInit.innerText = passengerManager.dailyEarnings;

// 8. Initialize 3D Main Menu & Developer Credit System (@iamzaksz)
const mainMenu = new MainMenuManager(scene, camera, kekeGroup, () => {
  audioEngine.init();
  showBanner('🎮 Driver Shift Started! Developed by Hassan Zakariya (@iamzaksz)');
});

document.getElementById('start-game-btn')?.addEventListener('click', () => {
  mainMenu.startGame();

  // Increment and sync global gameplay analytics counter
  GameplayAnalyticsTracker.incrementPlayCount((newCount) => {
    const counterEl = document.getElementById('global-play-count');
    if (counterEl) counterEl.innerText = newCount.toLocaleString();
  });

  const selectedRouteId = routeSelectEl ? routeSelectEl.value : 1;
  const routeObj = KANO_ROUTES.find(r => r.id == selectedRouteId) || KANO_ROUTES[0];
  const routeNameEl = document.getElementById('route-name-display');
  if (routeNameEl) routeNameEl.innerText = routeObj.name;
});

window.timeInMinutes = 360;

passengerManager.spawnPassenger(new THREE.Vector3(-3, 0.8, 40));
passengerManager.spawnPassenger(new THREE.Vector3(3, 0.8, 120));

// 9. Keyboard Listeners & Choice Handlers
window.addEventListener('keydown', (e) => {
  if (mainMenu.isInMenu) return;

  if (e.key === 'w' || e.key === 'ArrowUp') input.throttle = 1;
  if (e.key === 's' || e.key === 'ArrowDown') input.throttle = -1;
  if (e.key === 'a' || e.key === 'ArrowLeft') input.steering = 1;
  if (e.key === 'd' || e.key === 'ArrowRight') input.steering = -1;

  if (e.key === 'h' || e.key === 'H') {
    isHornActive = true;
    audioEngine.playHorn();
  }

  if (e.key === 'e' || e.key === 'E') {
    hotspotManager.triggerInteraction((msg) => showBanner(msg));
  }

  if (e.key === 'r' || e.key === 'R') {
    if (!radioManager.isPlaying) {
      radioManager.togglePower((msg) => showBanner(msg));
    } else {
      radioManager.nextStation((msg) => showBanner(msg));
    }
    const radioDisplay = document.getElementById('radio-display');
    if (radioDisplay) {
      const station = radioManager.stations[radioManager.currentStationIndex];
      radioDisplay.innerText = radioManager.isPlaying ? station.freq : 'OFF';
    }
  }

  if (e.code === 'Space' && fightEngine.isFighting) {
    fightEngine.handleFightMash((msg) => showBanner(msg));
  }

  if (policeEngine.activeCheckpoint && policeEngine.activeCheckpoint.triggered) {
    if (e.key === '1') showBanner(policeEngine.handleChoice(1));
    if (e.key === '2') showBanner(policeEngine.handleChoice(2));
  }

  if (nightEngine.activeRoadblock && nightEngine.activeRoadblock.isTriggered) {
    if (e.key === '1') showBanner(nightEngine.handleChoice(1, passengerManager));
    if (e.key === '2') showBanner(nightEngine.handleChoice(2, passengerManager));
  }
});

window.addEventListener('keyup', (e) => {
  if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) input.throttle = 0;
  if (['a', 'd', 'ArrowLeft', 'ArrowRight'].includes(e.key)) input.steering = 0;
  if (e.key === 'h' || e.key === 'H') isHornActive = false;
});

// 10. Garajin Keke Shop UI Button Handlers
document.getElementById('buy-neon')?.addEventListener('click', () => {
  if (passengerManager.dailyEarnings >= 3500) {
    passengerManager.dailyEarnings -= 3500;
    document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    customizer.installNeon(0x00ffff);
    showBanner('🚨 Installed Neon Underglow!');
  } else {
    showBanner('❌ Need ₦3,500 for Neon Underglow.');
  }
});

document.getElementById('buy-subwoofer')?.addEventListener('click', () => {
  if (passengerManager.dailyEarnings >= 5000) {
    passengerManager.dailyEarnings -= 5000;
    document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    customizer.installSubwoofer();
    radioManager.upgradeSubwoofer();
    showBanner('🔊 Installed Subwoofer System!');
  } else {
    showBanner('❌ Need ₦5,000 for Subwoofer.');
  }
});

document.getElementById('buy-bumper')?.addEventListener('click', () => {
  if (passengerManager.dailyEarnings >= 6500) {
    passengerManager.dailyEarnings -= 6500;
    document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    customizer.installBumper();
    showBanner('🛡️ Installed Steel Reinforced Bumper!');
  } else {
    showBanner('❌ Need ₦6,500 for Bumper.');
  }
});

document.getElementById('close-shop')?.addEventListener('click', () => {
  const modal = document.getElementById('shop-modal');
  if (modal) modal.style.display = 'none';
});

function showBanner(msg) {
  const banner = document.getElementById('notification-banner');
  const bannerText = document.getElementById('banner-text');
  if (banner && bannerText) {
    bannerText.innerText = msg;
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 4000);
  }
}

// 11. Main Render Loop
const clock = new THREE.Clock();
let saveTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mainMenu.isInMenu) {
    mainMenu.updateMenuCamera(delta);
  } else {
    saveTimer += delta;
    if (saveTimer > 30) {
      saveTimer = 0;
      const payload = {
        cash: passengerManager.dailyEarnings,
        savings: settlementManager.bankSavings,
        currentLevel: 1,
        unlockedDrivers: ['bello'],
        unlockedKekes: ['standard_yellow']
      };
      SaveSystem.saveGame(payload);
      SupabaseManager.syncProfileToCloud('anon_driver_kano', payload);
    }

    if (!settlementManager.isSettlementActive) {
      window.timeInMinutes += delta * 2;
      if (window.timeInMinutes >= 1440) window.timeInMinutes = 0;
    }

    const hrs = Math.floor(window.timeInMinutes / 60);
    const mins = Math.floor(window.timeInMinutes % 60);
    const clockDisplay = document.getElementById('clock-display');
    if (clockDisplay) {
      clockDisplay.innerText = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    settlementManager.checkEndOfDay(window.timeInMinutes, (e) => {
      if (e.msg) showBanner(e.msg);
    });

    kekeController.setInput(input.throttle, input.steering);
    kekeController.update(delta);
    cameraRig.update(delta, kekeController.currentSpeed, kekeController.maxSpeed);

    audioEngine.updateEngine(kekeController.currentSpeed, kekeController.maxSpeed);

    trafficManager.update(delta, isHornActive);
    policeEngine.update((e) => showBanner(e.msg));

    if (redisSync && typeof redisSync.sendPlayerState === 'function') {
      redisSync.sendPlayerState(kekeGroup.position, kekeController.currentSpeed, 1);
    }

    updateAtmosphereByTime(scene, renderer, window.timeInMinutes);
    prayerManager.update(window.timeInMinutes, (e) => { if (e.msg) showBanner(e.msg); });
    weatherManager.update(delta, kekeGroup.position, (msg) => showBanner(msg));
    landmarkManager.update(kekeGroup.position.z, (msg) => showBanner(msg));

    coinManager.update(delta, passengerManager, (e) => {
      showBanner(`🪙 Collected Kano Coin (+₦${e.value})!`);
      const earningsEl = document.getElementById('earnings');
      if (earningsEl) earningsEl.innerText = passengerManager.dailyEarnings;
    });

    collisionSystem.checkCollisions((msg) => showBanner(msg));
    maintenanceEngine.update(delta, kekeController.currentSpeed, (msg) => showBanner(msg));
    dialogueManager.update(delta, kekeController.currentSpeed, (e) => { if (e.msg) showBanner(e.msg); });

    passengerManager.update(delta, (e) => {
      if (e.msg) showBanner(e.msg);
      const earningsEl = document.getElementById('earnings');
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

    const speedDisplay = document.getElementById('speed-display');
    if (speedDisplay) {
      speedDisplay.innerText = Math.round(Math.abs(kekeController.currentSpeed) * 180);
    }
  }

  // Render post-processing pipeline
  composer.render();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});