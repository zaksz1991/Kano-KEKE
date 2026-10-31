/**
 * ONLY files that exist in public/assets/models/
 */
export const ASSET_MANIFEST = {
  player: {
    keke: '/assets/models/keke.glb'
  },
  traffic: [
    { path: '/assets/models/traffic_vehicle.glb', kind: 'car', scale: 1.15 },
    { path: '/assets/models/okada.glb', kind: 'okada', scale: 1.0 }
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
