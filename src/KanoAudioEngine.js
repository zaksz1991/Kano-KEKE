/**
 * Real engine.mp3 + horn.mp3 with oscillator fallback
 */
export class KanoAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineSource = null;
    this.engineBuf = null;
    this.hornBuf = null;
    this.radioOsc = null;
    this.radioGain = null;
    this.radioLFO = null;
    this.radioOn = false;
    this.stationIndex = 0;
    this.ready = false;
    this._enginePlaying = false;

    this.stations = [
      { name: 'OFF', freq: 0 },
      { name: 'Freedom Radio 99.5', freq: 196 },
      { name: 'Arewa Radio 93.1', freq: 220 },
      { name: 'Rahma Radio 97.3', freq: 247 },
      { name: 'Kano FM 89.3', freq: 165 },
      { name: 'Cool FM Kano', freq: 294 },
      { name: 'Vision FM 92.1', freq: 185 },
      { name: 'Express Radio 90.3', freq: 260 }
    ];
  }

  setup() {}

  enableOnInteraction() {
    const start = () => {
      this._init();
      this._resume();
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('touchstart', start);
      document.removeEventListener('keydown', start);
    };
    document.addEventListener('pointerdown', start, { once: true });
    document.addEventListener('touchstart', start, { once: true });
    document.addEventListener('keydown', start, { once: true });
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async _loadBuffer(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(arr.slice(0));
    } catch (e) {
      console.warn('Audio load fail', url, e);
      return null;
    }
  }

  _init() {
    if (this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineGain.connect(this.ctx.destination);

      // Procedural engine fallback
      this.engineOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineOsc.start();

      // Radio
      this.radioOsc = this.ctx.createOscillator();
      this.radioGain = this.ctx.createGain();
      this.radioLFO = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const rFilter = this.ctx.createBiquadFilter();
      rFilter.type = 'bandpass';
      rFilter.frequency.value = 900;
      this.radioOsc.type = 'triangle';
      this.radioGain.gain.value = 0;
      this.radioLFO.frequency.value = 4;
      lfoGain.gain.value = 8;
      this.radioLFO.connect(lfoGain);
      lfoGain.connect(this.radioOsc.frequency);
      this.radioOsc.connect(rFilter);
      rFilter.connect(this.radioGain);
      this.radioGain.connect(this.ctx.destination);
      this.radioOsc.start();
      this.radioLFO.start();

      this.ready = true;

      // Load real samples in background
      this._loadBuffer('/assets/models/audio/engine.mp3').then((buf) => {
        this.engineBuf = buf;
      });
      this._loadBuffer('/assets/models/audio/horn.mp3').then((buf) => {
        this.hornBuf = buf;
      });
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  _startEngineLoop() {
    if (!this.ctx || !this.engineBuf || this._enginePlaying) return;
    try {
      // Mute oscillator when real loop plays
      if (this.engineOsc) {
        try {
          this.engineOsc.disconnect();
        } catch (e) {}
      }
      const src = this.ctx.createBufferSource();
      src.buffer = this.engineBuf;
      src.loop = true;
      src.playbackRate.value = 1;
      src.connect(this.engineGain);
      src.start(0);
      this.engineSource = src;
      this._enginePlaying = true;
    } catch (e) {}
  }

  playHorn() {
    this._init();
    this._resume();
    if (!this.ctx) return;

    if (this.hornBuf) {
      try {
        const src = this.ctx.createBufferSource();
        const g = this.ctx.createGain();
        src.buffer = this.hornBuf;
        g.gain.value = 1.0;
        src.connect(g);
        g.connect(this.ctx.destination);
        src.start(0);
        return;
      } catch (e) {}
    }

    // Fallback beep
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(280, t + 0.25);
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {}
  }

  playOneShot(freq = 440, dur = 0.12, type = 'sine', vol = 0.08) {
    this._init();
    this._resume();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) {}
  }

  toggleRadio() {
    this._init();
    this._resume();
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    const st = this.stations[this.stationIndex];
    this.radioOn = st.freq > 0;
    if (this.radioGain && this.radioOsc && this.ctx) {
      if (this.radioOn) {
        this.radioOsc.frequency.setTargetAtTime(st.freq, this.ctx.currentTime, 0.05);
        this.radioGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.08);
      } else {
        this.radioGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }
    return st.name;
  }

  updateEngine(speed, maxSpeed = 26) {
    if (!this.ready || !this.engineGain || !this.ctx) return;
    this._resume();

    const ratio = Math.min(1, Math.max(0, speed / Math.max(1, maxSpeed)));
    if (ratio > 0.05 && this.engineBuf) this._startEngineLoop();

    const vol = ratio > 0.02 ? 0.15 + ratio * 0.45 : 0;
    try {
      this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.12);
      if (this.engineSource) {
        this.engineSource.playbackRate.setTargetAtTime(0.75 + ratio * 0.7, this.ctx.currentTime, 0.1);
      } else if (this.engineOsc) {
        this.engineOsc.frequency.setTargetAtTime(48 + ratio * 90, this.ctx.currentTime, 0.08);
      }
    } catch (e) {}
  }
}
