/**
 * All vehicle / character GLBs under public/assets/models/
 * Paths match GitHub: zaksz1991/KanoKEKE-Life/public/assets/models
 */
export const ASSET_MANIFEST = {
  player: {
    keke: '/assets/models/keke.glb'
  },
  traffic: [
    // Core
    { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.1 },
    { path: '/assets/models/okada.glb', kind: 'okada', scale: 1.0 },
    // Cars
    { path: '/assets/models/Car.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/Car-2.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/Taxi.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/SUV.glb', kind: 'van', scale: 1.05 },
    { path: '/assets/models/Sports%20Car.glb', kind: 'car', scale: 1.0 },
    { path: '/assets/models/Sports%20Car-1.glb', kind: 'car', scale: 1.0 },
    // Also try unescaped names (some hosts serve either)
    { path: '/assets/models/Sports Car.glb', kind: 'car', scale: 1.0 },
    { path: '/assets/models/Sports Car-1.glb', kind: 'car', scale: 1.0 },
    { path: '/assets/models/Police%20Car.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/Police Car.glb', kind: 'car', scale: 1.05 }
  ],
  characters: {
    pedestrian: '/assets/models/pedestrian.glb'
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
    horn: '/assets/models/horn.mp3'
  }
};
