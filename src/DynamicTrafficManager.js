import * as THREE from 'three';

export class DynamicTrafficManager {
  constructor(scene, kekeController) {
    this.scene = scene;
    this.playerKeke = kekeController;
    this.vehicles = [];
    this.pedestrians = [];

    this.carGeo = new THREE.BoxGeometry(1.8, 1.4, 3.8);
    this.okadaGeo = new THREE.BoxGeometry(0.6, 1.0, 1.8);
    this.trafficMat = new THREE.MeshStandardMaterial({ color: 0x336699, roughness: 0.3 });
    this.okadaMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 });

    this.spawnAmbientTraffic();
  }

  spawnAmbientTraffic() {
    for (let i = 0; i < 8; i++) {
      const isOkada = Math.random() > 0.5;
      const mesh = new THREE.Mesh(
        isOkada ? this.okadaGeo : this.carGeo,
        isOkada ? this.okadaMat : this.trafficMat
      );
      
      const laneX = (Math.random() > 0.5 ? 1 : -1) * 2.8;
      const startZ = 40 + i * 45;
      mesh.position.set(laneX, 0.7, startZ);
      mesh.castShadow = true;

      this.scene.add(mesh);
      this.vehicles.push({
        mesh,
        speed: 0.2 + Math.random() * 0.25,
        laneX,
        isOkada
      });
    }
  }

  update(delta, playerHornActive) {
    const playerZ = this.playerKeke.position.z;

    this.vehicles.forEach((v) => {
      // Vehicle movement along Z axis
      v.mesh.position.z += v.speed * 60 * delta;

      // Horn reaction: NPCs yield/swerve away when player honks
      if (playerHornActive && Math.abs(v.mesh.position.z - playerZ) < 20) {
        v.mesh.position.x = THREE.MathUtils.lerp(v.mesh.position.x, v.laneX * 1.5, 0.05);
      }

      // Recycle distant vehicles ahead of the player
      if (v.mesh.position.z < playerZ - 30) {
        v.mesh.position.z = playerZ + 200 + Math.random() * 50;
      }
    });
  }
}