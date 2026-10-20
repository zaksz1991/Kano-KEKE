import * as THREE from 'three';

export class KanoLandmarkManager {
  constructor(scene) {
    this.scene = scene;
    this.landmarks = [];

    // Build Historic Landmarks
    this.createEmirPalaceGate(180);
    this.createDyePits(380);
    this.createCityWalls(580);
  }

  // 1. Kofar Kudu (Emir's Palace Gate with Hausa Architectural Mud Reliefs)
  createEmirPalaceGate(zPos) {
    const group = new THREE.Group();
    group.position.set(-8, 0, zPos);

    // Mud Brick Wall Texture Color
    const mudMat = new THREE.MeshStandardMaterial({ color: 0xc28f58, roughness: 0.9 });
    const whiteTrimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    // Main Gate Arch Pillars
    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(2.5, 7.0, 2.5), mudMat);
    pillarLeft.position.set(-3.5, 3.5, 0);

    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(2.5, 7.0, 2.5), mudMat);
    pillarRight.position.set(3.5, 3.5, 0);

    // Hausa Arch Top
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.0, 2.5), mudMat);
    archTop.position.set(0, 7.0, 0);

    // Traditional Hausa Ornamental Pinnacles (Dais)
    for (let x = -4; x <= 4; x += 2) {
      const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 4), whiteTrimMat);
      pinnacle.position.set(x, 8.6, 0);
      group.add(pinnacle);
    }

    group.add(pillarLeft);
    group.add(pillarRight);
    group.add(archTop);

    this.scene.add(group);
    this.landmarks.push({ name: "Kofar Kudu (Emir's Palace)", zPos, group });
  }

  // 2. Kofar Mata Dye Pits (Indigo Circular Dye Pits)
  createDyePits(zPos) {
    const group = new THREE.Group();
    group.position.set(10, 0, zPos);

    const pitGeo = new THREE.CylinderGeometry(1.2, 1.0, 0.4, 16);
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x223355, roughness: 0.4 }); // Indigo water color

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const pit = new THREE.Mesh(pitGeo, pitMat);
        pit.position.set(c * 2.8, 0.2, r * 2.8);
        group.add(pit);
      }
    }

    this.scene.add(group);
    this.landmarks.push({ name: "Kofar Mata Traditional Dye Pits", zPos, group });
  }

  // 3. Ancient Kano City Walls (Ganuwa Mud Wall Ramparts)
  createCityWalls(zPos) {
    const wallGeo = new THREE.BoxGeometry(1.5, 5.0, 60.0);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xb57e48, roughness: 0.95 });

    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-10, 2.5, zPos);

    this.scene.add(leftWall);
    this.landmarks.push({ name: "Ancient Kano City Wall (Ganuwa)", zPos, group: leftWall });
  }

  update(playerZ, hudCallback) {
    this.landmarks.forEach((landmark) => {
      if (Math.abs(playerZ - landmark.zPos) < 15.0 && !landmark.visited) {
        landmark.visited = true;
        if (hudCallback) {
          hudCallback(`📍 LANDMARK DISCOVERED: ${landmark.name}`);
        }
      }
    });
  }
}