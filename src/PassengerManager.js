import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

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
    this.maxWaiting = 8;

    this.combo = 0;
    this.score = 0;
    this.negotiationBonus = 1.0;
    this.tipBonus = 1.0;

    this._spawnTimer = 0;
    this._dialogue = null;
    this._dialogueT = 0;
    this._autoAcceptT = 0;
    this.nearestPrompt = null;
  }

  async initModels() {
    if (!this.assets) return;
    try {
      this.pedModel = await this.assets.loadGLB(ASSET_MANIFEST.characters.pedestrian || '/assets/models/pedestrian.glb', {
        scale: 1.0,
        castShadow: true
      });
    } catch (e) {
      this.pedModel = null;
    }
  }

  _makePerson(isWaiting = true) {
    if (!this.pedModel) return null;
    const mesh = this.pedModel.clone(true);
    mesh.scale.setScalar(1.15 + Math.random() * 0.2);
    return mesh;
  }

  _randomPassenger() {
    const female = Math.random() > 0.55;
    const titles = female ? TITLES.female : TITLES.male;
    const title = titles[Math.floor(Math.random() * titles.length)];
    const dest = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    const seats = Math.random() > 0.82 ? 2 : 1;
    const baseFare = 200 + Math.floor(Math.random() * 400) + (seats > 1 ? 120 : 0);
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
    if (!mesh) return;
    const px = this.keke.group.position.x;
    const side = px >= 0 ? (Math.random() > 0.25 ? 1 : -1) : (Math.random() > 0.25 ? -1 : 1);
    mesh.position.set(side * (9.5 + Math.random() * 1.5), 0, playerZ + 25 + Math.random() * 90);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    // Yellow hail marker (visible at distance)
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b })
    );
    flag.position.y = 2.4;
    mesh.add(flag);
    p.flagMesh = flag;
    p.mesh = mesh;
    this.waiting.push(p);
  }

  update(delta, hudCallback) {
    const dt = Math.min(delta, 0.05);
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;

    // Spawn waiters
    this._spawnTimer += dt;
    if (this._spawnTimer > 2.2) {
      this._spawnTimer = 0;
      this._spawnWaiter(playerZ);
    }

    // Animate flagging
    this.waiting.forEach((p) => {
      if (p.flagMesh) {
        p.flagPhase = (p.flagPhase || 0) + dt * 4;
        p.flagMesh.position.y = 2.3 + Math.sin(p.flagPhase) * 0.15;
      }
      if (!p.mesh) return;
      p.flagPhase += dt * 5;
      const arm = p.mesh.getObjectByName?.('flagArm');
      if (arm) arm.rotation.z = -0.7 - Math.abs(Math.sin(p.flagPhase)) * 0.6;
      // bob
      const near = p.mesh.position.distanceTo(this.keke.group.position) < 14;
      p.mesh.position.y = Math.abs(Math.sin(p.flagPhase * (near ? 1.2 : 0.5))) * (near ? 0.12 : 0.03);
      // Pulse scale when close
      if (near) {
        const s = 0.95 + Math.abs(Math.sin(p.flagPhase)) * 0.12;
        p.mesh.scale.setScalar(s);
      }
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
    if (!this._dialogue && this.onBoard.length < this.capacity && speed < 9) {
      for (const p of this.waiting) {
        if (!p.mesh || p.state !== 'waiting') continue;
        if (this.onBoard.length + p.seats > this.capacity) continue;
        const dist = p.mesh.position.distanceTo(this.keke.group.position);
        if (dist < 12) {
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
      if (p.state === 'boarded' && playerZ >= p.dropAtZ - 35) {
        p.state = 'dropping';
        if (hudCallback) {
          hudCallback({
            type: 'DROP_REQUEST',
            msg: `🛑 Akwai! ${p.title} wants out → ${p.destination} (SLOW DOWN)`
          });
        }
      }
    });

    
    // Auto-accept deal on mobile if player stays near during negotiation
    if (this._dialogue && this._dialogue.passenger) {
      this._autoAcceptT = (this._autoAcceptT || 0) + (typeof dt !== "undefined" ? dt : delta);
      const p = this._dialogue.passenger;
      if (p.mesh && p.mesh.position.distanceTo(this.keke.group.position) < 11 && this._autoAcceptT > 1.1) {
        this.acceptDeal(hudCallback);
        this._autoAcceptT = 0;
      }
    } else {
      this._autoAcceptT = 0;
    }

    // Complete drop-off when slowed near drop point
    if (speed < 9) {
      const dropping = this.onBoard.filter((p) => p.state === 'dropping');
      dropping.forEach((p) => {
        const dz = Math.abs(playerZ - p.dropAtZ);
        if (dz < 28) {
          // Perfect drop = almost stopped + close to mark
          p._perfectDrop = speed < 2.8 && dz < 10;
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
    // Perfect drop bonus
    if (p._perfectDrop) {
      const bonus = Math.round(pay * 0.25) + 50;
      pay += bonus;
      if (hudCallback) {
        hudCallback({ type: 'PERFECT_DROP', msg: `✨ Perfect drop! +₦${bonus}` });
      }
    }
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
  getHudStatus() {
    const dropping = this.onBoard.find((p) => p.state === 'dropping');
    if (dropping) {
      return `Akwai → ${dropping.destination} (slow to drop)`;
    }
    if (this._dialogue?.passenger) {
      return `Boarding ${this._dialogue.passenger.title}…`;
    }
    if (this.nearestPrompt && this.nearestPrompt.dist < 12) {
      return `👋 ${this.nearestPrompt.title} → ${this.nearestPrompt.dest}`;
    }
    if (this.onBoard.length) {
      return `On board ${this.onBoard.length}/${this.capacity}`;
    }
    return `Seats ${this.onBoard.length}/${this.capacity} · look for roadside`;
  }

  acceptDeal(hudCallback) {
    if (this._dialogue && this._dialogue.passenger.state === 'negotiating') {
      this._acceptPassenger(this._dialogue.passenger, this._dialogue.fare, hudCallback);
    }
  }
}
