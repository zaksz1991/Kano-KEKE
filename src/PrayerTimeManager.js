export class PrayerTimeManager {
  constructor(driverState) {
    this.driverState = driverState;
    
    // Kano Prayer Times (in minutes from midnight)
    // Fajr (5:00 AM), Dhuhr (1:30 PM), Asr (4:45 PM), Maghrib (6:30 PM), Isha (8:00 PM)
    this.prayers = [
      { name: 'Fajr', time: 300, duration: 20, active: false },
      { name: 'Dhuhr', time: 810, duration: 20, active: false },
      { name: 'Asr', time: 1005, duration: 20, active: false },
      { name: 'Maghrib', time: 1110, duration: 25, active: false },
      { name: 'Isha', time: 1200, duration: 20, active: false }
    ];

    this.activePrayer = null;
  }

  update(timeInMinutes, hudCallback) {
    this.prayers.forEach((prayer) => {
      const endTime = prayer.time + prayer.duration;

      // Check if prayer window has started
      if (timeInMinutes >= prayer.time && timeInMinutes < endTime) {
        if (!prayer.active) {
          prayer.active = true;
          this.activePrayer = prayer.name;

          if (hudCallback) {
            hudCallback({
              type: 'ADHAN_START',
              msg: `🕌 Allahu Akbar... Call to Prayer (${prayer.name}) echoing across Kano. Traffic slows down.`
            });
          }
        }
      } 
      // Check if prayer window has ended
      else {
        if (prayer.active && timeInMinutes >= endTime) {
          prayer.active = false;
          this.activePrayer = null;

          if (hudCallback) {
            hudCallback({
              type: 'ADHAN_END',
              msg: `🕌 Prayer concluded. Street hustle and traffic resumes.`
            });
          }
        }
      }
    });
  }

  // If player stops at a Mosque during prayer time
  performPrayer(hudCallback) {
    if (this.activePrayer) {
      this.driverState.stamina = 100;
      this.driverState.stressLevel = 0;
      if (hudCallback) {
        hudCallback('🕌 Performed prayer at the mosque. Stamina fully restored, stress cleared!');
      }
    } else {
      if (hudCallback) {
        hudCallback('🕌 It is not currently prayer time, but you can rest here briefly.');
      }
    }
  }
}