import * as THREE from 'three';

export class KekeCollisionSystem {
  constructor(kekeMesh, kekeController) {
    this.kekeMesh = kekeMesh;
    this.keke = kekeController;
    this.obstacles = [];
  }

  registerObstacle(mesh) {
    this.obstacles.push(mesh);
  }

  checkCollisions(hudCallback) {
    const kekeBox = new THREE.Box3().setFromObject(this.kekeMesh);

    this.obstacles.forEach((obstacle) => {
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);

      if (kekeBox.intersectsBox(obstacleBox)) {
        // Apply engine damage & recoil speed impact
        this.keke.currentSpeed = -this.keke.currentSpeed * 0.5;
        this.keke.engineHealth = Math.max(0, this.keke.engineHealth - 15);

        if (hudCallback) {
          hudCallback(`💥 CRASH! Hit roadblock or vehicle! Engine Health: ${Math.round(this.keke.engineHealth)}%`);
        }
      }
    });
  }
}