import * as THREE from 'three';

export class CoinPickupManager {
  constructor(scene, kekeController) {
    this.scene = scene;
    this.keke = kekeController;
    this.coins = [];

    this.coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16);
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });

    this.spawnCoinsAlongRoad();
  }

  spawnCoinsAlongRoad() {
    for (let z = 30; z < 800; z += 25) {
      const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
      const laneX = (Math.random() - 0.5) * 5.0; // Lane offset
      coin.position.set(laneX, 0.6, z);
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;

      this.scene.add(coin);
      this.coins.push({ mesh: coin, value: 50, collected: false });
    }
  }

  update(delta, passengerManager, hudCallback) {
    const kekePos = this.keke.position;

    this.coins.forEach((coin) => {
      if (coin.collected) return;

      // Rotate Coin continuously
      coin.mesh.rotation.z += delta * 3.0;

      // Distance Check for Collision
      const distance = kekePos.distanceTo(coin.mesh.position);
      if (distance < 1.8) {
        coin.collected = true;
        this.scene.remove(coin.mesh);
        passengerManager.dailyEarnings += coin.value;

        if (hudCallback) {
          hudCallback({ type: 'COIN_COLLECTED', value: coin.value, total: passengerManager.dailyEarnings });
        }
      }
    });
  }
}