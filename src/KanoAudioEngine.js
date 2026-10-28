/**
 * Engine, horn, radio – reliable Web Audio for mobile
 */
export class KanoAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.radioOsc = null;
    this.radioGain = null;
    this.radioLFO = null;
    this.radioOn = false;
    this.stationIndex = 0;
    this.ready = false;

    this.stations = [
      { name: 'OFF', freq: 0 },
      { name: 'Freedom Radio 99.5', freq: 196 },
      { name: 'Arewa Radio 93.1', freq: 247 },
      { name: 'Rahma Radio 97.3', freq: 165 },
      { name: 'Kano FM 89.3', freq: 294 },
      { name: 'Cool FM Kano', freq: 330 }
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

  _init() {
    if (this.ready) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Engine rumble
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // Radio tone + slight wobble
      this.radioOsc = this.ctx.createOscillator();
      this.radioGain = this.ctx.createGain();
      this.radioLFO = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const rFilter = this.ctx.createBiquadFilter();
      rFilter.type = 'bandpass';
      rFilter.frequency.value = 900;
      rFilter.Q.value = 2;
      this.radioOsc.type = 'triangle';
      this.radioOsc.frequency.value = 220;
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
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  playHorn() {
    this._init();
    this._resume();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(280, t + 0.25);
      g.gain.setValueAtTime(0.12, t);
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

  /** Cycle stations – returns name */
  toggleRadio() {
    this._init();
    this._resume();
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    const st = this.stations[this.stationIndex];
    this.radioOn = st.freq > 0;
    if (this.radioGain && this.radioOsc && this.ctx) {
      if (this.radioOn) {
        this.radioOsc.frequency.setTargetAtTime(st.freq, this.ctx.currentTime, 0.05);
        this.radioGain.gain.setTargetAtTime(0.055, this.ctx.currentTime, 0.08);
      } else {
        this.radioGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }
    return st.name;
  }

  updateEngine(speed, maxSpeed = 26) {
    if (!this.ready || !this.engineOsc || !this.engineGain || !this.ctx) return;
    this._resume();
    const ratio = Math.min(1, Math.max(0, speed / Math.max(1, maxSpeed)));
    const freq = 48 + ratio * 90;
    const vol = ratio > 0.02 ? 0.02 + ratio * 0.05 : 0;
    try {
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
      this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    } catch (e) {}
  }
}
