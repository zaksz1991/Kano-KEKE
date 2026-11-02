document.title = 'Kano-KEKE · AISHAT AKINTOLA';
import * as THREE from 'three';
import { AssetManager } from './AssetManager.js';
import { setupKanoAtmosphere, updateAtmosphereByTime, setPrayerAmbient } from './KanoAtmosphere.js';
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
import { MissionBoardUI } from './MissionBoardUI.js';
import { KekeSeatOccupancy } from './KekeSeatOccupancy.js';
import { DashHUD } from './DashHUD.js';
import { KanoRoadsideLife } from './KanoRoadsideLife.js';
import { FuelStationSystem } from './FuelStationSystem.js';
import { ProximityRadar } from './ProximityRadar.js';
import { HighScoreBoard } from './HighScoreBoard.js';
import { PauseMenu } from './PauseMenu.js';
import { DriverFatigueSystem } from './DriverFatigueSystem.js';
import { AchievementSystem } from './AchievementSystem.js';
import { FirstShiftTutorial } from './FirstShiftTutorial.js';
import { StreetEventSystem } from './StreetEventSystem.js';
import { NearMissSystem } from './NearMissSystem.js';
import { HausaVoiceBank } from './HausaVoiceBank.js';
import { KekeSignalLights } from './KekeSignalLights.js';
import { KekeHeadlights } from './KekeHeadlights.js';

// CapsuleGeometry polyfill for older three builds
if (!THREE.CapsuleGeometry) {
  THREE.CapsuleGeometry = class extends THREE.CylinderGeometry {
    constructor(r = 0.25, len = 0.8) {
      super(r, r, len + r * 2, 8);
    }
  };
}

// ---------- Renderer ----------
const canvas = document.getElementById('webgl-canvas') || document.createElement('canvas');
if (!canvas.id) { canvas.id = 'webgl-canvas'; document.body.prepend(canvas); }
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const _isMob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !_isMob,
  powerPreference: 'high-performance',
  stencil: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(_isMob ? 1 : Math.min(window.devicePixelRatio, 1.75));
renderer.toneMappingExposure = 1.65;
setupKanoAtmosphere(scene, renderer);
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
const composer = isMobile
  ? { render: () => renderer.render(scene, camera), setSize: (w,h) => renderer.setSize(w,h) }
  : setupPostProcessing(renderer, scene, camera);
if (isMobile) {
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.far = 140;
  camera.updateProjectionMatrix();
  // Prefer low power
  window.__kanoLowQuality = true;
}

// ---------- Shared state ----------
const assetManager = new AssetManager();
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';
    startBtn.textContent = 'LOADING MODELS...';
  }

const saved = SaveSystem.loadGame();
const charSelect = new CharacterSelectionManager();
const input = { throttle: 0, steering: 0, horn: false };
const keys = {};
let gameStarted = false;
let isHornActive = false;
let paused = false;
window.timeInMinutes = 10 * 60 + 30; // 10:30 AM – bright Kano day like photo

// ---------- Early start (works even if bootstrap still loading) ----------
window.__kanoStartQueued = false;
window.__kanoClaimDaily = null;
window.__kanoCash = 1500;

window.__kanoStartShift = null;
document.getElementById('start-game-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (typeof window.__kanoStartShift === 'function') {
    window.__kanoStartShift();
  } else {
    window.__kanoStartQueued = true;
    hideLoading();
    showBanner('Starting…');
  }
});


// ---------- AISHAT AKINTOLA credit (always visible) ----------
  (function brandAishat() {
    if (document.getElementById('aishat-credit')) return;
    const el = document.createElement('div');
    el.id = 'aishat-credit';
    el.style.cssText =
      'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:120;pointer-events:none;' +
      'font:800 11px/1.2 system-ui,sans-serif;letter-spacing:2px;color:#ffcc00;' +
      'text-shadow:0 0 8px rgba(0,0,0,0.9),0 1px 2px #000;background:rgba(0,0,0,0.45);' +
      'padding:4px 12px;border-radius:999px;border:1px solid rgba(255,204,0,0.5);';
    el.textContent = 'AISHAT AKINTOLA';
    document.body.appendChild(el);
  })();

  // ---------- Early menu UI ----------

  // Daily reward – bind EXISTING button (index.html already has it)
  (function bindDailyReward() {
    const menuBtns = document.querySelector('.menu-buttons');
    let b = document.getElementById('daily-claim-btn');
    if (!b && menuBtns) {
      b = document.createElement('button');
      b.id = 'daily-claim-btn';
      b.className = 'btn-menu';
      b.textContent = 'Daily Reward';
      menuBtns.insertBefore(b, menuBtns.firstChild || null);
    }
    if (!b || b.dataset.bound === '1') return;
    b.dataset.bound = '1';
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.__kanoClaimDaily === 'function') {
        window.__kanoClaimDaily();
      } else {
        // Before bootstrap: only claim if not already claimed today (localStorage)
        try {
          const raw = localStorage.getItem('kano_run_save_v2');
          const prev = raw ? JSON.parse(raw) : {};
          // WAT calendar day (UTC+1) so claim resets at midnight Kano time
          const watDay = (ts) => {
            const d = new Date(ts + 3600000); // +1h
            return d.getUTCFullYear() + '-' + d.getUTCMonth() + '-' + d.getUTCDate();
          };
          if (prev.lastDailyClaim && watDay(prev.lastDailyClaim) === watDay(Date.now())) {
            b.textContent = 'ALREADY CLAIMED';
            b.disabled = true;
            showBanner('Daily already claimed today (WAT)');
            return;
          }
          const amt = 1500;
          const cash = (prev.cash || window.__kanoCash || 1500) + amt;
          const claimAt = Date.now();
          localStorage.setItem('kano_run_save_v2', JSON.stringify({
            ...prev,
            cash,
            lastDailyClaim: claimAt,
            updatedAt: claimAt
          }));
          window.__kanoCash = cash;
          window.__kanoDailyPending = 0; // already saved
          b.textContent = 'CLAIMED +₦' + amt;
          b.style.background = '#2e7d32';
          showBanner('🎁 Daily reward +₦' + amt);
          let chip = document.getElementById('menu-cash-chip');
          if (!chip && menuBtns) {
            chip = document.createElement('div');
            chip.id = 'menu-cash-chip';
            chip.style.cssText = 'color:#4caf50;font-weight:900;font-size:16px;margin:6px 0;';
            menuBtns.prepend(chip);
          }
          if (chip) chip.textContent = 'CASH ₦' + cash;
        } catch (err) {
          showBanner('Daily claim failed — try again after load');
        }
      }
    };
    b.addEventListener('click', handler);
    b.addEventListener('touchend', handler, { passive: false });
  })();


