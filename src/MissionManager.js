/**
 * Shift missions & objectives – life-sim progression
 */
export class MissionManager {
  constructor() {
    this.active = null;
    this.completed = [];
    this.shiftGoals = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.highScore = 0;
    this.lives = 3;
    this.continues = 1;
    this.level = 1;
    this.xp = 0;
    this.xpToLevel = 500;
  }

  loadProgress(saved) {
    if (!saved) return;
    this.highScore = saved.highScore || 0;
    this.level = saved.currentLevel || 1;
    this.xp = saved.xp || 0;
    this.xpToLevel = 400 + this.level * 120;
  }

  /** Generate 2–3 objectives for this shift */
  startShift(routeName = 'Kano') {
    const pool = [
      { id: 'drop_3', type: 'drops', target: 3, progress: 0, label: 'Drop 3 passengers', reward: 400, xp: 40 },
      { id: 'earn_2k', type: 'earn', target: 2000, progress: 0, label: 'Earn ₦2,000 this shift', reward: 300, xp: 35 },
      { id: 'combo_3', type: 'combo', target: 3, progress: 0, label: 'Reach combo x3', reward: 250, xp: 30 },
      { id: 'no_crash', type: 'no_crash', target: 1, progress: 1, label: 'No major crash this shift', reward: 500, xp: 50 },
      { id: 'checkpoint_ok', type: 'checkpoint', target: 1, progress: 0, label: 'Clear 1 KAROTA cleanly', reward: 350, xp: 40 },
      { id: 'drop_5', type: 'drops', target: 5, progress: 0, label: 'Drop 5 passengers', reward: 700, xp: 70 },
      { id: 'earn_5k', type: 'earn', target: 5000, progress: 0, label: 'Earn ₦5,000 this shift', reward: 800, xp: 80 },
      { id: 'fuel_saver', type: 'fuel', target: 1, progress: 1, label: 'Finish shift above 20% fuel', reward: 300, xp: 35 }
    ];
    // Pick 2 based on level
    const shuffled = pool.sort(() => Math.random() - 0.5);
    this.shiftGoals = shuffled.slice(0, this.level >= 5 ? 3 : 2).map((g) => ({ ...g }));
    this.combo = 0;
    this.score = 0;
    this.lives = 3;
    this.continues = 1;
    return this.shiftGoals;
  }

  onDropoff(fare) {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += fare + this.combo * 15;
    this._progress('drops', 1);
    this._progress('combo', this.combo, true);
    this._progress('earn', fare);
  }

  onCrash() {
    this.combo = 0;
    this._progress('no_crash', 0, true); // fail no-crash
  }

  onCheckpointClear(clean) {
    if (clean) this._progress('checkpoint', 1);
  }

  onFuelCheck(level) {
    if (level < 20) this._progress('fuel', 0, true);
  }

  _progress(type, amount, absolute = false) {
    this.shiftGoals.forEach((g) => {
      if (g.type !== type || g.done) return;
      if (absolute) g.progress = amount;
      else g.progress += amount;
      if (g.progress >= g.target) {
        g.done = true;
        g.progress = g.target;
      }
    });
  }

  /** Call at end of shift – returns rewards summary */
  settleShift(earnings, fuelLevel) {
    this.onFuelCheck(fuelLevel);
    let bonus = 0;
    let xpGain = Math.floor(this.score / 20);
    const done = [];
    this.shiftGoals.forEach((g) => {
      if (g.done) {
        bonus += g.reward;
        xpGain += g.xp;
        done.push(g.label);
      }
    });
    this.score += bonus;
    if (this.score > this.highScore) this.highScore = this.score;
    this.xp += xpGain;
    let leveled = false;
    while (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel;
      this.level += 1;
      this.xpToLevel = 400 + this.level * 120;
      leveled = true;
    }
    return { bonus, xpGain, done, leveled, level: this.level, highScore: this.highScore, score: this.score };
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.combo = 0;
    return this.lives;
  }

  useContinue() {
    if (this.continues <= 0) return false;
    this.continues -= 1;
    this.lives = 2;
    return true;
  }

  /** Buy an extra continue mid-run for cash */
  buyContinue(cash, cost = 1500) {
    if (cash < cost) return { ok: false, cost };
    this.continues += 1;
    return { ok: true, cost };
  }

  rankForScore(score) {
    if (score >= 15000) return 'S – Street Legend';
    if (score >= 8000) return 'A – Kano Ace';
    if (score >= 4000) return 'B – Solid Driver';
    if (score >= 1500) return 'C – Learning';
    return 'D – Rookie';
  }

  getHudText() {
    return this.shiftGoals
      .map((g) => {
        const mark = g.done ? '✓' : '○';
        return `${mark} ${g.label} (${Math.min(g.progress, g.target)}/${g.target})`;
      })
      .join('\n');
  }
}
