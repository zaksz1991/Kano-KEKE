import { SaveSystem } from './SaveSystem.js';

/**
 * Local high-score board (top 5 shifts on this device)
 */
export class HighScoreBoard {
  static KEY = 'kano_run_scores_v1';

  static load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  static submit(entry) {
    const list = this.load();
    list.push({
      score: entry.score || 0,
      cash: entry.cash || 0,
      driver: entry.driver || 'RuffNeck',
      route: entry.route || 'Kano',
      date: Date.now()
    });
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, 5);
    try {
      localStorage.setItem(this.KEY, JSON.stringify(top));
    } catch (e) {}
    return top;
  }

  static renderOnMenu() {
    let el = document.getElementById('highscore-board');
    if (!el) {
      el = document.createElement('div');
      el.id = 'highscore-board';
      el.style.cssText =
        'margin:10px 16px;padding:10px 12px;background:rgba(0,0,0,0.7);border:1px solid rgba(255,204,0,0.35);border-radius:10px;color:#eee;font:12px/1.45 system-ui;max-width:320px;';
      const menu = document.getElementById('main-menu-overlay');
      const board = document.getElementById('mission-board-panel');
      if (board && board.parentNode) board.parentNode.insertBefore(el, board.nextSibling);
      else if (menu) menu.appendChild(el);
      else return;
    }
    const list = this.load();
    if (!list.length) {
      el.innerHTML =
        '<div style="color:#ffcc00;font-weight:800;">🏆 HIGH SCORES</div><div style="color:#888;margin-top:4px;">No shifts recorded yet — go drive!</div>';
      return;
    }
    el.innerHTML =
      '<div style="color:#ffcc00;font-weight:800;margin-bottom:6px;">🏆 HIGH SCORES</div>' +
      list
        .map(
          (s, i) =>
            `<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.06);padding:3px 0;">
              <span style="color:#90caf9;">#${i + 1} ${s.driver}</span>
              <span style="color:#ffcc00;font-weight:700;">${s.score}</span>
            </div>`
        )
        .join('');
  }
}
