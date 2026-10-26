export class KanoAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isInitialized = false;
    this._boundInit = this.init.bind(this);
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(42, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      // Simple lowpass for less harsh tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      this.isInitialized = true;
      document.removeEventListener('pointerdown', this._boundInit);
      document.removeEventListener('keydown', this._boundInit);
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  }

  /** Call once after user gesture */
  enableOnInteraction() {
    document.addEventListener('pointerdown', this._boundInit, { once: true });
    document.addEventListener('keydown', this._boundInit, { once: true });
  }

  updateEngine(speed, maxSpeed) {
    if (!this.isInitialized) return;
    const ratio = Math.min(1, Math.abs(speed) / (maxSpeed || 22));
    const freq = 42 + ratio * 155;
    const vol = ratio > 0.02 ? 0.045 + ratio * 0.07 : 0;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.07);
    this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  playHorn() {
    if (!this.isInitialized) this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(390, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.32);
  }
}
