export class PassengerDialogueManager {
  constructor() {
    this.dialogueLines = [
      "Malam, dan sauri mana, na makara a ofis!",
      "Wannan Keke naka yana da sound system mai dadi wallahi!",
      "Kai, a hankali tukin nan, kar ka k Keba mu!",
      "A Kano sai dan k'arfi, traffic din nan yayi yawa yau.",
      "Uncle, dan bani canji na kafin ka tafi gidan gaba.",
      "Wallahi wannan titin Zaria Road sai a hankali.",
      "Gaskiya Keke Na-pep shine mafi saukin sufuri a gari!"
    ];

    this.activeBubble = null;
    this.timer = 0;
  }

  update(delta, kekeSpeed, hudCallback) {
    this.timer += delta;

    // Trigger a random passenger remark every ~12 seconds if moving
    if (this.timer > 12 && Math.abs(kekeSpeed) > 0.1) {
      this.timer = 0;
      const randomLine = this.dialogueLines[Math.floor(Math.random() * this.dialogueLines.length)];
      
      if (hudCallback) {
        hudCallback({
          type: 'PASSENGER_CHAT',
          msg: `💬 Passenger: "${randomLine}"`
        });
      }
    }
  }
}