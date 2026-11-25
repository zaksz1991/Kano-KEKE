import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export function setupPostProcessing(renderer, scene, camera) {
  try {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.12, 0.4, 0.9
    );
    composer.addPass(bloom);

    // Lift shadows + warm grade so mobile never looks muddy
    const grade = {
      uniforms: {
        tDiffuse: { value: null },
        lift: { value: 0.08 },
        warmth: { value: 0.04 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float lift; uniform float warmth; varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          c.rgb = c.rgb * (1.0 - lift) + lift;
          c.r += warmth * 0.5; c.b -= warmth * 0.25;
          // lighter vignette (was darkening/softening edges)
          vec2 u = vUv - 0.5; float v = smoothstep(1.1, 0.35, dot(u,u));
          c.rgb *= mix(0.94, 1.0, v);
          gl_FragColor = c;
        }`
    };
    composer.addPass(new ShaderPass(grade));
    return composer;
  } catch (e) {
    console.warn('Post FX fallback', e);
    return {
      render: () => renderer.render(scene, camera),
      setSize: (w, h) => renderer.setSize(w, h)
    };
  }
}
