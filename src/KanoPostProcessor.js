import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  // 1. Base Render Pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Unreal Bloom Pass (Makes neon underglow & street highlights glow)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,    // Bloom Strength
    0.4,    // Bloom Radius
    0.8     // Bloom Threshold (Only bright pixels bloom)
  );
  composer.addPass(bloomPass);

  // 3. Output Pass (Corrects color space & gamma)
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return composer;
}