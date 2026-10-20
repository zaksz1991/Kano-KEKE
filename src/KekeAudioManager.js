export class KekeAudioManager {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.gainNode = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.engineOsc.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    this.engineOsc.start();
    
    this.isInitialized = true;
  }

  updateEnginePitch(currentSpeed, maxSpeed) {
    if (!this.isInitialized) return;
    const targetFreq = 50 + (Math.abs(currentSpeed) / maxSpeed) * 120;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  playHorn() {
    if (!this.isInitialized) return;
    const hornOsc = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    hornOsc.type = 'square';
    hornOsc.frequency.setValueAtTime(440, this.ctx.currentTime);
    hornOsc.frequency.setValueAtTime(554, this.ctx.currentTime + 0.15);

    hornGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    hornGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    hornOsc.connect(hornGain);
    hornGain.connect(this.ctx.destination);

    hornOsc.start();
    hornOsc.stop(this.ctx.currentTime + 0.4);
  }
}