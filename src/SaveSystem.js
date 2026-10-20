export class SaveSystem {
  static saveGame(data) {
    localStorage.setItem('kano_run_save_v1', JSON.stringify(data));
  }

  static loadGame() {
    const saved = localStorage.getItem('kano_run_save_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse save data:", e);
      }
    }
    // Default initial commercial profile
    return {
      cash: 1500,
      savings: 0,
      currentLevel: 1,
      unlockedDrivers: ['bello'],
      unlockedKekes: ['standard_yellow']
    };
  }
}