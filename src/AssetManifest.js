/**
 * Single source of truth for project GLB / audio paths
 * Drop new files in these folders and list them here.
 */
export const ASSET_MANIFEST = {
  player: {
    keke: '/assets/models/keke.glb'
  },
  traffic: [
    { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.1 },
    { path: '/assets/models/okada.glb', kind: 'okada', scale: 1.0 },
    { path: '/assets/models/traffic/car_01.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/traffic/car_02.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/traffic/car_03.glb', kind: 'car', scale: 1.05 },
    { path: '/assets/models/traffic/bus.glb', kind: 'bus', scale: 1.0 },
    { path: '/assets/models/traffic/van.glb', kind: 'van', scale: 1.0 },
    { path: '/assets/models/traffic/okada_02.glb', kind: 'okada', scale: 1.0 },
    { path: '/assets/models/traffic_bus.glb', kind: 'bus', scale: 1.0 },
    { path: '/assets/models/traffic_van.glb', kind: 'van', scale: 1.0 }
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
    horn: '/assets/models/audio/horn.mp3'
  }
};
