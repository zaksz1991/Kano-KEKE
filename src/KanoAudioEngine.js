import * as THREE from 'three';

/**
 * Functional spatial + radio audio
 * Engine, horn, radio stations with real oscillators/buffers
 */
export class KanoAudioEngine {
  constructor() {
    this.listener = null;
    this.engineSound = null;
    this.hornBuffer = null;
    this.audioLoader = null;
    this.ready = false;
    this.kekeGroup = null;
    this.camera = null;

    // Procedural engine
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.radioOsc = null;
    this.radioGain = null;
    this.radioOn = false;
    this.stationIndex = 0;

    this.stations = [
      { name: 'OFF', freq: 0 },
      { name: 'Freedom Radio 99.5', freq: 220 },
      { name: 'Arewa Radio 93.1', freq: 280 },
      { name: 'Rahma Radio 97.3', freq: 190 },
      { name: 'Kano FM 89.3', freq: 330 },
      { name: 'Cool FM Kano', freq: 360 }
    ];
  }

  setup(camera, kekeGroup) {
    this.camera = camera;
    this.kekeGroup = kekeGroup;
  }

  enableOnInteraction() {
    const start = () => {
      this._init();
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
    };
    document.addEventListener('pointerdown', start, { once: true });
    document.addEventListener('keydown', start, { once: true });
  }

  _init() {
    if (this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.listener = new THREE.AudioListener();
      if (this.camera) this.camera.add(this.listener);
      this.audioLoader = new THREE.AudioLoader();

      // Engine
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 45;
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // Radio
      this.radioOsc = this.ctx.createOscillator();
      this.radioGain = this.ctx.createGain();
      const rFilter = this.ctx.createBiquadFilter();
      rFilter.type = 'bandpass';
      rFilter.frequency.value = 800;
      this.radioOsc.type = 'triangle';
      this.radioOsc.frequency.value = 220;
      this.radioGain.gain.value = 0;
      this.radioOsc.connect(rFilter);
      rFilter.connect(this.radioGain);
      this.radioGain.connect(this.ctx.destination);
      this.radioOsc.start();

      // Load real samples if present
      this.audioLoader.load('/assets/models/audio/engine.mp3', (buf) => {
        if (!this.listener || !this.kekeGroup) return;
        this.engineSound = new THREE.PositionalAudio(this.listener);
        this.engineSound.setBuffer(buf);
        this.engineSound.setLoop(true);
        this.engineSound.setRefDistance(10);
        this.engineSound.setVolume(0);
        this.kekeGroup.add(this.engineSound);
        this.engineSound.play();
      }, undefined, () => {});

      this.audioLoader.load('/assets/models/audio/horn.mp3', (buf) => {
        this.hornBuffer = buf;
      }, undefined, () => {});

      this.ready = true;
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  updateEngine(speed, maxSpeed = 28) {
    if (!this.ready) return;
    const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
    if (this.engineSound) {
      this.engineSound.setPlaybackRate(0.7 + ratio * 0.9);
      this.engineSound.setVolume(ratio > 0.02 ? 0.3 + ratio * 0.4 : 0.05);
    }
    if (this.engineOsc) {
      this.engineOsc.frequency.setTargetAtTime(42 + ratio * 160, this.ctx.currentTime, 0.06);
      this.engineGain.gain.setTargetAtTime(
        this.engineSound ? ratio * 0.02 : (ratio > 0.02 ? 0.05 + ratio * 0.07 : 0),
        this.ctx.currentTime,
        0.05
      );
    }
  }

  playHorn() {
    if (!this.ready) this._init();
    if (this.hornBuffer && this.listener && this.kekeGroup) {
      const h = new THREE.PositionalAudio(this.listener);
      h.setBuffer(this.hornBuffer);
      h.setVolume(0.9);
      this.kekeGroup.add(h);
      h.play();
      setTimeout(() => { try { this.kekeGroup.remove(h); } catch (e) {} }, 1200);
      return;
    }
    if (this.ctx) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.value = 390;
      g.gain.setValueAtTime(0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.28);
    }
  }

  /** Toggle / cycle radio – returns station name */
  cycleRadio() {
    if (!this.ready) this._init();
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    const st = this.stations[this.stationIndex];
    this.radioOn = st.freq > 0;
    if (this.radioGain && this.radioOsc) {
      if (this.radioOn) {
        this.radioOsc.frequency.setTargetAtTime(st.freq, this.ctx.currentTime, 0.1);
        this.radioGain.gain.setTargetAtTime(0.04, this.ctx.currentTime, 0.1);
      } else {
        this.radioGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }
    return st.name;
  }

  playOneShot(freq = 440, dur = 0.15, type = 'sine', vol = 0.1) {
    if (!this.ready || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }
}
