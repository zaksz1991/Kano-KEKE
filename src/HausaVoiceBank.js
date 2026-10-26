/**
 * Hausa / Kano street voice one-shots
 * Uses Web Speech API when available, procedural tones as fallback
 */
export class HausaVoiceBank {
  constructor(audioEngine = null) {
    this.audio = audioEngine;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.queue = [];
    this.speaking = false;
    this.enabled = true;

    this.phrases = {
      flag: [
        'Driver! Driver!',
        'Kai driver, tsaya!',
        'Oga, ina zuwa!',
        'Mallam, jiran ka!'
      ],
      negotiate: [
        'Nawa ne zuwa?',
        'Ka rage dan kadan',
        'Standard fare, toh?',
        'Ina zuwa Sabon Gari'
      ],
      board: [
        'Toh, shiga',
        'Na yarda',
        'Let us go',
        'Madalla'
      ],
      drop: [
        'Akwai! Akwai!',
        'Ina so in sauka',
        'Nan, nan — gafara',
        'Na gode, driver'
      ],
      tip: [
        'Karba, don Allah',
        'Madalla, kai ne',
        'Allah ya saka'
      ],
      karota: [
        'Tsaya! Checkpoint!',
        'Papers, please',
        'To haka, wuce',
        'Gafara, settlement'
      ],
      horn: ['Kai!', 'Wuce!', 'Hurry!'],
      crash: ['Allah!', 'Haba!', 'Kai driver!']
    };
  }

  speak(category, preferredLang = 'ha') {
    if (!this.enabled) return;
    const list = this.phrases[category];
    if (!list || !list.length) return;
    const text = list[Math.floor(Math.random() * list.length)];

    if (this.supported) {
      try {
        // Cancel only if not mid-critical
        const u = new SpeechSynthesisUtterance(text);
        u.lang = preferredLang === 'ha' ? 'ha-NG' : 'en-NG';
        // Fallback voices
        const voices = speechSynthesis.getVoices();
        const v =
          voices.find((x) => x.lang.startsWith('ha')) ||
          voices.find((x) => x.lang.startsWith('en')) ||
          voices[0];
        if (v) u.voice = v;
        u.rate = 1.05;
        u.pitch = category === 'drop' ? 1.15 : 1.0;
        u.volume = 0.9;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
        return;
      } catch (e) {}
    }

    // Procedural fallback blips patterned by category
    if (this.audio?.playOneShot) {
      const map = {
        flag: [480, 0.12],
        negotiate: [320, 0.18],
        board: [540, 0.1],
        drop: [700, 0.14],
        tip: [880, 0.16],
        karota: [200, 0.25],
        horn: [390, 0.2],
        crash: [120, 0.3]
      };
      const [f, d] = map[category] || [400, 0.1];
      this.audio.playOneShot(f, d, 'square', 0.08);
      setTimeout(() => this.audio.playOneShot(f * 1.2, d * 0.7, 'triangle', 0.06), d * 400);
    }
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!on && this.supported) speechSynthesis.cancel();
  }
}
