import * as THREE from 'three';

export class RoadManager {
  constructor(scene) {
    this.scene = scene;
    this.chunks = [];
    this.chunkLength = 40;
    this.maxChunks = 6;
    
    this.initChunks();
  }

  initChunks() {
    for (let i = 0; i < this.maxChunks; i++) {
      const chunkGroup = this.createRoadChunk(i * this.chunkLength);
      this.chunks.push(chunkGroup);
      this.scene.add(chunkGroup);
    }
  }

  createRoadChunk(zOffset) {
    const chunk = new THREE.Group();
    chunk.position.z = zOffset;

    // Asphalt Road Surface
    const roadGeo = new THREE.PlaneGeometry(12, this.chunkLength);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    chunk.add(road);

    // Center Yellow Lines
    const lineGeo = new THREE.PlaneGeometry(0.3, 4);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    for (let z = -this.chunkLength / 2 + 2; z < this.chunkLength / 2; z += 8) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.01, z);
      chunk.add(line);
    }

    // Potholes & Pavement Details
    if (Math.random() > 0.4 && zOffset > 40) {
      const obstacleGeo = new THREE.BoxGeometry(1.5, 0.2, 1.5);
      const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
      const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
      obstacle.position.set((Math.random() - 0.5) * 6, 0.1, (Math.random() - 0.5) * 20);
      chunk.add(obstacle);
    }

    return chunk;
  }

  update(playerZ) {
    this.chunks.forEach((chunk) => {
      if (chunk.position.z + this.chunkLength < playerZ - 20) {
        const maxZ = Math.max(...this.chunks.map(c => c.position.z));
        chunk.position.z = maxZ + this.chunkLength;
      }
    });
  }
}