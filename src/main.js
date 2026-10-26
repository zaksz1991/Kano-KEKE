import * as THREE from 'three';
import { AssetManager } from './AssetManager.js';
import { setupKanoAtmosphere, updateAtmosphereByTime } from './KanoAtmosphere.js';
import { setupPostProcessing } from './KanoPostProcessor.js';
import { KekePhysicsController } from './KekePhysicsController.js';
import { KekeCameraRig } from './KekeCameraRig.js';
import { InfiniteRoadSystem } from './InfiniteRoadSystem.js';
import { PassengerManager } from './PassengerManager.js';
import { FuelManager } from './FuelManager.js';
import { DynamicTrafficManager } from './DynamicTrafficManager.js';
import { PoliceCheckpointEngine } from './PoliceCheckpointEngine.js';
import { KanoAudioEngine } from './KanoAudioEngine.js';
import { KanoLandmarkManager } from './KanoLandmarkManager.js';
import { CharacterSelectionManager } from './CharacterSelectionManager.js';
import { GameFlowManager } from './GameFlowManager.js';
import { PedestrianManager } from './PedestrianManager.js';
import { KanoParticleSystem } from './KanoParticleSystem.js';
import { KanoWeatherManager } from './KanoWeatherManager.js';
import { SaveSystem } from './SaveSystem.js';
import { setupMobileControls } from './MobileTouchControls.js';
import { KANO_ROUTES } from './KanoRoutesData.js';
import { KekeCustomizer } from './KekeCustomizer.js';
import { PrayerTimeManager } from './PrayerTimeManager.js';
import { DailySettlementManager } from './DailySettlementManager.js';
import { MissionManager } from './MissionManager.js';
import { KekeCollisionSystem } from './KekeCollisionSystem.js';
import { HausaVoiceBank } from './HausaVoiceBank.js';
import { MissionBoardUI } from './MissionBoardUI.js';
import { KekeSeatOccupancy } from './KekeSeatOccupancy.js';

// ---------- Renderer ----------
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMappingExposure = 1.65;
setupKanoAtmosphere(scene, renderer);
const composer = setupPostProcessing(renderer, scene, camera);

// ---------- Shared state ----------
const assetManager = new AssetManager();
const saved = SaveSystem.loadGame();
const charSelect = new CharacterSelectionManager();
const input = { throttle: 0, steering: 0, horn: false };
const keys = {};
let gameStarted = false;
let isHornActive = false;
let paused = false;
window.timeInMinutes = 7 * 60;

// ---------- Early menu UI ----------

  // Daily reward button
  (function() {
    const menuBtns = document.querySelector('.menu-buttons');
    if (menuBtns && !document.getElementById('daily-claim-btn')) {
      const b = document.createElement('button');
      b.id = 'daily-claim-btn';
      b.className = 'btn-menu';
      b.style.cssText = 'background:linear-gradient(135deg,#00bcd4,#006064);color:#fff;margin-top:6px;font-size:13px;';
      b.textContent = 'DAILY REWARD';
      menuBtns.insertBefore(b, menuBtns.firstChild?.nextSibling || null);
    }
  })();

