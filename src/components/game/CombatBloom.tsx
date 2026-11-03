import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/** Only HDR effect cores pass the threshold; ordinary toon surfaces stay crisp. */
export function CombatBloom() {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const safe = new ShaderPass({
      glslVersion: THREE.GLSL3,
      uniforms: { tDiffuse: { value: null } },
      vertexShader: "out vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "uniform sampler2D tDiffuse; in vec2 vUv; out vec4 outColor; void main(){vec4 c=texture(tDiffuse,vUv); uvec4 bits=floatBitsToUint(c); bvec4 bad=equal(bits & uvec4(0x7f800000u),uvec4(0x7f800000u)); outColor=clamp(mix(c,vec4(0.0),bad),0.0,16.0);}",
    });
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.48, 0.38, 1.25);
    const output = new OutputPass();
    composer.addPass(render); composer.addPass(safe); composer.addPass(bloom); composer.addPass(output);
    return { composer, safe, bloom, output };
  }, [gl, scene, camera]);
  useEffect(() => {
    pipeline.composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.25));
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, gl, size.width, size.height]);
  useEffect(() => () => {
    pipeline.composer.dispose(); pipeline.safe.dispose(); pipeline.bloom.dispose(); pipeline.output.dispose();
  }, [pipeline]);
  useFrame((_, dt) => { pipeline.composer.render(Math.min(dt, 0.05)); }, 1);
  return null;
}