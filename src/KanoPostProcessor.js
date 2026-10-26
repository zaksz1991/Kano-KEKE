import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Cinematic post-processing stack for Kano heat & dust feel
 */
export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Soft bloom for neon underglow + street lights + sun highlights
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,   // strength
    0.55,   // radius
    0.82    // threshold
  );
  composer.addPass(bloom);

  // Subtle vignette + warm color grade
  const vignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      offset: { value: 1.05 },
      darkness: { value: 1.15 },
      warmth: { value: 0.06 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float offset;
      uniform float darkness;
      uniform float warmth;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        vec2 uv = (vUv - 0.5) * vec2(offset);
        float vig = smoothstep(0.8, 0.25, dot(uv, uv));
        color.rgb *= vig;
        // Warm Kano grade
        color.r += warmth * 0.6;
        color.g += warmth * 0.25;
        color.b -= warmth * 0.15;
        gl_FragColor = color;
      }
    `
  };

  const vignettePass = new ShaderPass(vignetteShader);
  composer.addPass(vignettePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return composer;
}
