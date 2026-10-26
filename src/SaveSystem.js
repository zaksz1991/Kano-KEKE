export class SaveSystem {
  static KEY = 'kano_run_save_v2';

  static saveGame(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        cash: data.cash ?? 1500,
        savings: data.savings ?? 0,
        currentLevel: data.currentLevel ?? 1,
        xp: data.xp ?? 0,
        highScore: data.highScore ?? 0,
        unlockedDrivers: data.unlockedDrivers ?? ['ruffneck', 'bello'],
        unlockedKekes: data.unlockedKekes ?? ['standard_yellow'],
        totalDrops: data.totalDrops ?? 0,
        totalEarned: data.totalEarned ?? 0,
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
      totalEarned: 0
    };
  }
}
