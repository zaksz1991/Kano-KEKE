/**
 * One-time first shift tutorial steps
 */
export class FirstShiftTutorial {
  static KEY = 'kano_tutorial_v1';

  constructor() {
    this.done = localStorage.getItem(FirstShiftTutorial.KEY) === '1';
    this.step = 0;
    this.steps = [
      { id: 'accel', text: 'Hold ACCEL to move forward' },
      { id: 'steer', text: 'Use ◀ ▶ to steer around traffic' },
      { id: 'pickup', text: 'Slow near roadside people to pick up passengers' },
      { id: 'drop', text: 'When they say Akwai — brake to drop them off' },
      { id: 'done', text: 'You\'re ready. Drive safe in Kano!' }
    ];
    this.root = null;
    this._picked = false;
    this._dropped = false;
  }

  start() {
    if (this.done) return;
    this.step = 0;
    this._show();
  }

  _show() {
    if (!this.root) {
      const el = document.createElement('div');
      el.id = 'first-tutorial';
      el.style.cssText =
        'position:fixed;bottom:210px;left:50%;transform:translateX(-50%);z-index:90;max-width:90vw;background:rgba(0,20,40,0.9);border:1px solid #00e5ff;border-radius:12px;padding:10px 14px;color:#e0f7fa;font:13px system-ui;text-align:center;pointer-events:none;';
      document.body.appendChild(el);
      this.root = el;
    }
    const s = this.steps[this.step];
    if (!s) return;
    this.root.style.display = 'block';
    this.root.textContent = `💡 ${s.text}`;
  }

  /** Advance based on gameplay events */
  onSpeed(speed) {
    if (this.done) return;
    if (this.step === 0 && speed > 3) this._advance();
  }

  onSteer(steer) {
    if (this.done) return;
    if (this.step === 1 && Math.abs(steer) > 0.4) this._advance();
  }

  onBoard() {
    if (this.done) return;
    this._picked = true;
    if (this.step === 2) this._advance();
  }

  onDrop() {
    if (this.done) return;
    this._dropped = true;
    if (this.step === 3) this._advance();
  }

  _advance() {
    this.step += 1;
    if (this.step >= this.steps.length - 1) {
      this._show();
      setTimeout(() => this.finish(), 2500);
    } else {
      this._show();
    }
  }

  finish() {
    this.done = true;
    localStorage.setItem(FirstShiftTutorial.KEY, '1');
    if (this.root) {
      this.root.style.display = 'none';
    }
  }
}
