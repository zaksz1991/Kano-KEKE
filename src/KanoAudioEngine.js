import * as THREE from 'three';

/**
 * Professional Spatial Audio Engine for Kano Run
 * - Real engine.mp3 + horn.mp3 via PositionalAudio
 * - Falls back to procedural oscillator if files missing
 * - Listener attached to camera
 * - Engine pitch/volume driven by speed + RPM
 */
export class KanoAudioEngine {
  constructor() {
    this.listener = null;
    this.engineSound = null;
    this.hornBuffer = null;
    this.audioLoader = new THREE.AudioLoader();
    this.isInitialized = false;
    this.usePositional = false;

    // Procedural fallback
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;

    this._boundInit = this._onUserGesture.bind(this);
    this.kekeGroup = null;
    this.camera = null;
  }

  /** Call early – stores references */
  setup(camera, kekeGroup) {
    this.camera = camera;
    this.kekeGroup = kekeGroup;
  }

  enableOnInteraction() {
    document.addEventListener('pointerdown', this._boundInit, { once: true });
    document.addEventListener('keydown', this._boundInit, { once: true });
  }

  async _onUserGesture() {
    if (this.isInitialized) return;
    try {
      // Prefer real spatial audio
      this.listener = new THREE.AudioListener();
      if (this.camera) this.camera.add(this.listener);

      // Try loading real engine loop
      const engineBuf = await this._loadBuffer('/assets/models/audio/engine.mp3');
      if (engineBuf && this.kekeGroup) {
        this.engineSound = new THREE.PositionalAudio(this.listener);
        this.engineSound.setBuffer(engineBuf);
        this.engineSound.setRefDistance(8);
        this.engineSound.setRolloffFactor(1.4);
        this.engineSound.setLoop(true);
        this.engineSound.setVolume(0);
        this.kekeGroup.add(this.engineSound);
        this.engineSound.play();
        this.usePositional = true;
      }

      // Preload horn
      this.hornBuffer = await this._loadBuffer('/assets/models/audio/horn.mp3');

      // Always create procedural fallback (or primary if files missing)
      this._initProcedural();

      this.isInitialized = true;
      console.log(this.usePositional
        ? '🔊 Spatial engine + horn audio ready'
        : '🔊 Procedural audio ready (MP3 fallback)');
    } catch (e) {
      console.warn('Audio init partial failure', e);
      this._initProcedural();
      this.isInitialized = true;
    }
  }

  _loadBuffer(url) {
    return new Promise((resolve) => {
      this.audioLoader.load(
        url,
        (buf) => resolve(buf),
        undefined,
        () => resolve(null)
      );
    });
  }

  _initProcedural() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 780;

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 42;
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch (e) {
      console.warn('Procedural audio failed', e);
    }
  }

  updateEngine(speed, maxSpeed = 22) {
    if (!this.isInitialized) return;
    const ratio = Math.min(1, Math.abs(speed) / maxSpeed);

    if (this.usePositional && this.engineSound) {
      // Playback rate = pitch (0.7 idle → 1.55 high)
      const rate = 0.68 + ratio * 0.95;
      this.engineSound.setPlaybackRate(rate);
      const vol = ratio > 0.03 ? 0.35 + ratio * 0.45 : 0.08;
      this.engineSound.setVolume(vol);
    }

    // Always keep procedural as secondary / fallback layer (quieter)
    if (this.engineOsc && this.ctx) {
      const freq = 40 + ratio * 160;
      const vol = this.usePositional
        ? (ratio > 0.03 ? 0.012 + ratio * 0.02 : 0)
        : (ratio > 0.03 ? 0.05 + ratio * 0.08 : 0);
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.06);
      this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.04);
    }
  }

  playHorn() {
    if (!this.isInitialized) {
      this._onUserGesture();
      return;
    }

    if (this.hornBuffer && this.listener && this.kekeGroup) {
      const horn = new THREE.PositionalAudio(this.listener);
      horn.setBuffer(this.hornBuffer);
      horn.setRefDistance(12);
      horn.setVolume(0.85);
      this.kekeGroup.add(horn);
      horn.play();
      // Cleanup after play
      setTimeout(() => {
        this.kekeGroup.remove(horn);
        horn.disconnect();
      }, 1500);
      return;
    }

    // Procedural horn fallback
    if (this.ctx) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 385;
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    }
  }
}
