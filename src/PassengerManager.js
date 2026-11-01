import * as THREE from 'three';
import { ASSET_MANIFEST } from './AssetManifest.js';

const TITLES = {
  female: ['Hajiya', 'Malama', 'Sis', 'Madam'],
  male: ['Alhaji', 'Malam', 'Bro', 'Oga']
};
const DESTINATIONS = [
  'Sabon Gari', 'Kofar Ruwa', 'Zoo Road', 'Naibawa', 'Hotoro',
  'Gyadi-Gyadi', 'BUK Road', 'Murtala', 'Kofar Mata', 'Kurmi Market'
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
  }

  async initModels() {
    if (!this.assets) return;
    try {
      this.pedModel = await this.assets.loadGLB(
        ASSET_MANIFEST.characters.pedestrian || '/assets/models/pedestrian.glb',
        { scale: 1.2 }
      );
      if (this.pedModel) {
        this.pedModel.traverse((n) => {
          if (n.isMesh && n.material) {
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m) => {
              if (!m) return;
              if (m.map) {
                try { m.map.colorSpace = THREE.SRGBColorSpace; } catch (e) {}
              }
              // Night visibility
              if (m.emissive) {
                m.emissive.setHex(0x222222);
                m.emissiveIntensity = 0.25;
              }
              m.needsUpdate = true;
            });
          }
        });
        console.log('[Passengers] pedestrian.glb ready');
      } else {
        console.warn('[Passengers] pedestrian.glb failed');
      }
    } catch (e) {
      this.pedModel = null;
      console.warn('[Passengers] load error', e);
    }
  }

  _makePerson() {
    const g = new THREE.Group();
    if (this.pedModel) {
      const mesh = this.pedModel.clone(true);
      mesh.scale.setScalar(1.35 + Math.random() * 0.2);
      g.add(mesh);
    } else {
      // Only if GLB missing – simple body so players still see someone
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 1.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x5d4037, emissive: 0x333333, emissiveIntensity: 0.3 })
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
    // Yellow hail marker (always)
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
    const female = Math.random() > 0.55;
    const titles = female ? TITLES.female : TITLES.male;
    return {
      title: titles[Math.floor(Math.random() * titles.length)],
      gender: female ? 'female' : 'male',
      destination: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)],
      seats: Math.random() > 0.82 ? 2 : 1,
      baseFare: 200 + Math.floor(Math.random() * 400),
      agreedFare: null,
      state: 'waiting',
      mesh: null,
      flagPhase: Math.random() * Math.PI * 2,
      dropAtZ: null
    };
  }

  _spawnWaiter(playerZ) {
    if (this.waiting.length >= this.maxWaiting) return;
    const p = this._randomPassenger();
    const mesh = this._makePerson();
    const px = this.keke.group.position.x;
    const side = px >= 0 ? (Math.random() > 0.25 ? 1 : -1) : (Math.random() > 0.25 ? -1 : 1);
    mesh.position.set(side * (9.5 + Math.random() * 1.5), 0, playerZ + 25 + Math.random() * 90);
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    this.scene.add(mesh);
    p.mesh = mesh;
    this.waiting.push(p);
  }

  update(delta, hudCallback) {
    const dt = Math.min(delta, 0.05);
    const playerZ = this.keke.group.position.z;
    const speed = this.keke.currentSpeed || 0;

    this._spawnTimer += dt;
    if (this._spawnTimer > 2.0) {
      this._spawnTimer = 0;
      this._spawnWaiter(playerZ);
    }

    this.waiting.forEach((p) => {
      if (p.mesh?.userData?.flag) {
        p.flagPhase = (p.flagPhase || 0) + dt * 4;
        p.mesh.userData.flag.position.y = 2.5 + Math.sin(p.flagPhase) * 0.18;
      }
      if (p.mesh) {
        const dist = Math.abs(p.mesh.position.z - playerZ);
        p.mesh.visible = dist < 160;
      }
    });

    // Auto board
    for (const p of [...this.waiting]) {
      if (!p.mesh || p.state !== 'waiting') continue;
      const dist = p.mesh.position.distanceTo(this.keke.group.position);
      if (dist < 12 && speed < 9 && this.onBoard.length + p.seats <= this.capacity) {
        p.state = 'boarded';
        p.agreedFare = p.baseFare;
        p.dropAtZ = playerZ + 80 + Math.random() * 120;
        this.onBoard.push(p);
        this.waiting = this.waiting.filter((w) => w !== p);
        try {
          this.scene.remove(p.mesh);
        } catch (e) {}
        p.mesh = null;
        if (hudCallback) {
          hudCallback({
            type: 'BOARD',
            msg: `${p.title} boarded → ${p.destination} · ₦${p.agreedFare}`,
            earnings: this.dailyEarnings
          });
        }
      } else if (dist < 16 && speed < 10 && hudCallback) {
        this.nearestPrompt = `${p.title} · ₦${p.baseFare} → ${p.destination}`;
      }
    }

    // Drop
    for (const p of [...this.onBoard]) {
      if (p.dropAtZ != null && playerZ >= p.dropAtZ - 35) {
        if (hudCallback) {
          hudCallback({
            type: 'NOTICE',
            msg: `🛑 Akwai! ${p.title} wants out → ${p.destination} (SLOW DOWN)`
          });
        }
        if (playerZ >= p.dropAtZ - 5 && speed < 8) {
          const pay = p.agreedFare || p.baseFare;
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
      }
    }

    // Clean far waiters
    this.waiting = this.waiting.filter((p) => {
      if (!p.mesh) return false;
      if (p.mesh.position.z < playerZ - 40) {
        try {
          this.scene.remove(p.mesh);
        } catch (e) {}
        return false;
      }
      return true;
    });
  }

  getHudStatus() {
    if (this.onBoard.length) {
      const p = this.onBoard[0];
      return `On board: ${p.title} → ${p.destination}`;
    }
    return this.nearestPrompt;
  }
}
