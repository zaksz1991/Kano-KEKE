/**
 * Paths match GitHub: zaksz1991/Kano-KEKE/public/assets/models
 * Updated filenames (police_car, car_2, sports_car, traffic_vehicle (2))
 */
export const ASSET_MANIFEST = {
  player: {
    keke: '/assets/models/keke.glb'
  },
  traffic: [
    // Priority Kano mix
    { path: '/assets/models/keke.glb', kind: 'keke', scale: 0.95 },
    { path: '/assets/models/okada.glb', kind: 'okada', scale: 2.4 },
    { path: '/assets/models/Mitsubishi_L200.glb', kind: 'car', scale: 2.8 },
    { path: '/assets/models/Car.glb', kind: 'car', scale: 2.6 },
    { path: '/assets/models/car_2.glb', kind: 'car', scale: 2.6 },
    { path: '/assets/models/Taxi.glb', kind: 'car', scale: 2.6 },
    { path: '/assets/models/SUV.glb', kind: 'car', scale: 2.5 },
    { path: '/assets/models/police_car.glb', kind: 'car', scale: 2.6 },
    { path: '/assets/models/sports_car.glb', kind: 'car', scale: 2.4 },
    { path: '/assets/models/sports_car2.glb', kind: 'car', scale: 2.4 },
    // Space in filename — encode for fetch
    { path: '/assets/models/traffic_vehicle%20(2).glb', kind: 'car', scale: 2.6 },
    { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 2.6 }
  ],
  characters: {
    pedestrian: '/assets/models/pedestrian.glb',
    womenHijab: '/assets/models/women_in_hijab.glb'
  },
  environment: {
    roadTile: '/assets/models/environment/road_tile.glb',
    roadDiffuse: '/assets/models/textures/road_diffuse.jpg'
  },
  landmarks: [
    { path: '/assets/models/landmarks/palace_gate.glb', name: "Gidan Rumfa – Emir's Palace Gate", z: 180, x: -12 },
    { path: '/assets/models/landmarks/dye_pits.glb', name: 'Kofar Mata Dye Pits', z: 420, x: 14 },
    { path: '/assets/models/landmarks/city_walls.glb', name: 'Ancient Kano City Walls', z: 680, x: -16 },
    { path: '/assets/models/landmarks/wheels.glb', name: 'Kurmi Market Wheels', z: 950, x: 12 }
  ],
  audio: {
    engine: '/assets/models/audio/engine.mp3',
    horn: '/assets/models/audio/horn.mp3'
  }
};
