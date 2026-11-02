/**
 * Kano / Northern radio – real station names, audible tone per station
 */
export class HausaRadioManager {
  constructor(audioEngine = null) {
    this.audioEngine = audioEngine;
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.lfo = null;
    this.isPlaying = false;
    this.hasSubwoofer = false;
    this.currentStationIndex = 0;
    this.stations = [
      { name: 'OFF', freq: '', pitch: 0, genre: 'OFF' },
      { name: 'Freedom Radio 99.5', freq: '99.5 FM', pitch: 196, genre: 'TALK' },
      { name: 'Arewa Radio 93.1', freq: '93.1 FM', pitch: 220, genre: 'HAUSA' },
      { name: 'Rahma Radio 97.3', freq: '97.3 FM', pitch: 247, genre: 'ISLAMIC' },
      { name: 'Kano FM 89.3', freq: '89.3 FM', pitch: 165, genre: 'NEWS' },
      { name: 'Cool FM Kano', freq: '96.9 FM', pitch: 294, genre: 'POP' },
      { name: 'Vision FM 92.1', freq: '92.1 FM', pitch: 185, genre: 'HAUSA' },
      { name: 'Express Radio 90.3', freq: '90.3 FM', pitch: 260, genre: 'HAUSA_HIPHOP' }
    ];
  }

  _ensureCtx() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.audioCtx = null;
    }
  }

  toggle(hudCallback) {
    this._ensureCtx();
    if (!this.audioCtx) {
      if (hudCallback) hudCallback('📻 Radio unavailable');
      return;
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});

    if (this.isPlaying && this.currentStationIndex > 0) {
      this.stopRadio();
      this.isPlaying = false;
      this.currentStationIndex = 0;
      if (hudCallback) hudCallback('📻 Radio OFF');
      return;
    }
    this.currentStationIndex = Math.max(1, this.currentStationIndex);
    this.isPlaying = true;
    this.playStation(hudCallback);
  }

  nextStation(hudCallback) {
    this._ensureCtx();
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
    this.currentStationIndex++;
    if (this.currentStationIndex >= this.stations.length) this.currentStationIndex = 1;
    this.isPlaying = true;
    this.playStation(hudCallback);
  }

  playStation(hudCallback) {
    if (!this.audioCtx) return;
    this.stopRadio();
    const station = this.stations[this.currentStationIndex];
    if (!station || station.pitch <= 0) {
      this.isPlaying = false;
      if (hudCallback) hudCallback('📻 Radio OFF');
      return;
    }

    try {
      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;

      this.oscillator.type = station.genre === 'HAUSA_HIPHOP' ? 'sawtooth' : 'triangle';
      this.oscillator.frequency.setValueAtTime(station.pitch, this.audioCtx.currentTime);

      // Gentle LFO “broadcast” wobble
      this.lfo = this.audioCtx.createOscillator();
      const lfoGain = this.audioCtx.createGain();
      this.lfo.frequency.value = 0.15;
      lfoGain.gain.value = 8;
      this.lfo.connect(lfoGain);
      lfoGain.connect(this.oscillator.frequency);
      this.lfo.start();

      const volume = this.hasSubwoofer ? 0.14 : 0.07;
      this.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);

      this.oscillator.connect(filter);
      filter.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);
      this.oscillator.start();

      if (hudCallback) {
        hudCallback(`📻 ${station.name} [${station.freq}]`);
      }
      const el = document.getElementById('radio-display');
      if (el) el.textContent = station.name;
    } catch (e) {
      console.warn('radio play', e);
    }
  }

  stopRadio() {
    try {
      this.oscillator?.stop();
      this.oscillator?.disconnect();
    } catch (e) {}
    try {
      this.lfo?.stop();
      this.lfo?.disconnect();
    } catch (e) {}
    this.oscillator = null;
    this.lfo = null;
    this.gainNode = null;
  }

  upgradeSubwoofer() {
    this.hasSubwoofer = true;
  }

  getStationName() {
    return this.stations[this.currentStationIndex]?.name || 'OFF';
  }
}
