/**
 * Kano prayer times – banners, pace effects, muezzin moment
 * Approximate fixed times for a playable day cycle
 */
export class PrayerTimeManager {
  constructor(driverState = {}) {
    this.stamina = driverState.stamina ?? 100;
    this.stressLevel = driverState.stressLevel ?? 0;
    this.lastAnnounced = null;
    this.activePrayer = null;
    this.prayerSlowUntil = 0;

    // Minutes from midnight
    this.schedule = [
      { name: 'Fajr', min: 5 * 60 + 10, msg: '🕌 Fajr — quiet streets. Drive gentle.' },
      { name: 'Zuhr', min: 12 * 60 + 30, msg: '🕌 Zuhr — many heading to mosque. Watch junctions.' },
      { name: 'Asr', min: 15 * 60 + 45, msg: '🕌 Asr — afternoon prayer. Traffic eases near mosques.' },
      { name: 'Maghrib', min: 18 * 60 + 25, msg: '🕌 Maghrib — sunset prayer. Lights coming on.' },
      { name: 'Isha', min: 19 * 60 + 50, msg: '🕌 Isha — night prayer. Street calm.' }
    ];
  }

  update(timeInMinutes, hudCallback) {
    const t = Math.floor(timeInMinutes) % 1440;

    for (const p of this.schedule) {
      // Announce in a 2-minute window
      if (t >= p.min && t < p.min + 2 && this.lastAnnounced !== p.name) {
        this.lastAnnounced = p.name;
        this.activePrayer = p.name;
        this.prayerSlowUntil = performance.now() + 20000; // 20s softer pace
        if (hudCallback) hudCallback({ msg: p.msg, type: 'PRAYER', name: p.name });
      }
    }

    // Clear active after window
    if (this.activePrayer) {
      const cur = this.schedule.find((x) => x.name === this.activePrayer);
      if (cur && (t < cur.min || t > cur.min + 8)) {
        this.activePrayer = null;
      }
    }
  }

  /** Soft speed cap during prayer window */
  getSpeedMultiplier() {
    if (performance.now() < this.prayerSlowUntil) return 0.72;
    return 1.0;
  }

  isPrayerActive() {
    return !!this.activePrayer;
  }
}