(function addControlsLegend() {
  if (document.getElementById('controls-legend')) return;
  const menu = document.getElementById('main-menu-overlay');
  if (!menu) return;
  const el = document.createElement('div');
  el.id = 'controls-legend';
  el.style.cssText = 'margin:8px 16px 0;padding:10px 12px;background:rgba(0,0,0,0.65);border:1px solid rgba(255,204,0,0.3);border-radius:10px;color:#ccc;font:11px/1.5 system-ui;max-width:320px;';
  el.innerHTML = `<div style="color:#ffcc00;font-weight:800;margin-bottom:4px;">CONTROLS</div>
    ACCEL / BRAKE · Steer ◀ ▶ · HORN<br/>
    Hold ACCEL to skip intro · Slow near people to pick up<br/>
    <span style="color:#80deea;">R</span> Radio · <span style="color:#80deea;">C</span> Garage · <span style="color:#80deea;">N</span> End shift · <span style="color:#80deea;">P</span> Pause`;
  const btns = menu.querySelector('.menu-buttons');
  if (btns) menu.insertBefore(el, btns);
  else menu.appendChild(el);
})();

(function wireMenu() {
  const routeSelect = document.getElementById('route-select');
  if (routeSelect) {
    const level = (() => {
      try {
        return JSON.parse(localStorage.getItem('kano_run_save_v2') || '{}').currentLevel || 1;
      } catch (e) {
        return 1;
      }
    })();
    routeSelect.innerHTML = '';
    KANO_ROUTES.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      const locked = (r.minLevel || 1) > level;
      opt.textContent = locked
        ? `🔒 ${r.name} (Lv${r.minLevel})`
        : `${r.name} · ₦${r.baseFare}+ · ${r.distanceKm}km`;
      opt.disabled = locked;
      routeSelect.appendChild(opt);
    });
  }
  charSelect.populateUI();
  // Ensure keke select exists
  if (!document.getElementById('keke-select')) {
    const panel = document.querySelector('#selection-panel, .selection-panel');
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
    el.innerHTML = `<div style="font-size:11px;letter-spacing:3px;color:#ffcc00;font-weight:800;margin-bottom:6px;">AISHAT AKINTOLA</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:3px;">Kano-KEKE</div>
      <div id="load-msg" style="font-size:14px;color:#00ffff;margin:14px 0;">${msg}</div>
      <div style="width:260px;height:6px;background:#222;border-radius:4px;overflow:hidden;">
        <div id="load-bar" style="width:${pct}%;height:100%;background:linear-gradient(90deg,#ffcc00,#ff9800);transition:width 0.25s;"></div>
      </div>
      <div style="font-size:11px;color:#666;margin-top:12px;">You can press Start Shift as soon as it unlocks</div>`;
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
function saveShiftProgress() {
  try {
    if (typeof passengerManager === 'undefined') return;
    SaveSystem.saveGame({
      cash: passengerManager.dailyEarnings,
      currentLevel: missionManager?.level,
      xp: missionManager?.xp,
      highScore: missionManager?.highScore,
      lastDailyClaim: settlementManager?.lastDailyClaim
    });
  } catch (e) {}
}

function showBanner(msg) {
  const now = performance.now();
  if (window.__bannerT && now - window.__bannerT < 400) return; // rate limit
  window.__bannerT = now;
  const banner = document.getElementById('notification-banner');
  const text = document.getElementById('banner-text');
  if (!banner || !text) return;
  text.textContent = typeof msg === 'string' ? msg : (msg?.msg || '');
  banner.style.display = 'block';
  banner.style.opacity = '1';
  banner.style.transform = 'translateY(0)';
  clearTimeout(window.__bannerHide);
  window.__bannerHide = setTimeout(() => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-12px)';
  }, 2800);
}


function showFirstRunTips() {
  if (localStorage.getItem('kano_tips_seen')) return;
  localStorage.setItem('kano_tips_seen', '1');
  const tips = [
    'Hold ACCEL to skip intro & drive',
    'Slow near roadside people to pick up',
    'R = Radio · C = Garage · N = End shift',
    'Brake when passenger says Akwai!'
  ];
  let i = 0;
  const tick = () => {
    if (i >= tips.length) return;
    showBanner('💡 ' + tips[i]);
    i++;
    setTimeout(tick, 2800);
  };
  setTimeout(tick, 900);
}

