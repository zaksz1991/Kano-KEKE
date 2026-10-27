export class SaveSystem {
  static KEY = 'kano_run_save_v2';

  static saveGame(data) {
    try {
      const prev = this.loadGame();
      localStorage.setItem(this.KEY, JSON.stringify({
        cash: data.cash ?? prev.cash ?? 1500,
        savings: data.savings ?? prev.savings ?? 0,
        currentLevel: data.currentLevel ?? prev.currentLevel ?? 1,
        xp: data.xp ?? prev.xp ?? 0,
        highScore: data.highScore ?? prev.highScore ?? 0,
        unlockedDrivers: data.unlockedDrivers ?? prev.unlockedDrivers ?? ['ruffneck', 'bello'],
        unlockedKekes: data.unlockedKekes ?? prev.unlockedKekes ?? ['standard_yellow'],
        totalDrops: data.totalDrops ?? prev.totalDrops ?? 0,
        totalEarned: data.totalEarned ?? prev.totalEarned ?? 0,
        lastDailyClaim: data.lastDailyClaim ?? prev.lastDailyClaim ?? null,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  static loadGame() {
    try {
      const raw = localStorage.getItem(this.KEY) || localStorage.getItem('kano_run_save_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      cash: 1500,
      savings: 0,
      currentLevel: 1,
      xp: 0,
      highScore: 0,
      unlockedDrivers: ['ruffneck', 'bello'],
      unlockedKekes: ['standard_yellow'],
      totalDrops: 0,
      totalEarned: 0,
      lastDailyClaim: null
    };
  }
}
