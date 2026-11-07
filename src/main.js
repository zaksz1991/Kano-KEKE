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
document.title = 'KANO KEKE';

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
try {
  const _mobFog = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
  scene.fog = new THREE.Fog(0x87b5d9, _mobFog ? 60 : 90, _mobFog ? 160 : 240);
} catch (e) {}

// Baseline lights so GLBs are never pure black
try {
  const hemi = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.15);
  sun.position.set(30, 50, 20);
  scene.add(sun);
} catch (e) {}

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
renderer.toneMappingExposure = 1.85;
try { setupKanoAtmosphere(scene, renderer); } catch (e) { console.warn('atmosphere', e); }
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || window.innerWidth < 900;
let composer = { render: () => renderer.render(scene, camera), setSize: (w,h) => renderer.setSize(w,h) };
if (!isMobile) {
  try { composer = setupPostProcessing(renderer, scene, camera); } catch (e) { console.warn('composer', e); }
}
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
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.textContent = 'Start Shift';
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
window.__kanoSavings = 0;
window.__kanoStreak = 0;

try {
  const sv = JSON.parse(localStorage.getItem('kano_run_save_v2') || '{}');
  window.__kanoSavings = sv.savings || 0;
} catch (e) {}


window.__kanoStartShift = null;
window.__kanoStartQueued = false;
function __tryStartShift() {
  try { hideLoading(); } catch (e) {}
  if (typeof window.__kanoStartShift === 'function') {
    try {
      window.__kanoStartShift();
      return true;
    } catch (err) {
      console.error('start', err);
      showBanner('Start error — ' + (err && err.message ? err.message : 'retry'));
      return true; // don't keep polling forever
    }
  }
  return false;
}
document.getElementById('start-game-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const btn = document.getElementById('start-game-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Start Shift'; }
  if (__tryStartShift()) return;
  window.__kanoStartQueued = true;
  showBanner('Starting…');
  let n = 0;
  const id = setInterval(() => {
    n++;
    if (__tryStartShift()) {
      clearInterval(id);
      window.__kanoStartQueued = false;
      return;
    }
    if (n >= 60) {
      clearInterval(id);
      showBanner('Still loading — tap Start Shift again');
      if (btn) { btn.disabled = false; btn.textContent = 'Start Shift'; }
    }
  }, 100);
});


// ---------- Title credit ----------
  (function brandAishat() {
    if (document.getElementById('kano-title-credit')) return;
    const el = document.createElement('div');
    el.id = 'kano-title-credit';
    el.style.cssText =
      'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:120;pointer-events:none;' +
      'font:800 11px/1.2 system-ui,sans-serif;letter-spacing:2px;color:#ffcc00;' +
      'text-shadow:0 0 8px rgba(0,0,0,0.9),0 1px 2px #000;background:rgba(0,0,0,0.45);' +
      'padding:4px 12px;border-radius:999px;border:1px solid rgba(255,204,0,0.5);';
    el.textContent = 'KANO KEKE';
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
  try {
  const routeSelect = document.getElementById('route-select');
  if (routeSelect && KANO_ROUTES && KANO_ROUTES.length) {
    const level = (() => {
      try {
        return JSON.parse(localStorage.getItem('kano_run_save_v2') || '{}').currentLevel || 1;
      } catch (e) {
        return 1;
      }
    })();
    // Keep HTML fallback routes if JS routes fail; only rebuild when we have data
    const prev = routeSelect.value;
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
    if (prev) routeSelect.value = prev;
  }
  try { charSelect.populateUI(); } catch (e) { console.warn('charSelect', e); }
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
      try { charSelect.populateUI(); } catch (e) {}
    }
  }
  } catch (e) { console.warn('wireMenu', e); }
})();

