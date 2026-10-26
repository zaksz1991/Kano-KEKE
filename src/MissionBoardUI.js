/**
 * Pre-shift mission board on the main menu
 */
export class MissionBoardUI {
  constructor(missionManager, charSelect) {
    this.missions = missionManager;
    this.chars = charSelect;
  }

  /** Preview next shift goals on menu */
  showPreview() {
    let el = document.getElementById('mission-board-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mission-board-panel';
      el.style.cssText =
        'margin:12px 16px;padding:12px;background:rgba(0,20,30,0.85);border:1px solid rgba(0,255,255,0.35);border-radius:12px;color:#e0f7fa;font:13px/1.5 system-ui,sans-serif;';
      const menu = document.getElementById('main-menu-overlay');
      const inner = menu?.querySelector('.menu-content, .selection-panel, #main-menu-overlay > div') || menu;
      if (inner) inner.appendChild(el);
      else document.body.appendChild(el);
    }

    // Generate preview goals without starting the shift
    const preview = this.missions.startShift('preview');
    // Reset so startShift on play is fresh
    this.missions.shiftGoals = [];

    const level = this.missions.level;
    const hs = this.missions.highScore;
    el.innerHTML = `
      <div style="color:#ffcc00;font-weight:800;letter-spacing:1px;margin-bottom:6px;">📋 TODAY'S BOARD · Lv ${level}</div>
      <div style="color:#80deea;font-size:11px;margin-bottom:8px;">High score: ${hs} · Complete missions for cash + XP</div>
      ${preview
        .map(
          (g) =>
            `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="color:#ffe082;">○</span> ${g.label}
              <span style="float:right;color:#4caf50;">₦${g.reward}</span>
            </div>`
        )
        .join('')}
      <div style="margin-top:8px;font-size:11px;color:#90a4ae;">Goals re-roll when you START SHIFT</div>
    `;
  }

  hide() {
    const el = document.getElementById('mission-board-panel');
    if (el) el.style.display = 'none';
  }
}
