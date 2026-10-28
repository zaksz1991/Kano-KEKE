export class SaveSystem {
  static KEY = 'kano_run_save_v2';

  static saveGame(data) {
    try {
      const prev = this.loadGame();
      const next = {
        cash: data.cash ?? prev.cash ?? 1500,
        savings: data.savings ?? prev.savings ?? 0,
        currentLevel: data.currentLevel ?? prev.currentLevel ?? 1,
        xp: data.xp ?? prev.xp ?? 0,
        highScore: data.highScore ?? prev.highScore ?? 0,
        unlockedDrivers: data.unlockedDrivers ?? prev.unlockedDrivers ?? ['ruffneck', 'bello'],
        unlockedKekes: data.unlockedKekes ?? prev.unlockedKekes ?? ['standard_yellow'],
        totalDrops: data.totalDrops ?? prev.totalDrops ?? 0,
        totalEarned: data.totalEarned ?? prev.totalEarned ?? 0,
        lastDailyClaim: data.lastDailyClaim !== undefined ? data.lastDailyClaim : (prev.lastDailyClaim ?? null),
        updatedAt: Date.now()
      };
      localStorage.setItem(this.KEY, JSON.stringify(next));
      return next;
    } catch (e) {
      console.warn('Save failed', e);
      return null;
    }
  }

  static loadGame() {
    try {
      const raw = localStorage.getItem(this.KEY) || localStorage.getItem('kano_run_save_v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lastDailyClaim == null && data.updatedAt) {
          // keep null
        }
        return data;
      }
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
