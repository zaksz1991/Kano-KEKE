import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

/**
 * Full passenger system per Kano Run / Adaidaita Sahu spec
 * – Visible roadside people (pedestrian.glb)
 * – Flag down, destinations, negotiation, Akwai drop-off
 * – Varied Hausa titles (not only Aboki)
 */

const TITLES = {
  male: ['Oga', 'Mai Gida', 'Mallam', 'Yallabai', 'Dan uwa', 'Aboki', 'Driver', 'Baba', 'Alhaji', 'Bro'],
  female: ['Mama', 'Hajiya', 'Malama', 'Sis', 'Madam', 'Aunty']
};

const DESTINATIONS = [
  'Sabon Gari', 'Kofar Mata', 'Fagge', 'Farm Centre', 'Hotoro',
  'Zoo Road', 'Naibawa', 'Tarauni', 'Dala', 'Kantin Kwari',
  'Kofar Wambai', 'Panshekara', 'Kumbotso', 'Gwale', 'Sharada',
  "Emir's Palace", 'Kurmi Market', 'Bompai', 'Yankaba', 'Kabuga',
  'BUK Road', 'Murtala Muhammed Way', 'Gyadi-Gyadi'
];

export class PassengerManager {
  constructor(scene, kekeController, assetManager) {
    this.scene = scene;
    this.keke = kekeController;
    this.assets = assetManager;
    this.pedModel = null;
    this.waiting = [];
    this.onBoard = [];
    this.capacity = 3;
    this.dailyEarnings = 1500;
    this.combo = 0;
    this.score = 0;
    this.maxWaiting = 8;
    this._spawnTimer = 0;
    this.nearestPrompt = null;
    this.negotiating = null;
    this._negTimer = 0;
  }

  async initModels() {
    // DISABLED – no pedestrian.glb download (keeps start fast)
    this.pedModel = null;
    return;
    try {
      this.pedModel = await this.assets.loadGLB(
        ASSET_MANIFEST.characters.pedestrian || '/assets/models/pedestrian.glb',
        { scale: 1.25 }
      );
      if (this.pedModel) {
        this.pedModel.traverse((n) => {
          if (!n.isMesh || !n.material) return;
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach((m) => {
            if (!m) return;
            if (m.map) {
              try {
                m.map.colorSpace = THREE.SRGBColorSpace;
              } catch (e) {}
            }
            if (m.emissive) {
              m.emissive.setHex(0x222222);
              m.emissiveIntensity = 0.25;
            }
            m.needsUpdate = true;
          });
        });
        console.log('[Passengers] pedestrian.glb ready');
      }
    } catch (e) {
      console.warn('[Passengers] load fail', e);
      this.pedModel = null;
    }
  }

