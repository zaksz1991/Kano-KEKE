import * as THREE from 'three';

/**
 * Stylized low-poly meshes – never crude single boxes
 * Used until/alongside GLBs for mobile-friendly density
 */
export function makePerson(rand = Math.random) {
  const g = new THREE.Group();
  const skin = 0xd7ccc8;
  const clothes = [0x1565c0, 0xc62828, 0x2e7d32, 0x6a1b9a, 0xef6c00, 0x00838f, 0x5d4037, 0xffffff];
  const shirt = clothes[Math.floor(rand() * clothes.length)];
  const pants = [0x1a237e, 0x212121, 0x4e342e][Math.floor(rand() * 3)];

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.55, 6),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 })
  );
  torso.position.y = 1.05;
  g.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 6, 5),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 })
  );
  head.position.y = 1.48;
  g.add(head);

  // Simple legs
  for (const x of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.55, 5),
      new THREE.MeshStandardMaterial({ color: pants, roughness: 0.85 })
    );
    leg.position.set(x, 0.4, 0);
    g.add(leg);
  }
  // Arms
  for (const x of [-0.28, 0.28]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.45, 5),
      new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 })
    );
    arm.position.set(x, 1.05, 0);
    arm.rotation.z = x > 0 ? -0.3 : 0.3;
    g.add(arm);
  }
  g.scale.setScalar(0.95 + rand() * 0.15);
  return g;
}

export function makeCar(rand = Math.random) {
  const g = new THREE.Group();
  const cols = [0xe53935, 0x1e88e5, 0xfafafa, 0x43a047, 0xffb300, 0x37474f, 0x6d4c41];
  const bodyCol = cols[Math.floor(rand() * cols.length)];

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.5, 3.8),
    new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.4, metalness: 0.25 })
  );
  body.position.y = 0.5;
  g.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.55, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.35, metalness: 0.3 })
  );
  cabin.position.set(0, 0.95, -0.15);
  g.add(cabin);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.4, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.4, roughness: 0.2 })
  );
  glass.position.set(0, 1.0, -0.1);
  g.add(glass);

  const wMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
  for (const [x, z] of [[-0.72, 1.15], [0.72, 1.15], [-0.72, -1.15], [0.72, -1.15]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8), wMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.3, z);
    g.add(w);
  }
  // lights
  for (const x of [-0.45, 0.45]) {
    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.12, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xffe082, emissiveIntensity: 0.4 })
    );
    hl.position.set(x, 0.5, 1.9);
    g.add(hl);
  }
  return g;
}

export function makeOkada(rand = Math.random) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.55, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x00acc1, roughness: 0.4, metalness: 0.25 })
  );
  body.position.y = 0.65;
  g.add(body);
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.45, 6),
    new THREE.MeshStandardMaterial({ color: 0x00838f })
  );
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 0.9, 0.15);
  g.add(tank);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const z of [0.5, -0.5]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 8), wMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(0, 0.26, z);
    g.add(w);
  }
  const rider = makePerson(rand);
  rider.scale.setScalar(0.75);
  rider.position.set(0, 0.15, -0.05);
  g.add(rider);
  return g;
}

export function makeBus(rand = Math.random) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 2.0, 6.5),
    new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.55 })
  );
  body.position.y = 1.15;
  g.add(body);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.22, 6.55),
    new THREE.MeshStandardMaterial({ color: 0xc62828 })
  );
  stripe.position.y = 1.4;
  g.add(stripe);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-0.9, 2], [0.9, 2], [-0.9, -2], [0.9, -2]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), wMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.35, z);
    g.add(w);
  }
  return g;
}
