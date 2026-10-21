import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  // Base 3D Scene Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Cinematic Bloom Pass for Headlights, Tail Lights, Neon Customization, & Sun Glow
  const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const bloomPass = new UnrealBloomPass(
    resolution,
    0.35,  // Strength
    0.4,   // Radius
    0.85   // Threshold
  );
  composer.addPass(bloomPass);

  return composer;
}