(function wireMenu() {
  const routeSelect = document.getElementById('route-select');
  if (routeSelect && routeSelect.options.length === 0) {
    KANO_ROUTES.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      routeSelect.appendChild(opt);
    });
  }
  charSelect.populateUI();
  // Ensure keke select exists
  if (!document.getElementById('keke-select')) {
    const panel = document.querySelector('.selection-panel');
    if (panel) {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div style="color:#00ffff;font-size:12px;margin-top:8px;">KEKE:</div>`;
      const sel = document.createElement('select');
      sel.id = 'keke-select';
      wrap.appendChild(sel);
      panel.appendChild(wrap);
      charSelect.populateUI();
    }
  }
})();

// Loading
function showLoading(msg, pct = 0) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.style.cssText = 'position:fixed;inset:0;background:#0a0a0f;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffcc00;font-family:system-ui,sans-serif;';
    el.innerHTML = `<div style="font-size:28px;font-weight:800;letter-spacing:3px;">KANO RUN</div>
      <div id="load-msg" style="font-size:14px;color:#00ffff;margin:14px 0;">${msg}</div>
      <div style="width:260px;height:6px;background:#222;border-radius:4px;overflow:hidden;">
        <div id="load-bar" style="width:${pct}%;height:100%;background:linear-gradient(90deg,#ffcc00,#ff9800);"></div>
      </div>`;
    document.body.appendChild(el);
  } else {
    const m = document.getElementById('load-msg');
    const b = document.getElementById('load-bar');
    if (m) m.textContent = msg;
    if (b) b.style.width = `${pct}%`;
  }
}
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }
}
function showBanner(msg) {
  const banner = document.getElementById('notification-banner');
  const text = document.getElementById('banner-text');
  if (!banner || !text) return;
  text.textContent = typeof msg === 'string' ? msg : (msg.msg || '');
  banner.style.opacity = '1';
  banner.style.transform = 'translateY(0)';
  clearTimeout(window._bannerTimer);
  window._bannerTimer = setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-20px)';
  }, 3500);
}

// ---------- Bootstrap ----------
async function bootstrap() {
  showLoading('Loading Kano streets...', 10);
  const safety = setTimeout(() => hideLoading(), 15000);

  // Keke group
  const kekeGroup = new THREE.Group();
  scene.add(kekeGroup);
  const tempBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.35, 2.5),
    new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.45, metalness: 0.2 })
  );
  tempBody.position.y = 0.75;
  tempBody.castShadow = true;
  kekeGroup.add(tempBody);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 1000),
    new THREE.MeshStandardMaterial({ color: 0x6b5e4e, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 200;
  ground.receiveShadow = true;
  scene.add(ground);

  camera.position.set(0, 5, -12);
  camera.lookAt(0, 1, 5);

  // Load keke model (timeout)
  showLoading('Loading keke...', 40);
  let kekeModel = null;
  try {
    kekeModel = await Promise.race([
      assetManager.loadGLB('/assets/models/keke.glb', { scale: 1.15 }),
      new Promise((r) => setTimeout(() => r(null), 7000))
    ]);
    if (kekeModel) {
      kekeGroup.remove(tempBody);
      kekeModel.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          if (n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => { if (m) { m.envMapIntensity = 1.8; m.needsUpdate = true; } });
          }
        }
      });
      // Apply selected keke color tint
      const kekeDef = charSelect.getKeke();
      kekeModel.traverse((n) => {
        if (n.isMesh && n.material && n.material.color) {
          // subtle - only if yellow-ish base
        }
      });
      kekeGroup.add(kekeModel);
    }
  } catch (e) {
    console.warn('Keke model fallback');
  }

  showLoading('Building world...', 70);

  // Systems
  const kekeController = new KekePhysicsController(kekeGroup);
  if (kekeModel) kekeController.bindWheels(kekeModel);
  // Apply driver/keke bonuses
  const driver = charSelect.getDriver();
  const kekeDef = charSelect.getKeke();
  kekeController.maxSpeed = 28 * (kekeDef.speed || 1) * (driver.speedBonus || 1);

  const cameraRig = new KekeCameraRig(camera, kekeGroup);
  const flow = new GameFlowManager(scene, camera, kekeGroup, kekeController, cameraRig);

  const roadSystem = new InfiniteRoadSystem(scene, assetManager);
  roadSystem.init().catch(() => {});

  const landmarkManager = new KanoLandmarkManager(scene, assetManager);
  landmarkManager.init().catch(() => {});

  const trafficManager = new DynamicTrafficManager(scene, kekeController, assetManager);
  trafficManager.init().catch(() => {});

  const passengerManager = new PassengerManager(scene, kekeController, assetManager);
  passengerManager.dailyEarnings = saved.cash ?? 1500;
  passengerManager.capacity = kekeDef.capacity || 3;
  passengerManager.negotiationBonus = driver.negotiationBonus || 1;
  passengerManager.tipBonus = driver.tipBonus || 1;
  passengerManager.initModels().catch(() => {});
  const seatOccupancy = new KekeSeatOccupancy(kekeGroup, assetManager);
  seatOccupancy.init().catch(() => {});
  const missionManager = new MissionManager();
  missionManager.loadProgress(saved);
  const missionBoard = new MissionBoardUI(missionManager, charSelect);
  try { missionBoard.showPreview(); } catch (e) {}

  const collisionSystem = new KekeCollisionSystem(kekeGroup, kekeController, trafficManager, missionManager);


  const fuelManager = new FuelManager(kekeController);
  const policeEngine = new PoliceCheckpointEngine(scene, kekeController, passengerManager);
  policeEngine.spawnCheckpoint(200);
  const audioEngine = new KanoAudioEngine();
  audioEngine.setup(camera, kekeGroup);
  audioEngine.enableOnInteraction();
  const voiceBank = new HausaVoiceBank(audioEngine);
  // Preload speech voices
  if (window.speechSynthesis) speechSynthesis.getVoices();

  const pedestrianManager = new PedestrianManager(scene, kekeController, assetManager);
  pedestrianManager.init().catch(() => {});
  const particleSystem = new KanoParticleSystem(scene, kekeGroup);
  const weatherManager = new KanoWeatherManager(scene, kekeController, passengerManager);
  const customizer = new KekeCustomizer(scene, kekeGroup);
  const prayerManager = new PrayerTimeManager({ stamina: 100, stressLevel: 0 });
  const settlementManager = new DailySettlementManager(passengerManager, fuelManager, kekeController, missionManager);
  settlementManager.loadDaily(saved);
  window.__kanoSettle = (result) => settlementManager.settle(result);
  window.__kanoBuyContinue = () => {
    const r = missionManager.buyContinue(passengerManager.dailyEarnings, 1500);
    if (!r.ok) { showBanner('Need ₦1,500 for continue'); return false; }
    passengerManager.dailyEarnings -= r.cost;
    const earn = document.getElementById('earnings');
    if (earn) earn.innerText = passengerManager.dailyEarnings;
    collisionSystem.repair();
    kekeController.velocity = 0;
    kekeController.maxSpeed = Math.max(kekeController.maxSpeed, 20);
    const modal = document.getElementById('continue-modal');
    if (modal) modal.remove();
    _updateMissionHud(missionManager);
    return true;
  };

  setupMobileControls(input, () => audioEngine.playHorn());

  document.getElementById('daily-claim-btn')?.addEventListener('click', () => {
    const r = settlementManager.claimDaily();
    if (r.ok) {
      showBanner(`🎁 Daily reward +₦${r.amount}`);
      const earn = document.getElementById('earnings');
      if (earn) earn.innerText = passengerManager.dailyEarnings;
      SaveSystem.saveGame({ cash: passengerManager.dailyEarnings, lastDailyClaim: settlementManager.lastDailyClaim, currentLevel: missionManager.level, highScore: missionManager.highScore });
    } else {
      showBanner('Daily reward already claimed today');
    }
  });

  const mobileEl = document.getElementById('mobile-controls-overlay');
  if (mobileEl) mobileEl.style.display = 'none';

  // Input
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyH' || e.code === 'Space') {
      isHornActive = true;
      audioEngine.playHorn();
    }
    if (e.code === 'KeyR') {
      const name = audioEngine.cycleRadio();
      const el = document.getElementById('radio-display');
      if (el) el.textContent = name;
      showBanner(`📻 ${name}`);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      paused = flow.togglePause();
      showBanner(paused ? '⏸ Paused' : '▶ Resumed');
    }
    if (e.code === 'KeyE') {
      passengerManager.acceptDeal((ev) => showBanner(ev));
    }
    if (e.code === 'KeyN') {
      // End shift / settle
      const result = missionManager.settleShift(passengerManager.dailyEarnings, fuelManager.fuel ?? 50);
      settlementManager.settle(result);
      SaveSystem.saveGame({
        cash: passengerManager.dailyEarnings,
        currentLevel: result.level,
        xp: missionManager.xp,
        highScore: result.highScore,
        lastDailyClaim: settlementManager.lastDailyClaim
      });
    }
    if (e.code === 'KeyC') {
      customizer.openShop(passengerManager.dailyEarnings, (cost) => {
        if (passengerManager.dailyEarnings >= cost) {
          passengerManager.dailyEarnings -= cost;
          const earn = document.getElementById('earnings');
          if (earn) earn.innerText = passengerManager.dailyEarnings;
          showBanner(`Purchased (−₦${cost})`);
          return true;
        }
        showBanner('Not enough cash');
        return false;
      });
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'KeyH' || e.code === 'Space') isHornActive = false;
  });

  // Start shift
  window.__kanoStartShift = () => {
    // Re-read selection
    const ds = document.getElementById('driver-select');
    const ks = document.getElementById('keke-select');
    if (ds) charSelect.selectDriver(ds.value);
    if (ks) charSelect.selectKeke(ks.value);
    const d = charSelect.getDriver();
    const k = charSelect.getKeke();
    kekeController.maxSpeed = 28 * (k.speed || 1) * (d.speedBonus || 1);
    passengerManager.capacity = k.capacity || 3;
    passengerManager.negotiationBonus = d.negotiationBonus || 1;
    passengerManager.tipBonus = d.tipBonus || 1;

    gameStarted = true;
    const menu = document.getElementById('main-menu-overlay');
    if (menu) menu.style.display = 'none';
    if (mobileEl) mobileEl.style.display = 'block';
    ['top-left-hud', 'top-right-hud'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
    });
    const routeSel = document.getElementById('route-select');
    const routeName = document.getElementById('route-name-display');
    if (routeSel && routeName) {
      const route = KANO_ROUTES.find((r) => String(r.id) === String(routeSel.value)) || KANO_ROUTES[0];
      if (route) routeName.textContent = route.name.split('➔')[0].trim();
    }
    const earn = document.getElementById('earnings');
    if (earn) earn.innerText = passengerManager.dailyEarnings;

    showBanner(`${d.name} · ${k.name}`);
    const goals = missionManager.startShift('Kano');
    showBanner('Mission: ' + goals.map(g => g.label).join(' · '));
    _updateMissionHud(missionManager);
    try { missionBoard.hide(); } catch (e) {}
    flow.beginIntro();
    audioEngine.playOneShot(120, 0.3, 'sawtooth', 0.08);
  };

  document.getElementById('start-game-btn')?.addEventListener('click', () => {
    if (window.__kanoStartShift) window.__kanoStartShift();
  });

  // Shop
  document.getElementById('buy-neon')?.addEventListener('click', () => {
    if (passengerManager.dailyEarnings >= 3500) {
      passengerManager.dailyEarnings -= 3500;
      customizer.applyNeon?.() || customizer.installNeon?.();
      showBanner('🚨 Neon installed');
      document.getElementById('earnings').innerText = passengerManager.dailyEarnings;
    }
  });

  clearTimeout(safety);
  hideLoading();
  showBanner('Select driver & route, then START SHIFT');

  // Hide HUDs until start
  ['top-left-hud', 'top-right-hud'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let timeAccum = 0;

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!gameStarted) {
      // Menu orbit
      const t = clock.elapsedTime;
      camera.position.set(Math.sin(t * 0.12) * 14, 5.5, Math.cos(t * 0.12) * 14);
      camera.lookAt(0, 1.2, 0);
      try { composer.render(); } catch (e) { renderer.render(scene, camera); }
      return;
    }

    if (paused || flow.state === 'PAUSED') {
      try { composer.render(); } catch (e) { renderer.render(scene, camera); }
      return;
    }

    try {
      // Intro / flow
      flow.update(delta, showBanner);

      const canDrive = flow.isDriving();

      // Input only while driving
      let throttle = 0;
      let steer = 0;
      if (canDrive) {
        throttle = input.throttle || 0;
        steer = input.steering || 0;
        if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
        if (keys['KeyS'] || keys['ArrowDown']) throttle = -1;
        if (keys['KeyA'] || keys['ArrowLeft']) steer = 1;
        if (keys['KeyD'] || keys['ArrowRight']) steer = -1;
        if (input.horn) isHornActive = true;
      }

      if (canDrive) {
        if (kekeController.maxSpeed < 1) kekeController.maxSpeed = 28 * (charSelect.getKeke().speed || 1);
        kekeController.setInput(throttle, steer);
        kekeController.update(delta);
        cameraRig.update(delta, kekeController.currentSpeed);
      }

      // World systems always tick during/after intro
      roadSystem.update(kekeGroup.position.z);
      trafficManager.update(delta, isHornActive);
      pedestrianManager.update(delta);
      landmarkManager.update(kekeGroup.position.z, showBanner);
      weatherManager.update(delta, kekeGroup.position, showBanner);
      particleSystem.update(delta, kekeController.currentSpeed, weatherManager.currentWeather || 'CLEAR');
      updateAtmosphereByTime(scene, renderer, window.timeInMinutes, roadSystem);

      if (canDrive) {
        passengerManager.update(delta, (ev) => {
          showBanner(ev);
          seatOccupancy.sync(passengerManager.onBoard.length);
          const earn = document.getElementById('earnings');
          if (earn && ev.earnings != null) earn.innerText = ev.earnings;
          if (ev.type === 'BOARD') {
            audioEngine.playOneShot(520, 0.12, 'sine', 0.1);
            voiceBank.speak('board');
          }
          if (ev.type === 'NEGOTIATE') voiceBank.speak('negotiate');
          if (ev.type === 'DROP_REQUEST') voiceBank.speak('drop');
          if (ev.type === 'TIP') voiceBank.speak('tip');
          if (ev.type === 'DROPOFF') {
            voiceBank.speak('drop');
            audioEngine.playOneShot(660, 0.15, 'triangle', 0.12);
            const fareMatch = String(ev.msg || '').match(/₦(\d+)/);
            const fare = fareMatch ? parseInt(fareMatch[1], 10) : 200;
            missionManager.onDropoff(fare);
            _updateMissionHud(missionManager);
            SaveSystem.saveGame({
              cash: passengerManager.dailyEarnings,
              currentLevel: missionManager.level,
              xp: missionManager.xp,
              highScore: missionManager.highScore
            });
          }
          if (ev.type === 'BOARD') _updateMissionHud(missionManager);
        });
        policeEngine.update((ev) => {
          showBanner(ev);
          voiceBank.speak('karota');
          if (ev.msg && ev.msg.includes('To haka')) missionManager.onCheckpointClear(true);
          _updateMissionHud(missionManager);
        });
        collisionSystem.update(delta, (ev) => {
          showBanner(ev);
          if (ev.type === 'CRASH' || ev.type === 'WRECKED') voiceBank.speak('crash');
          _updateMissionHud(missionManager);
          if (ev.type === 'WRECKED') _showContinueModal(missionManager, collisionSystem, kekeController);
        });
        fuelManager.update(delta, (e) => {
          if (e.type === 'FUEL_UPDATE') {
            const bar = document.getElementById('fuel-bar');
            if (bar) bar.style.width = `${e.level}%`;
          }
          if (e.type === 'OUT_OF_FUEL') showBanner(e.msg);
        });
        prayerManager.update(window.timeInMinutes, (e) => { if (e?.msg) showBanner(e.msg); });
        audioEngine.updateEngine(kekeController.currentSpeed, kekeController.maxSpeed);

        // Clock
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

        const speedDisplay = document.getElementById('speed-display');
        if (speedDisplay) speedDisplay.innerText = Math.round(Math.abs(kekeController.velocity) * 3.6);
      }
    } catch (err) {
      console.warn('frame', err);
    }

    try { composer.render(); } catch (e) { renderer.render(scene, camera); }
  }

  animate();
}

bootstrap().catch((e) => {
  console.error(e);
  hideLoading();
  showBanner('Loaded with fallbacks');
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
