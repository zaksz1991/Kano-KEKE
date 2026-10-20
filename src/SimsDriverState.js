export class SimsDriverState {
  constructor() {
    this.needs = {
      stamina: 100,
      hunger: 100,
      bladder: 100
    };
    this.stressLevel = 0;
  }

  update(deltaSeconds, isDriving) {
    const decayFactor = isDriving ? 1.5 : 1.0;
    this.needs.stamina = Math.max(0, this.needs.stamina - (0.015 * deltaSeconds * decayFactor));
    this.needs.hunger  = Math.max(0, this.needs.hunger  - (0.02 * deltaSeconds * decayFactor));
    this.needs.bladder = Math.max(0, this.needs.bladder - (0.025 * deltaSeconds));
  }

  replenishNeed(type, amount) {
    if (this.needs[type] !== undefined) {
      this.needs[type] = Math.min(100, this.needs[type] + amount);
    }
  }
}