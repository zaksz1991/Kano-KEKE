import * as THREE from 'three';
import { makePerson } from './LowPolyLibrary.js';

/**
 * Full passenger life-sim system:
 * roadside waiters, flagging, negotiation, boarding, drop-off ("Akwai"), fares
 */
const DESTINATIONS = [
  'Sabon Gari', 'Kofar Mata', 'Fagge', 'Farm Centre', 'Hotoro', 'Zoo Road',
  'Naibawa', 'Tarauni', 'Dala', 'Kantin Kwari', 'Kofar Wambai', 'Bata',
  'Kofar Nassarawa', 'GWG', 'Sharada', 'BUK Road', 'Unguwa Uku', 'Yankaba'
];

const TITLES = {
  male: ['Oga', 'Mai Gida', 'Mallam', 'Yallabai', 'Dan uwa', 'Driver', 'Baba', 'Aboki'],
  female: ['Mama', 'Hajiya', 'Aunty', 'Madam', 'Yaya']
};

const NEGOTIATION_LINES = [
  { ask: (d, f) => `Zuwa ${d} nawa?`, counter: (f) => `₦${f} only.`, accept: 'Toh, shiga.' },
  { ask: (d, f) => `Driver, ${d} — nawa ne?`, counter: (f) => `Standard ₦${f}.`, accept: 'Ok, let\'s go.' },
  { ask: (d, f) => `Oga driver, ${d}?`, counter: (f) => `₦${Math.round(f * 1.15)}. Traffic yafi.`, accept: 'Kai, toh.' },
  { ask: (d, f) => `Mallam, ina zuwa ${d}.`, counter: (f) => `₦${f} daidai.`, accept: 'Na yarda.' },
  { ask: (d, f) => `${d} — ka rage!`, counter: (f) => `Last ₦${Math.round(f * 0.9)}.`, accept: 'Toh, shiga.' }
];

export class PassengerManager {
  constructor(scene, kekeController, assetManager = null) {
    this.scene = scene;
    this.keke = kekeController;
    this.assets = assetManager;
    this.pedModel = null;

    this.dailyEarnings = 1500;
    this.fareMultiplier = 1.0;
    this.capacity = 3;
    this.onBoard = [];
    this.waiting = [];
    this.maxWaiting = 10;

    this.combo = 0;
    this.score = 0;
    this.negotiationBonus = 1.0;
    this.tipBonus = 1.0;

    this._spawnTimer = 0;
    this._dialogue = null;
    this._dialogueT = 0;
    this.nearestPrompt = null;
  }

  async initModels() {
    if (!this.assets) return;
    try {
      this.pedModel = await this.assets.loadGLB('/assets/models/pedestrian.glb', {
        scale: 1.0,
        castShadow: true
      });
    } catch (e) {
      this.pedModel = null;
    }
  }

  _makePerson(isWaiting = true) {
    if (this.pedModel) {
      const mesh = this.pedModel.clone(true);
      mesh.scale.setScalar(0.9 + Math.random() * 0.2);
      return mesh;
    }
    const mesh = makePerson();
    if (isWaiting) {
      // Raise arm for flagging
      mesh.traverse((n) => {
        if (n.isMesh && n.position.x > 0.2) {
          n.rotation.z = -0.9;
          n.name = 'flagArm';
        }
      });
    }
    return mesh;
  }

  _randomPassenger() {
    const female = Math.random() > 0.55;
    const titles = female ? TITLES.female : TITLES.male;
    const title = titles[Math.floor(Math.random() * titles.length)];
    const dest = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    const seats = Math.random() > 0.82 ? 2 : 1;
    const baseFare = 150 + Math.floor(Math.random() * 350) + (seats > 1 ? 100 : 0);
    return {
      title,
      gender: female ? 'female' : 'male',
      destination: dest,
      seats,
      baseFare,
      agreedFare: null,
      state: 'waiting', // waiting | negotiating | boarded | dropping
      mesh: null,
      flagPhase: Math.random() * Math.PI * 2,
      patience: 20 + Math.random() * 40,
      dropAtZ: null
    };
  }

  _spawnWaiter(playerZ) {
    if (this.waiting.length >= this.maxWaiting) return;
    const p = this._randomPassenger();
    const mesh = this._makePerson(true);
    const side = Math.random() > 0.5 ? 1 : -1;
    mesh.position.set(side * (7.8 + Math.random() * 1.5), 0, playerZ + 40 + Math.random() * 120);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    p.mesh = mesh;
    this.waiting.push(p);
  }

