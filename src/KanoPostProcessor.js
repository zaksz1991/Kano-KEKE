import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Cinematic post-processing – safe fallback to raw renderer if anything fails
 */
export function setupPostProcessing(renderer, scene, camera) {
  try {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.32,
      0.5,
      0.85
    );
    composer.addPass(bloom);

    const vignetteShader = {
      uniforms: {
        tDiffuse: { value: null },
        offset: { value: 1.05 },
        darkness: { value: 1.12 },
        warmth: { value: 0.05 }
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
        uniform float warmth;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - 0.5) * vec2(offset);
          float vig = smoothstep(0.85, 0.2, dot(uv, uv));
          color.rgb *= vig;
          color.r += warmth * 0.5;
          color.g += warmth * 0.2;
          color.b -= warmth * 0.12;
          gl_FragColor = color;
        }
      `
    };
    composer.addPass(new ShaderPass(vignetteShader));

    return composer;
  } catch (e) {
    console.warn('[PostProcess] Falling back to raw renderer', e);
    // Fake composer so main loop keeps working
    return {
      render: () => renderer.render(scene, camera),
      setSize: (w, h) => renderer.setSize(w, h)
    };
  }
}
