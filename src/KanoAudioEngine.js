export class KanoAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Engine 2-stroke Oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();

    this.isInitialized = true;
  }

  updateEngine(speed, maxSpeed) {
    if (!this.isInitialized) return;
    const speedRatio = Math.abs(speed) / maxSpeed;
    const targetFreq = 45 + speedRatio * 130;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  playHorn() {
    if (!this.isInitialized) this.init();
    const hornOsc = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    hornOsc.type = 'square';
    hornOsc.frequency.setValueAtTime(420, this.ctx.currentTime);
    hornGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    hornGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    hornOsc.connect(hornGain);
    hornGain.connect(this.ctx.destination);

    hornOsc.start();
    hornOsc.stop(this.ctx.currentTime + 0.35);
  }
}