// Loading
function showLoading(msg, pct = 0) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.style.cssText = 'position:fixed;inset:0;background:#0a0a0f;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffcc00;font-family:system-ui,sans-serif;';
    el.innerHTML = `<div style="font-size:11px;letter-spacing:3px;color:#ffcc00;font-weight:800;margin-bottom:6px;">KANO KEKE</div>
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
  let signalLights = { update() {} };
  let headlights = { update() {} };
  try { signalLights = new KekeSignalLights(kekeGroup); } catch (e) {}
  try { headlights = new KekeHeadlights(kekeGroup); } catch (e) {}
  if (kekeModel) try { kekeController.bindWheels(kekeModel); } catch (e) {}
  // Apply driver/keke bonuses
  const driver = charSelect.getDriver();
  const kekeDef = charSelect.getKeke();
  kekeController.maxSpeed = 36 * (kekeDef.speed || 1) * (driver.speedBonus || 1);

  const cameraRig = new KekeCameraRig(camera, kekeGroup);
  const flow = new GameFlowManager(scene, camera, kekeGroup, kekeController, cameraRig);

  // PRE-ROAD start: earliest possible playable start
  window.__kanoStartShift = function earlyStartShift() {
    try {
      window.__kanoReady = true;
      hideLoading();
      gameStarted = true;
      window.__kanoDistBonus = 0;
      try {
        if (typeof missionManager !== 'undefined' && missionManager) {
          missionManager.lives = Math.max(3, missionManager.lives || 3);
        }
        if (typeof collisionSystem !== 'undefined' && collisionSystem?.repair) collisionSystem.repair();
      } catch (e) {}
      try {
        kekeGroup.position.set(3.8, 0, 0);
        kekeController.velocity = 0;
        kekeController.maxSpeed = 36;
      } catch (e) {}
      const menu = document.getElementById('main-menu-overlay');
      if (menu) menu.style.display = 'none';
      const mc = document.getElementById('mobile-controls-overlay');
      if (mc) mc.style.display = 'block';
      try {
        flow.state = 'DRIVING';
        flow.engineStarted = true;
        cameraRig.setMode?.('chase');
        cameraRig._snapToTarget?.();
      } catch (e) {
        camera.position.set(3.8, 4.2, -11.5);
        camera.lookAt(3.8, 1, 10);
      }
      
      try { window.__kanoApplyModels?.(); } catch (e) {}

      
      try {
        if (typeof missionManager !== 'undefined' && missionManager?.startShift) {
          const goals = missionManager.startShift('Kano');
          if (goals?.length) showBanner('Mission: ' + goals.map(g => g.label).join(' · '));
        }
      } catch (e) {}

      try {
        const rs = document.getElementById('route-select');
        const rn = document.getElementById('route-name-display');
        if (rs && rn && rs.options[rs.selectedIndex]) {
          rn.textContent = rs.options[rs.selectedIndex].text.split('·')[0].trim().slice(0, 28);
        }
      } catch (e) {}
      showBanner('🚗 Drive! Hold ACCEL');
      window.__kanoStartQueued = false;
    } catch (err) {
      console.error(err);
      showBanner('Start error');
    }
  };
  if (window.__kanoStartQueued) {
    window.__kanoStartQueued = false;
    try { window.__kanoStartShift(); } catch (e) {}
  }

  // Earliest game loop (before traffic/passengers)
  if (!window.__kanoBootLoop) {
    window.__kanoBootLoop = true;
    window.__kanoBootClock = new THREE.Clock();
    const bootLoop = () => {
      requestAnimationFrame(bootLoop);
      if (typeof window.__kanoFullFrame === 'function') {
        try { window.__kanoFullFrame(); } catch (e) {}
        return;
      }
      const delta = Math.min(window.__kanoBootClock.getDelta(), 0.05);
      if (!gameStarted) return;
      try {
        let throttle = Number(input.throttle) || 0;
        let steer = Number(input.steering) || 0;
        if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
        if (keys['KeyS'] || keys['ArrowDown']) throttle = -1;
        if (keys['KeyA'] || keys['ArrowLeft']) steer = -1;
        if (keys['KeyD'] || keys['ArrowRight']) steer = 1;
        kekeController.setInput(throttle, steer);
        kekeController.update(delta);
        cameraRig.update(delta, kekeController.currentSpeed);
        try { roadSystem?.update?.(kekeGroup.position.z); } catch (e) {}
        try { trafficManager?.update?.(delta, false); } catch (e) {}
        renderer.render(scene, camera);
      } catch (e) {}
    };
    bootLoop();
  }

  const roadSystem = new InfiniteRoadSystem(scene, assetManager);
  try { roadSystem.init(); } catch (e) { console.warn('road', e); }

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

  // Preload in background so first Start is faster
  setTimeout(() => { try { window.__kanoApplyModels?.(); } catch (e) {} }, 2500);
  window.__kanoApplyModels = async function applyModels() {
    window.__kanoModelsLoading = true;

    try {
      assetManager.enableNetwork?.();
      showBanner('Loading 3D models…');
      const km = await assetManager.loadGLB('/assets/models/keke.glb', { scale: 0.85, timeoutMs: 20000 });
      if (km) {
        while (kekeGroup.children.length) kekeGroup.remove(kekeGroup.children[0]);
        kekeGroup.add(km);
        showBanner('✅ Keke GLB ready');
      } else {
        showBanner('⚠️ keke.glb missing — check /assets/models/');
      }
      await trafficManager.loadRealModels?.();
      if (trafficManager.templates?.length) {
        showBanner('✅ Traffic GLBs ×' + trafficManager.templates.length);
      }
      try {
        passengerManager.assets = assetManager;
        await passengerManager.initModels?.();
        if (passengerManager.pedModel) showBanner('✅ Passenger GLB ready');
      } catch (e) {}
      try {
        pedestrianManager.assets = assetManager;
        pedestrianManager.scene = scene;
        pedestrianManager.keke = kekeController;
        await pedestrianManager.init?.();
        if (pedestrianManager.template) showBanner('✅ Sidewalk peds GLB');
      } catch (e) {}
      window.__kanoModelsLoading = false;
    } catch (e) {
      console.error('applyModels', e);
      showBanner('Model load error — see console');
      window.__kanoModelsLoading = false;
    }
  };


  // ===== CRITICAL: start works NOW even if rest of bootstrap fails =====
  let gameSystemsReady = true;
  window.__kanoStartShift = function earlyStartShift() {
    try {
      hideLoading();
      gameStarted = true;
      window.__kanoDistBonus = 0;
      try {
        if (typeof missionManager !== 'undefined' && missionManager) {
          missionManager.lives = Math.max(3, missionManager.lives || 3);
        }
        if (typeof collisionSystem !== 'undefined' && collisionSystem?.repair) collisionSystem.repair();
      } catch (e) {}
      try {
        kekeGroup.position.set(3.8, 0, 0);
        kekeGroup.rotation.set(0, 0, 0);
        kekeController.velocity = 0;
        kekeController.maxSpeed = 36;
      } catch (e) {}
      const menu = document.getElementById('main-menu-overlay');
      if (menu) menu.style.display = 'none';
      const mc = document.getElementById('mobile-controls-overlay');
      if (mc) mc.style.display = 'block';
      try {
        flow.state = 'DRIVING';
        flow.engineStarted = true;
        cameraRig.setMode?.('chase');
        cameraRig._snapToTarget?.();
      } catch (e) {
        camera.position.set(3.8, 4.2, -11.5);
        camera.lookAt(3.8, 1, 10);
      }
      try { if (typeof dashHud !== 'undefined') dashHud.show?.(); } catch (e) {}
      try { if (typeof radar !== 'undefined') radar.show?.(); } catch (e) {}
      try {
        // Ensure some traffic on the road
        if (trafficManager.vehicles && trafficManager.vehicles.length < 3) {
          for (let i = 0; i < 3; i++) trafficManager._spawn?.(false);
        }
      } catch (e) {}
      if (!document.getElementById('kano-speed-big')) {
        const sp = document.createElement('div');
        sp.id = 'kano-speed-big';
        sp.style.cssText = 'position:fixed;bottom:130px;left:50%;transform:translateX(-50%);z-index:55;pointer-events:none;font:900 28px/1 system-ui;color:#ffcc00;text-shadow:0 2px 8px #000;';
        sp.textContent = '0 km/h';
        document.body.appendChild(sp);
      }
      try {
        const chip = document.getElementById('cash-chip') || document.getElementById('earnings');
        if (chip) chip.textContent = (chip.id === 'cash-chip' ? 'CASH ₦' : '') + (passengerManager.dailyEarnings || 0);
      } catch (e) {}
      
      try { window.__kanoApplyModels?.(); } catch (e) {}

      try { window.__kanoApplyModels?.(); } catch (e) {}
      showBanner('🚗 Drive! Hold ACCEL · ◀ ▶ steer');
      window.__kanoStartQueued = false;
    } catch (err) {
      console.error('earlyStart', err);
      showBanner('Start failed — try again');
    }
  };
  if (window.__kanoStartQueued) {
    window.__kanoStartQueued = false;
    try { window.__kanoStartShift(); } catch (e) {}
  }
  // ===== end early start =====
  // Minimal loop so drive works even if rest of bootstrap crashes
  const clock = new THREE.Clock();
  window.__kanoFullFrame = null;
  function minimalAnimate() {
    requestAnimationFrame(minimalAnimate);
    if (typeof window.__kanoFullFrame === 'function') {
      try { window.__kanoFullFrame(); } catch (e) { console.warn(e); }
      return;
    }
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!gameStarted) {
      window.__menuFrame = (window.__menuFrame || 0) + 1;
      if (window.__menuFrame % 3 === 0) {
        try {
          camera.position.set(8, 5, 12);
          camera.lookAt(0, 1, 0);
          renderer.render(scene, camera);
        } catch (e) {}
      }
      return;
    }
    try {
      let throttle = Number(input.throttle) || 0;
      let steer = Number(input.steering) || 0;
      if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
      if (keys['KeyS'] || keys['ArrowDown']) throttle = -1;
      if (keys['KeyA'] || keys['ArrowLeft']) steer = -1;
      if (keys['KeyD'] || keys['ArrowRight']) steer = 1;
      kekeController.setInput(throttle, steer);
      kekeController.update(delta);
      // Reverse cue
      if (throttle < -0.5 && (kekeController.velocity || 0) < -0.5) {
        if (!window.__revBanner || performance.now() - window.__revBanner > 2500) {
          window.__revBanner = performance.now();
          showBanner('⏪ Reverse');
        }
      }

      cameraRig.update(delta, kekeController.currentSpeed);
      try { roadSystem.update?.(kekeGroup.position.z); } catch (e) {}
      try { trafficManager.update?.(delta, false); } catch (e) {}
      try { passengerManager.update?.(delta, showBanner); } catch (e) {}
      const kmh2 = Math.round((kekeController.currentSpeed || 0) * 3.6);
      const big2 = document.getElementById('kano-speed-big');
      if (big2) big2.textContent = kmh2 + ' km/h';
      renderer.render(scene, camera);
    } catch (e) {
      console.warn('minFrame', e);
    }
  }

  window.__kanoRepairEngine = () => {
    try {
      collisionSystem?.repair?.();
      if (missionManager && missionManager.lives < 3) {
        missionManager.lives = Math.min(3, (missionManager.lives || 0) + 1);
      }
      showBanner('🔧 Mechanic at PMS — engine topped up');
    } catch (e) {}
  };
  window.__kanoCycleCam = () => {
    try {
      const mode = cameraRig.cycleMode?.() || 'chase';
      showBanner('📷 ' + String(mode).toUpperCase());
    } catch (e) {}
  };
  window.__kanoEndShift = () => {
    try {
      const cash = passengerManager?.dailyEarnings ?? 0;
      let result = { score: cash, level: 1 };
      try {
        result = missionManager.settleShift(cash, fuelManager?.fuel ?? 50);
      } catch (e) {}
      // Star rating life-sim
      try {
        let stars = 1;
        if (cash >= 1500) stars++;
        if (cash >= 3000) stars++;
        if ((passengerManager.combo || 0) >= 3) stars++;
        if ((fuelManager?.fuel ?? 0) > 20) stars++;
        if ((missionManager?.lives ?? 0) >= 2) stars++;
        stars = Math.min(5, stars);
        const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        setTimeout(() => showBanner('Shift rating ' + starStr), 900);
      } catch (e) {}
      try {
        HighScoreBoard.submit({
          score: result.score || cash,
          cash,
          driver: charSelect.getDriver()?.name || 'RuffNeck',
          route: document.getElementById('route-name-display')?.textContent || 'Kano'
        });
        HighScoreBoard.renderOnMenu();
      } catch (e) {}
      try {
        SaveSystem.saveGame({
          cash,
          currentLevel: result.level || missionManager?.level || 1,
          highScore: result.score || 0
        });
      } catch (e) {}
      gameStarted = false;
      paused = false;
      const menu = document.getElementById('main-menu-overlay');
      if (menu) menu.style.display = 'flex';
      const mc = document.getElementById('mobile-controls-overlay');
      if (mc) mc.style.display = 'none';
      try { dashHud?.hide?.(); } catch (e) {}
      const big = document.getElementById('kano-speed-big');
      if (big) big.remove();
      const rh = document.getElementById('kano-race-hud');
      if (rh) rh.remove();
      const drops = passengerManager?.onBoard ? 0 : 0;
      const fuelLeft = Math.round(fuelManager?.fuel ?? 0);
      // Play streak (calendar days WAT)
      try {
        const dayKey = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
        const prev = localStorage.getItem('kano_last_play_day');
        let streak = parseInt(localStorage.getItem('kano_play_streak') || '0', 10);
        if (prev !== dayKey) {
          const prevT = prev ? Date.parse(prev + 'T12:00:00Z') : 0;
          const curT = Date.parse(dayKey + 'T12:00:00Z');
          if (prevT && curT - prevT <= 90000000) streak += 1;
          else streak = 1;
          localStorage.setItem('kano_last_play_day', dayKey);
          localStorage.setItem('kano_play_streak', String(streak));
        }
        window.__kanoStreak = streak;
        if (streak >= 2) {
          const bonus = Math.min(500, streak * 50);
          passengerManager.dailyEarnings += bonus;
          showBanner('🔥 ' + streak + '-day streak · +₦' + bonus);
        }
      } catch (e) {}
      try {
        const dayKey = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
        const bestKey = 'kano_best_' + dayKey;
        const prevBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
        if (cash > prevBest) {
          localStorage.setItem(bestKey, String(cash));
          setTimeout(() => showBanner('🥇 New best today · ₦' + cash), 2000);
        }
      } catch (e) {}
      showBanner('✅ Shift ended · ₦' + cash + ' · fuel ' + fuelLeft + '%');
      setTimeout(() => showBanner('High scores updated · Start again when ready'), 1600);
    } catch (e) {
      console.warn('endShift', e);
      showBanner('Shift ended');
      gameStarted = false;
      const menu = document.getElementById('main-menu-overlay');
      if (menu) menu.style.display = 'flex';
    }
  };

  minimalAnimate();
  // EARLY mobile controls
  try {
    setupMobileControls(input, () => { try { window.__kanoHorn?.(); } catch (e) {} }, () => {});
  } catch (e) { console.warn('mobile', e); }

  passengerManager.negotiationBonus = driver.negotiationBonus || 1;
  passengerManager.tipBonus = driver.tipBonus || 1;
  const seatOccupancy = new KekeSeatOccupancy(kekeGroup, assetManager);
  try { const p = seatOccupancy.init?.(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
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
  try {
    const dayKey = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
    const best = parseInt(localStorage.getItem('kano_best_' + dayKey) || '0', 10);
    if (best > 0) {
      let el = document.getElementById('kano-best-today');
      if (!el) {
        el = document.createElement('div');
        el.id = 'kano-best-today';
        el.style.cssText = 'color:#ffcc00;font-weight:800;font-size:13px;margin:6px 16px;';
        document.getElementById('main-menu-overlay')?.querySelector('.menu-buttons')?.prepend(el);
      }
      el.textContent = '🥇 Best today · ₦' + best;
    }
  } catch (e) {}

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
  window.__kanoHorn = () => { try { audioEngine.playHorn(); } catch (e) {} };


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
  try { weatherManager = new KanoWeatherManager(scene, kekeController, passengerManager); } catch (e) { console.warn('weather', e); }
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
    try {
      if (!paused) {
        const cash = passengerManager?.dailyEarnings ?? 0;
        const fuel = Math.round(fuelManager?.fuel ?? 0);
        const seats = (passengerManager?.onBoard?.length || 0) + '/' + (passengerManager?.capacity || 3);
        const kmh = Math.round((kekeController?.currentSpeed || 0) * 3.6);
        const mins = Math.max(1, Math.round((shiftElapsed || 1) / 60));
        const epm = Math.round(cash / mins);
        showBanner('⏸ ₦' + cash + ' · ₦' + epm + '/min · Fuel ' + fuel + '% · Seats ' + seats);
      }
    } catch (e) {}

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
      const stations = [
        '📻 Freedom Radio 99.5',
        '📻 Express Radio Kano',
        '📻 Cool FM echoes',
        '📻 Wazobia vibes',
        '📻 Off'
      ];
      window.__kanoRadioIdx = ((window.__kanoRadioIdx || 0) + 1) % stations.length;
      showBanner(stations[window.__kanoRadioIdx]);
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
    if (e.code === 'KeyB') {
      try {
        if ((passengerManager.dailyEarnings || 0) >= 500) {
          passengerManager.dailyEarnings -= 500;
          window.__kanoSavings = (window.__kanoSavings || 0) + 500;
          SaveSystem.saveGame({
            cash: passengerManager.dailyEarnings,
            savings: window.__kanoSavings
          });
          showBanner('🏦 Saved ₦500 · Total savings ₦' + window.__kanoSavings);
          const earn = document.getElementById('earnings');
          if (earn) earn.innerText = passengerManager.dailyEarnings;
        } else {
          showBanner('Need ₦500 cash to bank');
        }
      } catch (err) {}
    }
    if (e.code === 'KeyN') {
      try { window.__kanoEndShift?.(); } catch (err) {}
      return;
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
    try { setTimeout(() => window.__kanoApplyModels?.(), 300); } catch (e) {}
    setTimeout(() => { window.__kanoStarting = false; }, 1500);
    // Re-read selection
    const ds = document.getElementById('driver-select');
    const ks = document.getElementById('keke-select');
    if (ds) charSelect.selectDriver(ds.value);
    if (ks) charSelect.selectKeke(ks.value);
    const d = charSelect.getDriver();
    const k = charSelect.getKeke();
    kekeController.maxSpeed = 32 * (k.speed || 1) * (d.speedBonus || 1);
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
      if (roadMode === 'single') {
        kekeGroup.position.x = 0;
        kekeController.roadLimit = 5.2;
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
          window.__kanoRaceWon = false;
          window.__kanoDistBonus = 0;
          window.__kanoRaceLead = 0;
          trafficManager.startRace?.(7);
          try { window.__kanoGameMode = 'race'; } catch (e) {}
          setTimeout(() => showBanner('🏁 Pass yellow kekes — climb to P1'), 1200);
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
    if (!document.getElementById('kano-speed-big')) {
        const sp = document.createElement('div');
        sp.id = 'kano-speed-big';
        sp.style.cssText = 'position:fixed;bottom:130px;left:50%;transform:translateX(-50%);z-index:55;pointer-events:none;font:900 28px/1 system-ui;color:#ffcc00;text-shadow:0 2px 8px #000;';
        sp.textContent = '0 km/h';
        document.body.appendChild(sp);
      }
      try {
        const chip = document.getElementById('cash-chip') || document.getElementById('earnings');
        if (chip) chip.textContent = (chip.id === 'cash-chip' ? 'CASH ₦' : '') + (passengerManager.dailyEarnings || 0);
      } catch (e) {}
      try { window.__kanoApplyModels?.(); } catch (e) {}
      showBanner('🚗 Drive! Hold ACCEL · ◀ ▶ steer');
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

  try { hideLoading(); } catch (e) {}
  showBanner('Select driver & route, then START SHIFT');
  showFirstRunTips();

  // Hide HUDs until start
  ['top-left-hud', 'top-right-hud'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // ---------- Loop ----------
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

window.__kanoFullFrame = function fullFrame() {
    const frameStart = performance.now();
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!gameStarted) return;
    if (paused || (flow && flow.state === 'PAUSED')) {
      try { renderer.render(scene, camera); } catch (e) {}
      return;
    }
    try {
      try { flow.state = 'DRIVING'; flow.engineStarted = true; } catch (e) {}
      let throttle = Number(input.throttle) || 0;
      let steer = Number(input.steering) || 0;
      if (keys['KeyW'] || keys['ArrowUp']) throttle = 1;
      if (keys['KeyS'] || keys['ArrowDown']) throttle = -1;
      if (keys['KeyA'] || keys['ArrowLeft']) steer = -1;
      if (keys['KeyD'] || keys['ArrowRight']) steer = 1;
      isHornActive = !!(input.horn);
      if (keys['KeyH'] || keys['Space']) isHornActive = true;
      if (isHornActive) {
        try {
          let h = document.getElementById('kano-horn-flash');
          if (!h) {
            h = document.createElement('div');
            h.id = 'kano-horn-flash';
            h.style.cssText = 'position:fixed;bottom:240px;right:24px;z-index:60;pointer-events:none;font:900 14px system-ui;color:#00e5ff;text-shadow:0 0 8px #000;';
            document.body.appendChild(h);
          }
          h.textContent = '📢 HONK';
          try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
          h.style.opacity = '1';
          clearTimeout(window.__hornFlash);
          window.__hornFlash = setTimeout(() => { h.style.opacity = '0'; }, 300);
          // Brief overtake push
          if (kekeController.currentSpeed > 4 && !(window.__hornBoost > performance.now())) {
            window.__hornBoost = performance.now() + 900;
            kekeController.velocity = Math.min(
              kekeController.maxSpeed || 36,
              (kekeController.velocity || 0) + 2.2
            );
          }
        } catch (e) {}
      }

      kekeController.setInput(throttle, steer);
      kekeController.update(delta);
      // Reverse cue
      if (throttle < -0.5 && (kekeController.velocity || 0) < -0.5) {
        if (!window.__revBanner || performance.now() - window.__revBanner > 2500) {
          window.__revBanner = performance.now();
          showBanner('⏪ Reverse');
        }
      }

      cameraRig.update(delta, kekeController.currentSpeed);

      try { roadSystem.update?.(kekeGroup.position.z); } catch (e) {}
      try { trafficManager.update?.(delta, isHornActive); } catch (e) {}
      try { roadsideLife?.update?.(kekeGroup.position.z); } catch (e) {}
      try {
        if (window.__kanoGameMode === 'race' || trafficManager.raceMode) {
          const place = trafficManager.getRacePlace?.() || 1;
          let rh = document.getElementById('kano-race-hud');
          if (!rh) {
            rh = document.createElement('div');
            rh.id = 'kano-race-hud';
            rh.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:56;pointer-events:none;font:900 18px system-ui;color:#00e5ff;text-shadow:0 2px 6px #000;';
            document.body.appendChild(rh);
          }
          rh.textContent = '🏁 P' + place;
          // Win: hold P1 for a stretch
          if (place === 1) {
            window.__kanoRaceLead = (window.__kanoRaceLead || 0) + delta;
            if (window.__kanoRaceLead > 12 && !window.__kanoRaceWon) {
              window.__kanoRaceWon = true;
              showBanner('🏆 NAPEP RACE WIN — P1 locked!');
              try { passengerManager.dailyEarnings += 2500; } catch (e) {}
            }
          } else {
            window.__kanoRaceLead = 0;
          }
        }
      } catch (e) {}
      try {
        passengerManager.update?.(delta, (ev) => {
          showBanner(ev);
          if (ev && ev.earnings != null) {
            const earn = document.getElementById('earnings');
            if (earn) earn.innerText = ev.earnings;
          }
          if (ev && ev.type === 'DROPOFF') {
            if (window.__kanoGariRush > 0) window.__kanoGariDrops = (window.__kanoGariDrops || 0) + 1;
            try {
              const fareMatch = String(ev.msg || '').match(/₦(\d+)/);
              const fare = fareMatch ? parseInt(fareMatch[1], 10) : 200;
              missionManager?.onDropoff?.(fare);
              _updateMissionHud?.(missionManager);
            } catch (e) {}

            const combo = passengerManager.combo || 0;
            if (combo === 3) showBanner('🔥 3-drop combo — street legend forming');
            if (combo === 5) showBanner('🔥🔥 5 combo — Kano king shift!');
            if (combo === 8) showBanner('👑 8 combo — RuffNeck status');
          }
          if (ev && (ev.type === 'DROPOFF' || (ev.msg && String(ev.msg).includes('₦')))) {
            try {
              let pop = document.getElementById('kano-fare-pop');
              if (!pop) {
                pop = document.createElement('div');
                pop.id = 'kano-fare-pop';
                pop.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:70;pointer-events:none;font:900 32px system-ui;color:#69f0ae;text-shadow:0 2px 12px #000;transition:opacity 0.4s;';
                document.body.appendChild(pop);
              }
              pop.textContent = String(ev.msg || 'Fare!').slice(0, 40);
              pop.style.opacity = '1';
              clearTimeout(window.__farePopT);
              window.__farePopT = setTimeout(() => { pop.style.opacity = '0'; }, 1600);
            } catch (e) {}
          }
        });
      } catch (e) {}
      try {
        collisionSystem.update?.(delta, (msg) => {
          showBanner(msg);
          try {
            if (navigator.vibrate && String(msg).toLowerCase().includes('crash')) {
              navigator.vibrate([40, 30, 40]);
            }
          } catch (e) {}
        });
      } catch (e) {}
      try {
        fuelManager.update?.(delta, (ev) => {
          if (ev?.msg) showBanner(ev);
        });
      } catch (e) {}
      try {
        prayerManager?.update?.(window.timeInMinutes, (ev) => {
          if (ev?.msg) showBanner(ev);
        });
      } catch (e) {}
      try { policeEngine.update?.(showBanner, delta); } catch (e) {}
      try { streetEvents.update?.(delta, showBanner); } catch (e) {}
      try {
        fatigue?.update?.(delta, kekeController.currentSpeed, (ev) => {
          if (ev?.msg) showBanner(ev);
        }, false);
      } catch (e) {}
      try { nearMiss?.update?.(delta, showBanner); } catch (e) {}
      try { pedestrianManager?.update?.(delta); } catch (e) {}
      try { weatherManager?.update?.(delta, kekeGroup.position, showBanner); } catch (e) {}
      try {
        const targets = [];
        (passengerManager.waiting || []).forEach((p) => {
          if (p.mesh) targets.push({ x: p.mesh.position.x, z: p.mesh.position.z, type: 'passenger' });
        });
        try {
          (fuelStations?.stations || fuelStations?.markers || []).forEach((s) => {
            const m = s.mesh || s;
            if (m?.position) targets.push({ x: m.position.x, z: m.position.z, type: 'fuel' });
          });
        } catch (e) {}
        try {
          const cp = policeEngine?.checkpoint || policeEngine?.current;
          if (cp?.position) targets.push({ x: cp.position.x, z: cp.position.z, type: 'checkpoint' });
          else if (cp?.mesh?.position) targets.push({ x: cp.mesh.position.x, z: cp.mesh.position.z, type: 'checkpoint' });
        } catch (e) {}
        radar.update?.(
          { x: kekeGroup.position.x, z: kekeGroup.position.z, rotY: kekeGroup.rotation.y || 0 },
          targets
        );
      } catch (e) {}
      try { fuelStations.update?.(delta, kekeGroup.position, kekeController.currentSpeed, showBanner); } catch (e) {}
      try { signalLights.update?.(delta, throttle < -0.1, steer); } catch (e) {}
      try {
        headlights.update?.(window.timeInMinutes);
        // Night auto-headlights for life-sim
        const h = (window.timeInMinutes || 0) / 60;
        if (h >= 18.5 || h < 6.5) {
          try { headlights.enabled = true; headlights.manual = true; } catch (e) {}
        }
      } catch (e) {}
      try { audioEngine.updateEngine?.(kekeController.currentSpeed, kekeController.maxSpeed); } catch (e) {}

      const kmh = Math.round((kekeController.currentSpeed || 0) * 3.6);
      const spdEl = document.getElementById('speed-display');
      if (spdEl) spdEl.innerText = String(kmh);
      const big = document.getElementById('kano-speed-big');
      if (big) big.textContent = kmh + ' km/h';
      try {
        dashHud.update?.({
          speed: kmh,
          cash: passengerManager.dailyEarnings,
          fuel: fuelManager?.fuel ?? 100,
          seatsUsed: passengerManager.onBoard?.length || 0,
          seatsMax: passengerManager.capacity || 3,
          lives: missionManager?.lives ?? 3,
          route: document.getElementById('route-name-display')?.textContent || 'Kano',
          missionsText: missionManager?.getHudText?.() || '',
          weather: 'CLEAR',
          shiftTime: shiftElapsed || 0,
          startCash: shiftStartCash || 0,
          notice: (() => {
            const goal = 3000;
            const cash = passengerManager.dailyEarnings || 0;
            const left = Math.max(0, goal - cash);
            const base = passengerManager.getHudStatus?.() || null;
            if (left > 0 && cash > 0) return (base ? base + ' · ' : '') + 'Goal ₦' + goal + ' (₦' + left + ' left)';
            if (cash >= goal) return (base ? base + ' · ' : '') + '✅ Daily goal hit';
            return base;
          })()
        });
      } catch (e) {}

      shiftElapsed = (shiftElapsed || 0) + delta;
      // Distance milestones (life-sim / career)
      try {
        const z = Math.abs(kekeGroup.position.z || 0);
        window.__kanoDistBonus = window.__kanoDistBonus || 0;
        const thresholds = [500, 1200, 2500, 4000];
        for (const th of thresholds) {
          if (z > th && window.__kanoDistBonus < th) {
            window.__kanoDistBonus = th;
            const bonus = 200 + Math.floor(th / 20);
            passengerManager.dailyEarnings += bonus;
            showBanner('📍 ' + th + 'm along route · +₦' + bonus);
          }
        }
      } catch (e) {}

      window.__kanoAutoSave = (window.__kanoAutoSave || 0) + delta;
      if (window.__kanoAutoSave > 45) {
        window.__kanoAutoSave = 0;
        try {
          SaveSystem.saveGame({
            cash: passengerManager.dailyEarnings,
            currentLevel: missionManager?.level || 1
          });
        } catch (e) {}
      }

      // Real-life Kano ambient flavour
      window.__kanoLifeT = (window.__kanoLifeT || 0) + delta;
      if (window.__kanoLifeT > 28) {
        window.__kanoLifeT = 0;
        const lines = [
          '📢 "Keke! Sabon Gari!"',
          '🕌 Maghrib soon — watch the road',
          '🛒 Market traffic near Kantin Kwari',
          '⛽ PMS queue at the next junction',
          '🚓 KAROTA may check papers ahead',
          '🌧️ Dust on the dual carriageway',
          '🚌 Danfo blocking the slow lane'
        ];
        if (Math.random() < 0.55) showBanner(lines[Math.floor(Math.random() * lines.length)]);
        // Occasional Gari Rush micro-challenge
        if (Math.random() < 0.22 && !window.__kanoGariRush) {
          window.__kanoGariRush = 45; // seconds
          window.__kanoGariDrops = 0;
          showBanner('⚡ GARI RUSH: drop 2 passengers in 45s!');
        }
      }
      if (window.__kanoGariRush > 0) {
        window.__kanoGariRush -= delta;
        if (window.__kanoGariRush <= 0) {
          window.__kanoGariRush = 0;
          if ((window.__kanoGariDrops || 0) >= 2) {
            passengerManager.dailyEarnings += 800;
            showBanner('⚡ GARI RUSH CLEAR · +₦800');
          } else {
            showBanner('⚡ Gari Rush failed');
          }
        }
      }

      timeAccum += delta;
      if (timeAccum > 0.5) {
        timeAccum = 0;
        window.timeInMinutes = (window.timeInMinutes + 0.4) % 1440;
        // Sky/fog tint by hour
        try {
          if (scene.fog) {
            const h = (window.timeInMinutes / 60) % 24;
            let col = 0x87b5d9; // day
            if (h >= 5.5 && h < 7) col = 0xffb074; // dawn
            else if (h >= 17.5 && h < 19) col = 0xff8a50; // dusk
            else if (h >= 19 || h < 5.5) col = 0x1a237e; // night
            scene.fog.color.setHex(col);
            if (scene.background && scene.background.isColor) scene.background.setHex(col);
            else scene.background = new THREE.Color(col);
            // Tighter fog at night for visibility challenge
            if (h >= 19 || h < 5.5) {
              scene.fog.near = 40;
              scene.fog.far = 140;
            } else {
              scene.fog.near = 70;
              scene.fog.far = 220;
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('frame', err);
    }
    try { renderer.render(scene, camera); } catch (e) {}
    window.__lastFrameMs = performance.now() - frameStart;
  };
  // minimalAnimate already running – hands off to fullFrame
}


bootstrap().catch((e) => {
  console.error('bootstrap failed', e);
  try { hideLoading(); } catch (err) {}
  showBanner('Fallback mode — press Start Shift');
  const b = document.getElementById('start-game-btn');
  if (b) {
    b.disabled = false;
    b.style.opacity = '1';
    b.textContent = 'Start Shift';
  }
  if (typeof window.__kanoStartShift !== 'function') {
    window.__kanoStartShift = () => {
      try {
        gameStarted = true;
        const menu = document.getElementById('main-menu-overlay');
        if (menu) menu.style.display = 'none';
        const mc = document.getElementById('mobile-controls-overlay');
        if (mc) mc.style.display = 'block';
        showBanner('🚗 Drive (fallback)');
      } catch (err) {
        showBanner('Refresh the page');
      }
    };
  }
  if (window.__kanoStartQueued) {
    window.__kanoStartQueued = false;
    try { window.__kanoStartShift(); } catch (err) {}
  }
});

// Safety: if bootstrap never finishes in 3s, still allow start
setTimeout(() => {
  const b = document.getElementById('start-game-btn');
  if (b) { b.disabled = false; b.style.opacity = '1'; b.textContent = 'Start Shift'; }
  if (typeof window.__kanoStartShift !== 'function') {
    window.__kanoStartShift = () => {
      gameStarted = true;
      const menu = document.getElementById('main-menu-overlay');
      if (menu) menu.style.display = 'none';
      showBanner('🚗 Limited mode — refresh if world empty');
    };
  }
}, 3000);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
