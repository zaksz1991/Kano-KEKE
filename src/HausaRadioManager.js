export class HausaRadioManager {
  constructor() {
    this.audioCtx = null;
    this.currentStationIndex = 0;
    this.isPlaying = false;
    this.hasSubwoofer = false;

    // Station Presets
    this.stations = [
      { name: "OFF", freq: "---", type: "NONE" },
      { name: "Freedom Radio 99.5 FM", freq: "99.5 FM", genre: "HAUSA_TALK", pitch: 220 },
      { name: "Arewa Radio 93.1 FM", freq: "93.1 FM", genre: "KANNYWOOD_HITS", pitch: 330 },
      { name: "Rahma Radio 97.3 FM", freq: "97.3 FM", genre: "NEWS_COMMENTARY", pitch: 180 },
      { name: "Kano FM 89.3", freq: "89.3 FM", genre: "HAUSA_HIPHOP", pitch: 440 }
    ];

    // Audio Nodes
    this.oscillator = null;
    this.gainNode = null;
    this.staticNoiseNode = null;
  }

  initAudioContext() {
    if (this.audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContext();
  }

  togglePower(hudCallback) {
    this.initAudioContext();
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.currentStationIndex = 1; // Default to Freedom Radio 99.5 FM
      this.playStation(hudCallback);
    } else {
      this.stopRadio();
      if (hudCallback) hudCallback('📻 Radio Turned Off');
    }
  }

  nextStation(hudCallback) {
    if (!this.isPlaying) return;
    this.currentStationIndex = (this.currentStationIndex + 1) % this.stations.length;
    
    if (this.currentStationIndex === 0) {
      this.currentStationIndex = 1; // Loop back to first active station
    }
    
    this.playStation(hudCallback);
  }

  playStation(hudCallback) {
    if (!this.audioCtx) return;
    this.stopRadio();

    const station = this.stations[this.currentStationIndex];

    // Create Synthetic Radio Tone / Harmonic Synth (Simulating FM Broadcast)
    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = station.genre === 'HAUSA_HIPHOP' ? 'sawtooth' : 'sine';
    this.oscillator.frequency.setValueAtTime(station.pitch, this.audioCtx.currentTime);

    // Subwoofer Boost: Enhances bass depth if bought at Garajin Keke
    const volume = this.hasSubwoofer ? 0.18 : 0.08;
    this.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.start();

    if (hudCallback) {
      hudCallback(`📻 Tuned to ${station.name} [${station.freq}] (${station.genre})`);
    }
  }

  stopRadio() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
    }
  }

  upgradeSubwoofer() {
    this.hasSubwoofer = true;
    if (this.isPlaying) {
      this.gainNode?.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
    }
  }
}