  update(delta, hudCallback) {
    const dt = Math.min(delta, 0.05);
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;

    // Spawn waiters
    this._spawnTimer += dt;
    if (this._spawnTimer > 3.5) {
      this._spawnTimer = 0;
      this._spawnWaiter(playerZ);
    }

    // Animate flagging
    this.waiting.forEach((p) => {
      if (!p.mesh) return;
      p.flagPhase += dt * 5;
      const arm = p.mesh.getObjectByName?.('flagArm');
      if (arm) arm.rotation.z = -0.7 - Math.abs(Math.sin(p.flagPhase)) * 0.6;
      // bob
      p.mesh.position.y = Math.abs(Math.sin(p.flagPhase * 0.5)) * 0.03;
      p.patience -= dt;

      // Auto-remove far/patient expired
      if (p.mesh.position.z < playerZ - 30 || p.patience <= 0) {
        this.scene.remove(p.mesh);
        p.mesh = null;
      }
    });
    this.waiting = this.waiting.filter((p) => p.mesh);

    // Nearest waiter prompt
    this.nearestPrompt = null;
    let best = 12;
    for (const p of this.waiting) {
      if (!p.mesh || p.state !== 'waiting') continue;
      const dist = p.mesh.position.distanceTo(this.keke.group.position);
      if (dist < best) {
        best = dist;
        this.nearestPrompt = { dist, title: p.title, dest: p.destination, seats: p.seats };
      }
    }
    if (this.nearestPrompt && this.nearestPrompt.dist < 11 && hudCallback && speed > 5) {
      // Only occasional prompt when speeding past
      if (!this._lastProx || performance.now() - this._lastProx > 3500) {
        this._lastProx = performance.now();
        hudCallback({
          type: 'NEAR',
          msg: `👋 ${this.nearestPrompt.title} going to ${this.nearestPrompt.dest} — slow down to pick up`
        });
      }
    }

    // Pickup opportunity – slow near waiter
    if (this.onBoard.length < this.capacity && speed < 4.5) {
      for (const p of this.waiting) {
        if (!p.mesh) continue;
        const dist = p.mesh.position.distanceTo(this.keke.group.position);
        if (dist < 6.5 && p.state === 'waiting') {
          this._startNegotiation(p, hudCallback);
          break;
        }
      }
    }

    // Active negotiation timeout
    if (this._dialogue) {
      this._dialogueT -= dt;
      if (this._dialogueT <= 0 && this._dialogue.passenger.state === 'negotiating') {
        // Auto-accept if still close
        this._acceptPassenger(this._dialogue.passenger, this._dialogue.fare, hudCallback);
      }
    }

    // Boarded passengers – schedule drop-off
    this.onBoard.forEach((p) => {
      if (p.dropAtZ === null) {
        p.dropAtZ = playerZ + 60 + Math.random() * 100;
      }
      // Request drop when near
      if (p.state === 'boarded' && playerZ >= p.dropAtZ - 15) {
        p.state = 'dropping';
        if (hudCallback) {
          hudCallback({
            type: 'DROP_REQUEST',
            msg: `${p.title}: Akwai! Ina so in sauka — ${p.destination}.`
          });
        }
      }
    });

    // Complete drop-off when stopped near drop point
    if (speed < 3) {
      const dropping = this.onBoard.filter((p) => p.state === 'dropping');
      dropping.forEach((p) => {
        if (Math.abs(playerZ - p.dropAtZ) < 12) {
          this._completeDropoff(p, hudCallback);
        }
      });
    }
  }

  _startNegotiation(p, hudCallback) {
    p.state = 'negotiating';
    const line = NEGOTIATION_LINES[Math.floor(Math.random() * NEGOTIATION_LINES.length)];
    let fare = Math.round(p.baseFare * this.fareMultiplier * this.negotiationBonus);
    // Random haggle outcome
    const roll = Math.random();
    if (roll > 0.7) fare = Math.round(fare * 1.2);
    else if (roll < 0.25) fare = Math.round(fare * 0.85);

    const ask = `${p.title}: ${line.ask(p.destination, fare)}`;
    const counter = `Kai: ${line.counter(fare)}`;
    if (hudCallback) {
      hudCallback({ type: 'NEGOTIATE', msg: `${ask}  |  ${counter}` });
    }
    this._dialogue = { passenger: p, fare, acceptLine: line.accept };
    this._dialogueT = 2.8;
  }

  _acceptPassenger(p, fare, hudCallback) {
    if (this.onBoard.length + p.seats > this.capacity) {
      if (hudCallback) hudCallback({ type: 'FULL', msg: 'Keke is full!' });
      p.state = 'waiting';
      this._dialogue = null;
      return;
    }
    p.agreedFare = fare;
    p.state = 'boarded';
    this.onBoard.push(p);
    this.waiting = this.waiting.filter((w) => w !== p);
    if (p.mesh) {
      this.scene.remove(p.mesh);
      p.mesh = null;
    }
    this._dialogue = null;
    if (hudCallback) {
      hudCallback({
        type: 'BOARD',
        msg: `${p.title}: ${this._dialogue?.acceptLine || 'Toh, shiga.'} → ${p.destination} (₦${fare})`
      });
    }
  }

  _completeDropoff(p, hudCallback) {
    let pay = p.agreedFare || p.baseFare;
    // Tip chance
    if (Math.random() < 0.25 * this.tipBonus) {
      const tip = Math.round(pay * (0.1 + Math.random() * 0.2));
      pay += tip;
      if (hudCallback) hudCallback({ type: 'TIP', msg: `${p.title} tipped ₦${tip}!` });
    }
    this.dailyEarnings += pay;
    this.combo += 1;
    this.score += pay + this.combo * 10;
    this.onBoard = this.onBoard.filter((x) => x !== p);
    if (hudCallback) {
      hudCallback({
        type: 'DROPOFF',
        earnings: this.dailyEarnings,
        msg: `Dropped at ${p.destination} · +₦${pay} · Combo x${this.combo}`
      });
    }
  }

  /** Manual accept during negotiation (optional key) */
  acceptDeal(hudCallback) {
    if (this._dialogue && this._dialogue.passenger.state === 'negotiating') {
      this._acceptPassenger(this._dialogue.passenger, this._dialogue.fare, hudCallback);
    }
  }
}
