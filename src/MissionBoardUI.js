/**
 * Pre-shift mission board – goals, level, unlocks preview
 */
export class MissionBoardUI {
  constructor(missionManager, charSelect) {
    this.missions = missionManager;
    this.chars = charSelect;
  }

  showPreview() {
    let el = document.getElementById('mission-board-panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mission-board-panel';
      el.style.cssText =
        'margin:12px 16px;padding:12px;background:rgba(0,20,30,0.9);border:1px solid rgba(255,204,0,0.4);border-radius:12px;color:#e0f7fa;font:13px/1.5 system-ui,sans-serif;';
      const menu = document.getElementById('main-menu-overlay');
      if (menu) {
        const buttons = menu.querySelector('.menu-buttons');
        if (buttons) menu.insertBefore(el, buttons);
        else menu.appendChild(el);
      } else {
        document.body.appendChild(el);
      }
    }
    el.style.display = 'block';

    const preview = this.missions.startShift('preview');
    this.missions.shiftGoals = [];

    const level = this.missions.level;
    const hs = this.missions.highScore;
    const xp = this.missions.xp;
    const xpTo = this.missions.xpToLevel;

    // Next unlocks
    const nextDrivers = (this.chars?.drivers || [])
      .filter((d) => !d.unlocked)
      .slice(0, 2)
      .map((d) => `🔒 ${d.name} Lv${d.levelReq}`)
      .join(' · ');
    const nextKekes = (this.chars?.kekes || [])
      .filter((k) => !k.unlocked)
      .slice(0, 2)
      .map((k) => `🔒 ${k.name} Lv${k.levelReq}`)
      .join(' · ');

    el.innerHTML = `
      <div style="color:#ffcc00;font-weight:800;letter-spacing:1px;margin-bottom:6px;">📋 TODAY'S BOARD · Level ${level}</div>
      <div style="color:#80deea;font-size:11px;margin-bottom:4px;">XP ${xp}/${xpTo} · High score ${hs}</div>
      <div style="height:6px;background:#222;border-radius:3px;margin-bottom:10px;overflow:hidden;">
        <div style="height:100%;width:${Math.min(100, (xp / Math.max(1, xpTo)) * 100)}%;background:linear-gradient(90deg,#ffcc00,#ff9800);"></div>
      </div>
      ${preview
        .map(
          (g) =>
            `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="color:#ffe082;">○</span> ${g.label}
              <span style="float:right;color:#4caf50;">+₦${g.reward} · ${g.xp}XP</span>
            </div>`
        )
        .join('')}
      <div style="margin-top:10px;font-size:11px;color:#90a4ae;">
        ${nextDrivers ? `<div>Next drivers: ${nextDrivers}</div>` : ''}
        ${nextKekes ? `<div>Next kekes: ${nextKekes}</div>` : ''}
        <div style="margin-top:4px;">Goals re-roll when you START SHIFT</div>
      </div>
    `;
  }

  hide() {
    const el = document.getElementById('mission-board-panel');
    if (el) el.style.display = 'none';
  }
}