// ---------- Bootstrap ----------
async function bootstrap() {
  // Playable ASAP – do not block Start Shift on every GLB
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.textContent = 'Start Shift';
  }
  /* no long loading */
  hideLoading();

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

  // Ground comes from InfiniteRoadSystem chunks (Kano dual road) – no desert plane

  camera.position.set(0, 5, -12);
  camera.lookAt(0, 1, 5);

  // Load keke model (timeout)
  // NO GLB on start page – yellow procedural keke only (instant)
  let kekeModel = null;
  

  
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.textContent = 'Start Shift';
  }
  hideLoading();

  // Systems
  const kekeController = new KekePhysicsController(kekeGroup);
  const signalLights = new KekeSignalLights(kekeGroup);
  const headlights = new KekeHeadlights(kekeGroup);
  if (kekeModel) kekeController.bindWheels(kekeModel);
  // Apply driver/keke bonuses
  const driver = charSelect.getDriver();
  const kekeDef = charSelect.getKeke();
  kekeController.maxSpeed = 26 * (kekeDef.speed || 1) * (driver.speedBonus || 1);

  const cameraRig = new KekeCameraRig(camera, kekeGroup);
  const flow = new GameFlowManager(scene, camera, kekeGroup, kekeController, cameraRig);

  const roadSystem = new InfiniteRoadSystem(scene, assetManager);
  roadSystem.init(); /* procedural */

  const landmarkManager = new KanoLandmarkManager(scene, assetManager);
  /* landmarks off at boot */

  const trafficManager = new DynamicTrafficManager(scene, kekeController, assetManager);
  if (isMobile) {
    trafficManager.maxVehicles = 5;
    renderer.setPixelRatio(1);
    camera.far = 150;
    camera.updateProjectionMatrix();
  } else {
    trafficManager.maxVehicles = 9;
  }
  trafficManager.init(); /* proxies only */

  const passengerManager = new PassengerManager(scene, kekeController, assetManager);
  passengerManager.dailyEarnings = saved.cash ?? 1500;
  passengerManager.capacity = kekeDef.capacity || 3;
  passengerManager.negotiationBonus = driver.negotiationBonus || 1;
  passengerManager.tipBonus = driver.tipBonus || 1;
  // passenger GLB deferred until after Start Shift
  const seatOccupancy = new KekeSeatOccupancy(kekeGroup, assetManager);
  seatOccupancy.init().catch(() => {});
  const dashHud = new DashHUD();
  const radar = new ProximityRadar();
  const fatigue = new DriverFatigueSystem(charSelect.getDriver());
  const achievements = new AchievementSystem();
  const tutorial = new FirstShiftTutorial();
  let shiftElapsed = 0;
  let shiftStartCash = 0;
  const roadsideLife = new KanoRoadsideLife(scene);
  try { roadsideLife.init(); } catch (e) { console.warn('roadside', e); }
  const missionManager = new MissionManager();
  missionManager.loadProgress(saved);
  const missionBoard = new MissionBoardUI(missionManager, charSelect);
  try { missionBoard.showPreview(); } catch (e) {}
  try { HighScoreBoard.renderOnMenu(); } catch (e) {}

  const collisionSystem = new KekeCollisionSystem(kekeGroup, kekeController, trafficManager, missionManager);
  const nearMiss = new NearMissSystem(kekeGroup, kekeController, trafficManager, missionManager);


  const fuelManager = new FuelManager(kekeController);
  const streetEvents = new StreetEventSystem(kekeController, passengerManager, fuelManager);
  const fuelStations = new FuelStationSystem(scene, fuelManager, passengerManager);
  try { fuelStations.init(); } catch (e) { console.warn('fuel stations', e); }
  const policeEngine = new PoliceCheckpointEngine(scene, kekeController, passengerManager);
  policeEngine.spawnCheckpoint(200);
  const audioEngine = new KanoAudioEngine();
  const voiceBank = new HausaVoiceBank(audioEngine);
  audioEngine.setup(camera, kekeGroup);
  audioEngine.enableOnInteraction();

  const pedestrianManager = new PedestrianManager(scene, kekeController, assetManager);
  // peds deferred until after Start Shift
  // Light exhaust + dust (mobile-safe counts)
  let particleSystem = { update() {} };
  if (!isMobile) {
    try {
      particleSystem = new KanoParticleSystem(scene, kekeGroup);
    } catch (e) {
      console.warn('particles', e);
    }
  }
  let weatherManager = { update() {}, currentWeather: 'CLEAR', forceWeather() {} };
  if (!isMobile) {
    try { weatherManager = new KanoWeatherManager(scene, kekeController, passengerManager); } catch (e) { console.warn('weather', e); }
  }
  const customizer = new KekeCustomizer(scene, kekeGroup);
  const prayerManager = new PrayerTimeManager({ stamina: 100, stressLevel: 0 });
  const settlementManager = new DailySettlementManager(passengerManager, fuelManager, kekeController, missionManager);
  settlementManager.loadDaily(saved);
  window.__kanoSettle = (result) => settlementManager.settle(result);
  const pauseMenu = new PauseMenu({
    onResume: () => { paused = false; if (flow.state === 'PAUSED') flow.setState('DRIVING'); },
    onEndShift: () => {
      paused = false;
      const result = missionManager.settleShift(passengerManager.dailyEarnings, fuelManager.fuel ?? 50);
      try {
        const unlocked = charSelect.syncUnlocksByLevel?.(result.level) || [];
        if (unlocked.length) showBanner('🔓 Unlocked: ' + unlocked.join(', '));
        charSelect.populateUI();
      } catch (e) {}
      try { achievements.onShiftEnd(result.score, false); } catch (e) {}
      try {
        HighScoreBoard.submit({
          score: result.score,
          cash: passengerManager.dailyEarnings,
          driver: charSelect.getDriver()?.name || 'RuffNeck',
          route: document.getElementById('route-name-display')?.textContent || 'Kano'
        });
      } catch (e) {}
      settlementManager.settle(result);
    },
    onCamera: () => {
      const mode = cameraRig.cycleMode?.() || 'chase';
      showBanner(`📷 Camera: ${mode.toUpperCase()}`);
    },
    onQuality: () => {
      window.__kanoLowQuality = !window.__kanoLowQuality;
      if (window.__kanoLowQuality) {
        renderer.setPixelRatio(1);
        camera.far = 160;
        trafficManager.maxVehicles = 4;
        showBanner('Quality: LOW (faster)');
      } else {
        renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.25 : 2));
        camera.far = 500;
        trafficManager.maxVehicles = 6;
        showBanner('Quality: HIGH');
      }
      camera.updateProjectionMatrix();
    },
    onGarage: () => {
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


  function _showContinueModal(missionManager, collisionSystem, kekeController) {
    if (document.getElementById('continue-modal')) return;
    const m = document.createElement('div');
    m.id = 'continue-modal';
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:160;display:flex;align-items:center;justify-content:center;padding:12px;';
    const lives = missionManager?.lives ?? 0;
    const continues = missionManager?.continues ?? 0;
    m.innerHTML = `
      <div style="background:#1a1a24;border:2px solid #ff5252;border-radius:16px;padding:22px;max-width:320px;width:100%;color:#fff;font-family:system-ui;text-align:center;">
        <div style="font-size:28px;">💥</div>
        <h2 style="color:#ff5252;margin:8px 0;">KEKE WRECKED</h2>
        <p style="color:#b0bec5;font-size:14px;line-height:1.5;">Engine down. Lives left: <b>${lives}</b><br/>Continues: <b>${continues}</b></p>
        <button id="btn-continue-pay" style="width:100%;margin:8px 0;padding:14px;border:none;border-radius:10px;font-weight:900;background:#ffcc00;color:#000;cursor:pointer;">CONTINUE — ₦1,500</button>
        <button id="btn-continue-end" style="width:100%;margin:4px 0;padding:12px;border:1px solid #666;border-radius:10px;font-weight:700;background:#333;color:#fff;cursor:pointer;">END SHIFT</button>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#btn-continue-pay')?.addEventListener('click', () => {
      if (window.__kanoBuyContinue?.()) {
        showBanner('🛠 Repaired — drive on!');
        paused = false;
        if (flow.state === 'PAUSED') flow.setState('DRIVING');
      }
    });
    m.querySelector('#btn-continue-end')?.addEventListener('click', () => {
      m.remove();
      try { window.__kanoEndShift?.(); } catch (e) {}
      // Fallback: reload menu
      try {
        paused = true;
        showBanner('Shift ended');
        location.reload();
      } catch (e) {}
    });
  }

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

  setupMobileControls(
    input,
    () => audioEngine.playHorn(),
    () => {
      const name = audioEngine.toggleRadio();
      const el = document.getElementById('radio-display');
      if (el) el.innerText = name;
      showBanner('📻 ' + name);
    }
  );

  // Sync cash from save / early claim (do not double-grant)
  passengerManager.dailyEarnings = Math.max(
    passengerManager.dailyEarnings,
    saved.cash ?? 0,
    window.__kanoCash || 0
  );
  window.__kanoDailyPending = 0;

  window.__kanoClaimDaily = () => {
    const btn = document.getElementById('daily-claim-btn');
    try {
      // If already claimed today, say so — but allow force once per session if save is stuck
      const r = settlementManager.claimDaily();
      if (r && r.ok) {
        showBanner('🎁 Daily reward +₦' + r.amount + '!');
        window.__kanoCash = passengerManager.dailyEarnings;
        const earn = document.getElementById('earnings');
        if (earn) earn.innerText = passengerManager.dailyEarnings;
        if (btn) {
          btn.textContent = 'CLAIMED +₦' + r.amount;
          btn.style.background = '#2e7d32';
          btn.style.color = '#fff';
        }
        let chip = document.getElementById('menu-cash-chip');
        if (!chip) {
          chip = document.createElement('div');
          chip.id = 'menu-cash-chip';
          chip.style.cssText = 'color:#4caf50;font-weight:900;font-size:16px;margin:8px;text-align:center;';
          document.querySelector('.menu-buttons')?.prepend(chip);
        }
        chip.textContent = 'CASH ₦' + passengerManager.dailyEarnings;
        SaveSystem.saveGame({
          cash: passengerManager.dailyEarnings,
          lastDailyClaim: settlementManager.lastDailyClaim,
          currentLevel: missionManager.level,
          highScore: missionManager.highScore
        });
      } else {
        showBanner('Daily already claimed today — come back tomorrow.');
        if (btn) btn.textContent = 'ALREADY CLAIMED';
      }
    } catch (e) {
      console.warn(e);
      passengerManager.dailyEarnings += 1200;
      showBanner('🎁 Daily reward +₦1200');
      if (btn) {
        btn.textContent = 'CLAIMED +₦1200';
        btn.style.background = '#2e7d32';
      }
    }
  };
  // Ensure HTML button is bound even if early bind missed
  (function() {
    const b = document.getElementById('daily-claim-btn');
    if (b && b.dataset.bound !== '1') {
      b.dataset.bound = '1';
      const h = (e) => { e.preventDefault(); e.stopPropagation(); window.__kanoClaimDaily(); };
      b.addEventListener('click', h);
      b.addEventListener('touchend', h, { passive: false });
    }
  })();

  const mobileEl = document.getElementById('mobile-controls-overlay');
  if (mobileEl) mobileEl.style.display = 'none';

  window.__kanoTogglePause = () => {
    if (pauseMenu.isOpen()) {
      pauseMenu.hide();
      paused = false;
      if (flow.state === 'PAUSED') flow.setState('DRIVING');
      const mc = document.getElementById('mobile-controls-overlay');
      if (mc) mc.style.display = 'block';
      showBanner('▶ Resumed');
    } else if (gameStarted) {
      paused = true;
      if (flow.state === 'DRIVING') flow.setState('PAUSED');
      try { saveShiftProgress(); } catch (e) {}
      const mc = document.getElementById('mobile-controls-overlay');
      if (mc) mc.style.display = 'none';
      pauseMenu.show();
    }
  };

  // Input
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyH' || e.code === 'Space') {
      isHornActive = true;
      audioEngine.playHorn();
    }
    if (e.code === 'KeyR') {
      /* radio removed */
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (pauseMenu.isOpen()) {
        pauseMenu.hide();
        paused = false;
        if (flow.state === 'PAUSED') flow.setState('DRIVING');
        const mc = document.getElementById('mobile-controls-overlay');
        if (mc) mc.style.display = 'block';
        showBanner('▶ Resumed');
      } else if (gameStarted) {
        paused = true;
        if (flow.state === 'DRIVING') flow.setState('PAUSED');
        try { saveShiftProgress(); } catch (e) {}
        const mc = document.getElementById('mobile-controls-overlay');
        if (mc) mc.style.display = 'none';
        pauseMenu.show();
      }
    }
    if (e.code === 'KeyV') {
      const mode = cameraRig.cycleMode?.() || 'chase';
      showBanner(`📷 Camera: ${mode.toUpperCase()}`);
    }
    if (e.code === 'KeyY') {
      const order = ['CLEAR', 'HEAVY_RAIN', 'HARMATTAN_HAZE'];
      const cur = weatherManager.currentWeather || 'CLEAR';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      try { weatherManager.forceWeather?.(next); } catch (err) {}
      showBanner('🌤 Weather: ' + next.replace('_', ' '));
    }
    if (e.code === 'KeyT') {
      window.timeInMinutes = (window.timeInMinutes + 60) % 1440;
      const hours = Math.floor(window.timeInMinutes / 60);
      const mins = Math.floor(window.timeInMinutes % 60);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = ((hours + 11) % 12) + 1;
      showBanner(`⏭ Time ${h12}:${mins.toString().padStart(2,'0')} ${ampm}`);
      const clock = document.getElementById('clock-display');
      if (clock) clock.textContent = `${h12}:${mins.toString().padStart(2,'0')} ${ampm}`;
    }
    if (e.code === 'KeyL') {
      const m = headlights.toggle();
      const label = m === null ? 'AUTO' : m ? 'ON' : 'OFF';
      showBanner(`💡 Headlights: ${label}`);
    }
    if (e.code === 'KeyE') {
      passengerManager.acceptDeal((ev) => showBanner(ev));
    }
    if (e.code === 'KeyN') {
      // End shift / settle
      const result = missionManager.settleShift(passengerManager.dailyEarnings, fuelManager.fuel ?? 50);
      try {
        const unlocked = charSelect.syncUnlocksByLevel?.(result.level) || [];
        if (unlocked.length) showBanner('🔓 Unlocked: ' + unlocked.join(', '));
        charSelect.populateUI();
      } catch (e) {}
      try { achievements.onShiftEnd(result.score, false); } catch (e) {}
      try {
        HighScoreBoard.submit({
          score: result.score,
          cash: passengerManager.dailyEarnings,
          driver: charSelect.getDriver()?.name || 'RuffNeck',
          route: document.getElementById('route-name-display')?.textContent || 'Kano'
        });
        HighScoreBoard.renderOnMenu();
      } catch (e) {}
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
    if (window.__kanoStarting) return;
    if (gameStarted && flow?.state === 'DRIVING') return;
    window.__kanoStarting = true;
    setTimeout(() => { window.__kanoStarting = false; }, 1500);
    // Re-read selection
    const ds = document.getElementById('driver-select');
    const ks = document.getElementById('keke-select');
    if (ds) charSelect.selectDriver(ds.value);
    if (ks) charSelect.selectKeke(ks.value);
    const d = charSelect.getDriver();
    const k = charSelect.getKeke();
    kekeController.maxSpeed = 26 * (k.speed || 1) * (d.speedBonus || 1);
    passengerManager.capacity = k.capacity || 3;
    passengerManager.negotiationBonus = d.negotiationBonus || 1;
    passengerManager.tipBonus = d.tipBonus || 1;

    gameStarted = true;
    // Start on right carriageway (Kano dual-road photo)
    try {
      kekeGroup.position.x = 3.8;
      kekeGroup.position.z = 0;
      kekeGroup.rotation.set(0, 0, 0);
    } catch (e) {}
    const menu = document.getElementById('main-menu-overlay');
    if (menu) menu.style.display = 'none';
    if (mobileEl) mobileEl.style.display = 'block';
    // Legacy HUD off – DashHUD is the single source of truth
    ['top-left-hud', 'top-right-hud'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const routeSel = document.getElementById('route-select');
    const routeName = document.getElementById('route-name-display');
    if (routeSel && routeName) {
      const route = KANO_ROUTES.find((r) => String(r.id) === String(routeSel.value)) || KANO_ROUTES[0];
      if (route) routeName.textContent = route.name.split('➔')[0].trim();
    }
    // Road mode
    const roadModeSel = document.getElementById('road-mode-select');
    const roadMode = roadModeSel?.value === 'single' ? 'single' : 'dual';
    window.__kanoRoadMode = roadMode;
    try {
      roadSystem.setRoadMode?.(roadMode);
      // Rebuild chunks for new mode
      roadSystem.chunks.forEach((ch) => {
        try { scene.remove(ch); } catch (e) {}
      });
      roadSystem.chunks = [];
      for (let i = 0; i < roadSystem.visibleChunks; i++) {
        const chunk = roadSystem._createChunk(i * roadSystem.chunkLength);
        scene.add(chunk);
        roadSystem.chunks.push(chunk);
        roadSystem._applyRoadTile?.(chunk);
      }
      if (roadMode === 'single') {
        kekeGroup.position.x = 0;
        kekeController.roadLimit = 5.2;
        trafficManager.maxVehicles = Math.min(trafficManager.maxVehicles || 6, isMobile ? 3 : 5);
      } else {
        kekeGroup.position.x = 3.8;
        kekeController.roadLimit = 8.5;
      }
    } catch (e) { console.warn('road mode', e); }

    // Naija Challenge – Hausa / Yoruba / Igbo
    const modeSel = document.getElementById('game-mode-select');
    window.__kanoGameMode = modeSel?.value || 'career';
    const naijaModes = {
      naija_hausa: { label: 'Hausa', greeting: 'Sannu! Challenge na Arewa', mult: 2, time: 180 },
      naija_yoruba: { label: 'Yoruba', greeting: 'E ku aaro! Challenge ti Iwoorun', mult: 2.2, time: 150 },
      naija_igbo: { label: 'Igbo', greeting: 'Ndewo! Challenge nke Owuwa Anyanwu', mult: 2.5, time: 120 },
      race: { label: 'Race', greeting: 'KEKE RACE — beat the NAPEP pack!', mult: 3, time: 120, race: true }
    };
    const naija = naijaModes[window.__kanoGameMode];
    if (naija) {
      trafficManager.maxVehicles = isMobile ? 6 : 10;
      missionManager.lives = 2;
      window.__kanoNaijaMult = naija.mult;
      window.__kanoNaijaTime = naija.time;
      window.__kanoNaijaActive = true;
      window.__kanoNaijaLang = naija.label;
      showBanner('🇳🇬 NAIJA · ' + naija.label.toUpperCase() + ' — ' + naija.greeting);
      setTimeout(() => showBanner(naija.mult + '× score · 2 lives · ' + Math.floor(naija.time / 60) + ' min'), 1800);
      if (naija.race) {
        try {
          trafficManager.maxVehicles = isMobile ? 5 : 7;
          trafficManager.startRace?.(6);
          showBanner('🏁 RACE: pass rival kekes — first to distance wins');
        } catch (e) {}
      }

    } else {
      window.__kanoNaijaMult = 1;
      window.__kanoNaijaActive = false;
      window.__kanoNaijaLang = null;
    }
    const earn = document.getElementById('earnings');
    if (earn) earn.innerText = passengerManager.dailyEarnings;

    showBanner(`${d.name} · ${k.name}`);
    const goals = missionManager.startShift('Kano');
    showBanner('Mission: ' + goals.map(g => g.label).join(' · '));
    _updateMissionHud(missionManager);
    try { missionBoard.hide(); } catch (e) {}
    dashHud.show();
    radar.show();
    // Tutorial optional
    const tutSel = document.getElementById('tutorial-select');
    if (tutSel && tutSel.value === 'on') {
      try {
        localStorage.setItem('kano_tutorial_opt_in', '1');
        localStorage.removeItem('kano_tutorial_v1');
        tutorial.start();
      } catch (e) {}
    }
    shiftElapsed = 0;
    shiftStartCash = passengerManager.dailyEarnings;
    // People stay procedural – no GLB download
    // hide old mission floating hud overlap
    const oldM = document.getElementById('mission-hud');
    if (oldM) oldM.style.display = 'none';
    // Skip fragile intro on mobile – go straight to driving
    try {
      flow.state = 'DRIVING';
      flow.engineStarted = true;
      try {
        cameraRig.setMode('chase');
        cameraRig._snapToTarget?.(); // follows keke wherever it is
      } catch (e) {
        // do not hard-reset camera to origin – snapToTarget handles it
        camera.lookAt(0, 1.2, 6.5);
      }
    } catch (e) {}
    showBanner('🚗 Drive! Hold ACCEL');
    if (!localStorage.getItem('kano_drive_tips')) {
      localStorage.setItem('kano_drive_tips', '1');
      setTimeout(() => showBanner('◀ ▶ steer · ACCEL gas · BRAKE stop/reverse'), 2200);
      setTimeout(() => showBanner('Slow near people to pick up · RADIO for stations'), 5000);
    }
    try { audioEngine.playOneShot(120, 0.3, 'sawtooth', 0.08); } catch (e) {}
  };

  document.getElementById('start-game-btn')?.addEventListener('click', () => {
    if (window.__kanoStartShift) window.__kanoStartShift();
  });
  // Flush queued start from early click
  if (window.__kanoStartQueued) {
    window.__kanoStartQueued = false;
    try { window.__kanoStartShift(); } catch (e) { console.warn(e); }
  }

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
  showFirstRunTips();

  // Hide HUDs until start
  ['top-left-hud', 'top-right-hud'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  let timeAccum = 0;
  let atmosAccum = 0;
  let hudAccum = 0;

  
  // Pause systems when phone locks or tab hides – prevents freeze on return
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.__kanoWasPaused = paused;
      paused = true;
      try { saveShiftProgress(); } catch (e) {}
      try { audioEngine.engineGain && (audioEngine.engineGain.gain.value = 0); } catch (e) {}
    } else {
      paused = window.__kanoWasPaused || false;
      try { clock.getDelta(); } catch (e) {} // dump long delta
    }
  });

function animate() {
    requestAnimationFrame(animate);
    const frameStart = performance.now();
    const delta = Math.min(clock.getDelta(), 0.05);
    // Adaptive: if last frame was heavy, skip secondary systems this frame
    const adaptiveSkip = (window.__lastFrameMs || 0) > 28;

    if (!gameStarted) {
      // Static menu view – skip most frames to save battery/CPU
      window.__menuFrame = (window.__menuFrame || 0) + 1;
      if (window.__menuFrame % 2 === 0) {
        camera.position.set(8, 5, 12);
        camera.lookAt(0, 1, 0);
        try { renderer.render(scene, camera); } catch (e) {}
      }
      return;
    }

    if (paused || flow.state === 'PAUSED') {
      if (typeof isMobile !== 'undefined' && isMobile) renderer.render(scene, camera); else { try { composer.render(); } catch (e) { renderer.render(scene, camera); } }
      return;
    }

    try {
      // Intro / flow
      flow.update(delta, showBanner);
      // Skip intro if player hits gas
      if (!flow.isDriving() && flow.state !== 'MENU' && flow.state !== 'PAUSED') {
        if ((input.throttle || 0) > 0.5 || keys['KeyW'] || keys['ArrowUp']) {
          flow.skipIntro?.(showBanner);
        }
      }

      // ALWAYS accept drive input once shift started (not paused)
      const canDrive = gameStarted && !paused && flow.state !== 'PAUSED';
      if (canDrive && flow.state !== 'DRIVING') {
        flow.state = 'DRIVING';
        flow.engineStarted = true;
      }

      let throttle = 0;
      let steer = 0;
      isHornActive = !!(input.horn);
      if (canDrive) {
        throttle = Number(input.throttle) || 0;
        steer = Number(input.steering) || 0;
        if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
        if (keys['KeyS'] || keys['ArrowDown']) throttle = -1;
        if (keys['KeyA'] || keys['ArrowLeft']) steer = -1;
        if (keys['KeyD'] || keys['ArrowRight']) steer = 1;

        // Always keep a real top speed while driving
        if (!kekeController.maxSpeed || kekeController.maxSpeed < 12) {
          kekeController.maxSpeed = 26;
        }

        kekeController.setInput(throttle, steer);
        kekeController.update(delta);
        cameraRig.update(delta, kekeController.currentSpeed);
        try { particleSystem.update(delta, kekeController.currentSpeed); } catch (e) {}
        try {
          tutorial.onSpeed(kekeController.currentSpeed);
          tutorial.onSteer(steer);
        } catch (e) {}
        // LIVE speed every frame (DashHUD + legacy)
        const kmh = Math.round(kekeController.currentSpeed * 3.6);
        const spdEl = document.getElementById('speed-display');
        if (spdEl) spdEl.innerText = String(kmh);
        const dashSpd = document.getElementById('dash-speed');
        if (dashSpd) dashSpd.textContent = String(kmh);
        try {
          let notice = passengerManager.getHudStatus?.() || null;
          if (window.__kanoNaijaActive && window.__kanoNaijaTime != null) {
            window.__kanoNaijaTime -= delta;
            const left = Math.max(0, Math.ceil(window.__kanoNaijaTime));
            const mm = Math.floor(left / 60);
            const ss = String(left % 60).padStart(2, '0');
            notice = `🇳🇬 ${window.__kanoNaijaLang || 'NAIJA'} ${mm}:${ss} · ${window.__kanoNaijaMult || 2}×`;
            if (window.__kanoGameMode === 'race') {
              const place = trafficManager.getRacePlace?.() || window.__kanoRacePlace || '?';
              notice = `🏁 RACE P${place} · ${mm}:${ss}`;
            }
            if (window.__kanoNaijaTime <= 0) {
              window.__kanoNaijaActive = false;
              showBanner('🇳🇬 Naija Challenge complete! Score locked.');
              try { window.__kanoEndShift?.(); } catch (e) {}
            }
          }
          dashHud.update({
            speed: kekeController.currentSpeed * 3.6,
            cash: passengerManager.dailyEarnings,
            fuel: fuelManager.fuel ?? 100,
            seatsUsed: passengerManager.onBoard.length,
            seatsMax: passengerManager.capacity,
            lives: missionManager.lives,
            route: document.getElementById('route-name-display')?.textContent || 'Kano',
            missionsText: missionManager.getHudText() + '\nStamina ' + fatigue.getPercent() + '%',
            weather: weatherManager.currentWeather || 'CLEAR',
            shiftTime: shiftElapsed,
            startCash: shiftStartCash,
            notice
          });
        } catch (e) {}
      }

      // Core world – always
      roadSystem.update(kekeGroup.position.z);
      try { roadsideLife.update(kekeGroup.position.z); } catch (e) {}
      trafficManager.update(delta, isHornActive);

      // Secondary – skip when last frame was slow
      if (!adaptiveSkip) {
        if ((window.__sysFrame = (window.__sysFrame || 0) + 1) % 2 === 0) {
          pedestrianManager.update(delta * 2);
        }
        landmarkManager.update(kekeGroup.position.z, (msg) => {
          missionManager.xp = (missionManager.xp || 0) + 15;
          try { achievements.onLandmark(); } catch (e) {}
          missionManager.score = (missionManager.score || 0) + 50;
          showBanner(String(msg) + ' · +15 XP');
        });
        weatherManager.update(delta, kekeGroup.position, showBanner);
        atmosAccum += delta;
        if (atmosAccum > 0.5) {
          atmosAccum = 0;
          updateAtmosphereByTime(scene, renderer, window.timeInMinutes, roadSystem);
        }
      }

      if (canDrive) {
        passengerManager.update(delta, (ev) => {
          showBanner(ev);
          seatOccupancy.sync(passengerManager.onBoard.length);
          const earn = document.getElementById('earnings');
          if (earn && ev.earnings != null) earn.innerText = ev.earnings;
          if (ev.type === 'NEGOTIATE') {
            try { voiceBank.speak('negotiate'); } catch (e) {}
          }
          if (ev.type === 'AKWAI') {
            try { voiceBank.speak('drop'); } catch (e) {}
          }
          if (ev.type === 'BOARD') {
            audioEngine.playOneShot(520, 0.12, 'sine', 0.1);
            try { voiceBank.speak('board'); } catch (e) {}
            try { tutorial.onBoard(); } catch (e) {}
          }
          if (ev.type === 'DROPOFF') {
            try { tutorial.onDrop(); } catch (e) {}
            audioEngine.playOneShot(660, 0.15, 'triangle', 0.12);
            try { voiceBank.speak('drop'); } catch (e) {}
            const fareMatch = String(ev.msg || '').match(/₦(\d+)/);
            const fare = fareMatch ? parseInt(fareMatch[1], 10) : 200;
            missionManager.onDropoff(Math.round(fare * (window.__kanoNaijaMult || 1)));
            try { achievements.onDropoff(missionManager.combo, passengerManager.dailyEarnings); } catch (e) {}
            if (missionManager.combo >= 2) {
              showBanner(`🔥 Combo x${missionManager.combo}!`);
              try { audioEngine.playOneShot(520 + missionManager.combo * 40, 0.12, 'square', 0.08); } catch (e) {}
            }
            _updateMissionHud(missionManager);
            // Proximity radar targets
        const radarTargets = [];
        try {
          passengerManager.waiting?.forEach((p) => {
            if (p.mesh) radarTargets.push({ x: p.mesh.position.x, z: p.mesh.position.z, type: 'passenger' });
          });
          fuelStations.stations?.forEach((s) => {
            radarTargets.push({ x: s.mesh.position.x, z: s.z, type: 'fuel' });
          });
        } catch (e) {}
        radar.update(
          { x: kekeGroup.position.x, z: kekeGroup.position.z, rotY: kekeGroup.rotation.y },
          radarTargets
        );
        const fuelBar = document.getElementById('fuel-bar');
        if (fuelBar) {
          const lvl = Math.max(0, Math.min(100, fuelManager.fuel ?? 100));
          fuelBar.style.width = lvl + '%';
          fuelBar.style.background = lvl < 20 ? '#f44336' : lvl < 45 ? '#ff9800' : '#4CAF50';
        }
        dashHud.update({
              speed: kekeController.currentSpeed * 3.6,
              cash: passengerManager.dailyEarnings,
              fuel: fuelManager.fuel ?? 100,
              seatsUsed: passengerManager.onBoard.length,
              seatsMax: passengerManager.capacity,
              lives: missionManager.lives,
              missionsText: missionManager.getHudText() + '\nStamina ' + fatigue.getPercent() + '%',
          weather: weatherManager.currentWeather || 'CLEAR',
          shiftTime: shiftElapsed,
          startCash: shiftStartCash,
          notice: (typeof fare !== 'undefined' && fare) ? `+₦${fare}` : (passengerManager.getHudStatus?.() || null)
            });
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
          if (ev.type === 'KAROTA_CLEAR' || (ev.msg && ev.msg.includes('wuce'))) {
            try { voiceBank.speak('karota'); } catch (e) {}
          }
          if (ev.type === 'KAROTA_CHASE' || (ev.msg && ev.msg.includes('chase'))) {
            try { voiceBank.speak('karota'); } catch (e) {}
            try { audioEngine.playOneShot(880, 0.15, 'square', 0.08); } catch (e) {}
            setTimeout(() => { try { audioEngine.playOneShot(660, 0.2, 'square', 0.07); } catch (e) {} }, 180);
          }
          if (ev.type === 'KAROTA_CLEAR' || (ev.msg && (ev.msg.includes('waved') || ev.msg.includes('wuce')))) {
            missionManager.onCheckpointClear(true);
            try { achievements.onKarotaClear(); } catch (e) {}
          }
          _updateMissionHud(missionManager);
        });
        nearMiss.update(delta, (ev) => {
          showBanner(ev);
          try { audioEngine.playOneShot(660, 0.08, 'sine', 0.06); } catch (e) {}
        });
        collisionSystem.update(delta, (ev) => {
          showBanner(ev);
          if (ev.type === 'CRASH') {
            // One-shot shake only on crash event – NOT every frame
            try { cameraRig.setShake?.(ev.shake || 0.55); } catch (e) {}
            try { voiceBank.speak('crash'); } catch (e) {}
            try { audioEngine.playOneShot(140, 0.25, 'sawtooth', 0.1); } catch (e) {}
            try { audioEngine.playOneShot(90, 0.2, 'sawtooth', 0.1); } catch (e) {}
          }
          _updateMissionHud(missionManager);
          if (ev.type === 'WRECKED') _showContinueModal(missionManager, collisionSystem, kekeController);
        });
        fuelStations.update(delta, kekeGroup.position, kekeController.currentSpeed, (ev) => {
          showBanner(ev);
          if (ev.type === 'REFUEL') { try { achievements.onRefuel(); } catch (e) {} try { tutorial.onRefuel(); } catch (e) {} }
          if (ev.earnings != null) {
            const earn = document.getElementById('earnings');
            if (earn) earn.innerText = ev.earnings;
          }
          const bar = document.getElementById('fuel-bar');
          if (bar) bar.style.width = `${Math.round(fuelManager.fuel)}%`;
        });
        fuelManager.update(delta, (e) => {
          if (e.type === 'FUEL_UPDATE') {
            const bar = document.getElementById('fuel-bar');
            if (bar) bar.style.width = `${e.level}%`;
          }
          if (e.type === 'OUT_OF_FUEL') showBanner(e.msg);
        });
        prayerManager.update(window.timeInMinutes, (e) => {
          if (e?.msg) {
            showBanner(e.msg);
            try {
          if (ev.type === 'KAROTA_CLEAR' || (ev.msg && ev.msg.includes('wuce'))) {
            try { voiceBank.speak('karota'); } catch (e) {}
          }
          if (ev.type === 'KAROTA_CHASE' || (ev.msg && ev.msg.includes('chase'))) {
            try { voiceBank.speak('karota'); } catch (e) {}
            try { audioEngine.playOneShot(880, 0.15, 'square', 0.08); } catch (e) {}
            setTimeout(() => { try { audioEngine.playOneShot(660, 0.2, 'square', 0.07); } catch (e) {} }, 180);
          } } catch (err) {}
            try { setPrayerAmbient(scene, true); } catch (err) {}
            try { audioEngine.playOneShot(220, 0.4, 'sine', 0.06); } catch (err) {}
          }
        });
        // Prayer: banner only – do NOT cap maxSpeed (was killing acceleration)
        audioEngine.updateEngine(kekeController.currentSpeed, kekeController.maxSpeed);
        try { headlights.update(window.timeInMinutes); } catch (e) {}
        shiftElapsed += delta;
        let nearFuel = false;
        try {
          nearFuel = fuelStations.stations?.some((s) => s.mesh.position.distanceTo(kekeGroup.position) < 12);
        } catch (e) {}
        fatigue.update(delta, kekeController.currentSpeed, (ev) => showBanner(ev), nearFuel);
        streetEvents.update(delta, (ev) => {
          showBanner(ev);
          if (ev.earnings != null) {
            const earn = document.getElementById('earnings');
            if (earn) earn.innerText = ev.earnings;
          }
        });
        // Fatigue: mild only – never below 22 top speed while driving
        try {
          const fatMul = fatigue.getSpeedMul();
          if (fatMul < 1) kekeController.maxSpeed = Math.max(18, 26 * fatMul);
        } catch (e) {}

        // Clock
        timeAccum += delta;
        // Slow day/night (~1 game hour ≈ 3 real minutes)
        if (timeAccum > 0.5) {
          window.timeInMinutes = (window.timeInMinutes + 0.4) % 1440;
          try { achievements.onNight(window.timeInMinutes); } catch (e) {}
          timeAccum = 0;
          const hours = Math.floor(window.timeInMinutes / 60);
          const mins = Math.floor(window.timeInMinutes % 60);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const h12 = hours % 12 || 12;
          const clockEl = document.getElementById('clock-display');
          if (clockEl) clockEl.textContent = `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`;
        }

        const speedDisplay = document.getElementById('speed-display');
        if (speedDisplay) speedDisplay.innerText = Math.round(kekeController.currentSpeed * 3.6);
        // Proximity radar targets
        const radarTargets = [];
        try {
          passengerManager.waiting?.forEach((p) => {
            if (p.mesh) radarTargets.push({ x: p.mesh.position.x, z: p.mesh.position.z, type: 'passenger' });
          });
          fuelStations.stations?.forEach((s) => {
            radarTargets.push({ x: s.mesh.position.x, z: s.z, type: 'fuel' });
          });
        } catch (e) {}
        radar.update(
          { x: kekeGroup.position.x, z: kekeGroup.position.z, rotY: kekeGroup.rotation.y },
          radarTargets
        );
        const fuelBar = document.getElementById('fuel-bar');
        if (fuelBar) {
          const lvl = Math.max(0, Math.min(100, fuelManager.fuel ?? 100));
          fuelBar.style.width = lvl + '%';
          fuelBar.style.background = lvl < 20 ? '#f44336' : lvl < 45 ? '#ff9800' : '#4CAF50';
        }
        dashHud.update({
          speed: kekeController.currentSpeed * 3.6,
          cash: passengerManager.dailyEarnings,
          fuel: fuelManager.fuel ?? 100,
          seatsUsed: passengerManager.onBoard.length,
          seatsMax: passengerManager.capacity,
          lives: missionManager.lives,
          route: document.getElementById('route-name-display')?.textContent || 'Kano',
          missionsText: missionManager.getHudText() + '\nStamina ' + fatigue.getPercent() + '%',
          weather: weatherManager.currentWeather || 'CLEAR',
          shiftTime: shiftElapsed,
          startCash: shiftStartCash,
          notice: passengerManager.getHudStatus?.() || null
        });
      }
    } catch (err) {
      console.warn('frame', err);
    }

    if (typeof isMobile !== 'undefined' && isMobile) renderer.render(scene, camera); else { try { composer.render(); } catch (e) { renderer.render(scene, camera); } }
    window.__lastFrameMs = performance.now() - frameStart;
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
