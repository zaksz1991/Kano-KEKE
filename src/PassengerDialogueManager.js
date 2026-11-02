export class PassengerDialogueManager {
  constructor() {
    this.lines = [
      'Malam, dan sauri mana, na makara a ofis!',
      'Wannan Keke naka yana da sound system mai dadi wallahi!',
      'Kai, a hankali tukin nan, kar ka kasa mu!',
      'A Kano sai dan k\'arfi, traffic din nan yayi yawa yau.',
      'Oga, kai mu Sabon Gari da sauri.',
      'Hajiya ce tana jiran mu a Kofar Mata.',
      'Wallahi wannan titin Zoo Road sai a hankali.',
      'Gaskiya Keke shine mafi saukin sufuri a gari!',
      'Dan uwa, ka rage gudu — KAROTA na nan gaba.',
      'Yallabai, kai mu Farm Centre, gaskiya.'
    ];
    this.timer = 0;
  }

  update(delta, kekeSpeed, hudCallback) {
    this.timer += delta;
    if (this.timer > 14 && Math.abs(kekeSpeed) > 2) {
      this.timer = 0;
      const line = this.lines[Math.floor(Math.random() * this.lines.length)];
      if (hudCallback) {
        hudCallback({ type: 'PASSENGER_CHAT', msg: `💬 "${line}"` });
      }
    }
  }
}
