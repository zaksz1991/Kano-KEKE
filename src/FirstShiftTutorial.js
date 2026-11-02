/**
 * One-time first shift tutorial – Adaidaita Sahu basics
 */
export class FirstShiftTutorial {
  static KEY = 'kano_tutorial_v1';

  constructor() {
    this.done = localStorage.getItem(FirstShiftTutorial.KEY) === '1';
    this.step = 0;
    this.steps = [
      { id: 'accel', text: 'Hold ACCEL to move forward' },
      { id: 'steer', text: 'Use ◀ ▶ to steer on the dual road' },
      { id: 'pickup', text: 'Slow near green pads to pick up passengers' },
      { id: 'negotiate', text: 'Stay slow to accept their fare offer' },
      { id: 'drop', text: 'When they say Akwai — brake to drop them' },
      { id: 'fuel', text: 'Yellow canopy = PMS — slow to refuel' },
      { id: 'done', text: "You're ready. Drive safe in Kano!" }
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
        'position:fixed;bottom:210px;left:50%;transform:translateX(-50%);z-index:90;max-width:92vw;background:rgba(0,20,40,0.92);border:1px solid #00e5ff;border-radius:12px;padding:10px 14px;color:#e0f7fa;font:13px system-ui;text-align:center;pointer-events:none;';
      document.body.appendChild(el);
      this.root = el;
    }
    const s = this.steps[this.step];
    if (!s) return;
    this.root.style.display = 'block';
    this.root.innerHTML = `💡 ${s.text}<div style="font-size:10px;color:#80deea;margin-top:4px;">Step ${this.step + 1}/${this.steps.length}</div>`;
  }

  _advance() {
    this.step += 1;
    if (this.step >= this.steps.length - 1) {
      this.step = this.steps.length - 1;
      this._show();
      setTimeout(() => this.finish(), 2800);
      return;
    }
    this._show();
  }

  finish() {
    this.done = true;
    localStorage.setItem(FirstShiftTutorial.KEY, '1');
    if (this.root) this.root.style.display = 'none';
  }

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
    if (this.step === 2 || this.step === 3) this._advance();
  }

  onDrop() {
    if (this.done) return;
    this._dropped = true;
    if (this.step === 4) this._advance();
  }

  onRefuel() {
    if (this.done) return;
    if (this.step === 5) this._advance();
  }
}