  _makePerson() {
    const g = new THREE.Group();
    if (this.pedModel) {
      const mesh = this.pedModel.clone(true);
      mesh.scale.setScalar(1.3 + Math.random() * 0.25);
      g.add(mesh);
    } else {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 1.4, 8),
        new THREE.MeshStandardMaterial({
          color: 0x5d4037,
          emissive: 0x333333,
          emissiveIntensity: 0.3
        })
      );
      body.position.y = 0.9;
      g.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xd7ccc8, emissive: 0x222222, emissiveIntensity: 0.2 })
      );
      head.position.y = 1.75;
      g.add(head);
    }
    // Green pickup pad marker (kano-run style)
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00e676,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.05;
    g.add(pad);
    g.userData.pad = pad;

    // Yellow hail flag
    const flag = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.55, 4),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b })
    );
    flag.position.y = 2.6;
    g.add(flag);
    g.userData.flag = flag;
    return g;
  }

  _randomPassenger() {
    const female = Math.random() > 0.5;
    const titles = female ? TITLES.female : TITLES.male;
    const title = titles[Math.floor(Math.random() * titles.length)];
    const dest = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    const seats = Math.random() > 0.85 ? 2 : 1;
    const baseFare = 180 + Math.floor(Math.random() * 420) + (seats > 1 ? 150 : 0);
    // Mood affects negotiation
    const mood = Math.random(); // 0 stubborn … 1 generous
    return {
      title,
      gender: female ? 'female' : 'male',
      destination: dest,
      seats,
      baseFare,
      offerFare: baseFare,
      agreedFare: null,
      mood,
      state: 'waiting',
      mesh: null,
      flagPhase: Math.random() * Math.PI * 2,
      dropAtZ: null,
      tripDist: 90 + Math.random() * 130
    };
  }

  _spawnWaiter(playerZ) {
    if (this.waiting.length >= this.maxWaiting) return;
    const p = this._randomPassenger();
    const mesh = this._makePerson();
    const px = this.keke.group.position.x;
    const side = px >= 0 ? (Math.random() > 0.3 ? 1 : -1) : Math.random() > 0.3 ? -1 : 1;
    mesh.position.set(side * (9.5 + Math.random() * 1.5), 0, playerZ + 30 + Math.random() * 100);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    p.mesh = mesh;
    this.waiting.push(p);
  }

  _startNegotiate(p, hudCallback) {
    this.negotiating = p;
    this._negTimer = 0;
    p.state = 'negotiating';
    // Opening offer: passenger asks lower sometimes
    const ask = Math.round(p.baseFare * (0.75 + p.mood * 0.2));
    p.offerFare = ask;
    if (hudCallback) {
      hudCallback({
        type: 'NEGOTIATE',
        msg: `${p.title}: "${p.destination} — ₦${ask}?" (SLOW to accept · drive off to skip)`
      });
    }
  }

  _acceptNegotiate(p, hudCallback) {
    // Driver bonus applied by caller via capacity; fare bump by mood
    const finalFare = Math.round(p.offerFare * (1 + p.mood * 0.15));
    p.agreedFare = finalFare;
    p.state = 'boarded';
    p.dropAtZ = this.keke.group.position.z + p.tripDist;
    this.onBoard.push(p);
    this.waiting = this.waiting.filter((w) => w !== p);
    this.negotiating = null;
    if (p.mesh) {
      try {
        this.scene.remove(p.mesh);
      } catch (e) {}
      p.mesh = null;
    }
    if (hudCallback) {
      hudCallback({
        type: 'BOARD',
        msg: `${p.title} boarded → ${p.destination} · ₦${finalFare}`,
        earnings: this.dailyEarnings
      });
    }
  }

  update(delta, hudCallback) {
    const dt = Math.min(delta, 0.05);
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;
    this.nearestPrompt = null;

    this._spawnTimer += dt;
    if (this._spawnTimer > 2.2) {
      this._spawnTimer = 0;
      this._spawnWaiter(playerZ);
    }

    // Animate flags / pads
    this.waiting.forEach((p) => {
      if (!p.mesh) return;
      p.flagPhase = (p.flagPhase || 0) + dt * 4;
      if (p.mesh.userData.flag) {
        p.mesh.userData.flag.position.y = 2.5 + Math.sin(p.flagPhase) * 0.18;
      }
      if (p.mesh.userData.pad) {
        p.mesh.userData.pad.scale.setScalar(1 + Math.sin(p.flagPhase * 0.7) * 0.08);
      }
      const dist = Math.abs(p.mesh.position.z - playerZ);
      p.mesh.visible = dist < 160;
    });

    // Negotiation in progress
    if (this.negotiating) {
      this._negTimer += dt;
      const p = this.negotiating;
      const dist = p.mesh ? p.mesh.position.distanceTo(this.keke.group.position) : 99;
      if (speed < 5 && dist < 14) {
        // Accept by staying slow nearby
        if (this.onBoard.length + p.seats <= this.capacity) {
          this._acceptNegotiate(p, hudCallback);
        } else if (hudCallback && this._negTimer > 1) {
          hudCallback({ type: 'NOTICE', msg: 'Keke full — no more seats' });
          p.state = 'waiting';
          this.negotiating = null;
        }
      } else if (dist > 22 || this._negTimer > 12) {
        // Walk away / skip
        p.state = 'waiting';
        this.negotiating = null;
        if (hudCallback) hudCallback({ type: 'NOTICE', msg: `${p.title} waved someone else` });
      }
      return;
    }

    // Approach waiting passengers
    for (const p of this.waiting) {
      if (!p.mesh || p.state !== 'waiting') continue;
      const dist = p.mesh.position.distanceTo(this.keke.group.position);
      if (dist < 14 && speed < 10) {
        if (this.onBoard.length + p.seats <= this.capacity) {
          this._startNegotiate(p, hudCallback);
          break;
        }
      } else if (dist < 18 && speed < 12) {
        this.nearestPrompt = `${p.title} · ${p.destination} · ~₦${p.baseFare}`;
      }
    }

    // Drop-offs — Akwai
    for (const p of [...this.onBoard]) {
      if (p.dropAtZ == null) continue;
      const dz = p.dropAtZ - playerZ;
      if (dz < 40 && dz > 0) {
        if (hudCallback) {
          hudCallback({
            type: 'AKWAI',
            msg: `🛑 Akwai! ${p.title} — ${p.destination}. SLOW DOWN`
          });
        }
      }
      if (playerZ >= p.dropAtZ - 8 && speed < 8) {
        const pay = p.agreedFare || p.baseFare;
        this.dailyEarnings += pay;
        this.combo += 1;
        this.score += pay + this.combo * 12;
        this.onBoard = this.onBoard.filter((x) => x !== p);
        if (hudCallback) {
          hudCallback({
            type: 'DROPOFF',
            earnings: this.dailyEarnings,
            msg: `Dropped ${p.title} at ${p.destination} · +₦${pay} · Combo x${this.combo}`
          });
        }
      } else if (playerZ > p.dropAtZ + 50) {
        // Missed drop — partial pay, reset combo
        this.combo = 0;
        this.onBoard = this.onBoard.filter((x) => x !== p);
        if (hudCallback) {
          hudCallback({
            type: 'NOTICE',
            msg: `${p.title} got angry — missed ${p.destination}`
          });
        }
      }
    }

    // Cleanup far waiters
    this.waiting = this.waiting.filter((p) => {
      if (!p.mesh) return false;
      if (p.mesh.position.z < playerZ - 50) {
        try {
          this.scene.remove(p.mesh);
        } catch (e) {}
        return false;
      }
      return true;
    });
  }

  getHudStatus() {
    if (this.negotiating) {
      const p = this.negotiating;
      return `Negotiate: ${p.title} ₦${p.offerFare} → ${p.destination}`;
    }
    if (this.onBoard.length) {
      const p = this.onBoard[0];
      return `On board: ${p.title} → ${p.destination}`;
    }
    return this.nearestPrompt;
  }
}
