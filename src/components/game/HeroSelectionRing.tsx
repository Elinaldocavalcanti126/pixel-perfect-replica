import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Entity } from "@/game/types";

/** One transparent ground decal, no texture request and no extra lights. */
export function HeroSelectionRing({ e, color }: { e: Entity; color: THREE.Color }) {
  const mesh = useRef<THREE.Mesh>(null);
  const reducedMotion = useRef(false);
  const time = useMemo(() => ({ value: 0 }), []);
  const material = useMemo(() => new THREE.ShaderMaterial({
    // UniformsUtils clones values; reinsert live references after the fog merge.
    uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), tint: { value: color }, time },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    vertexShader: `
      varying vec2 runeUv;
      #include <fog_pars_vertex>
      void main() {
        runeUv = uv * 2.0 - 1.0;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      varying vec2 runeUv;
      uniform vec3 tint;
      uniform float time;
      #include <fog_pars_fragment>
      float stroke(float d, float width) {
        return 1.0 - smoothstep(width, width + max(fwidth(d), 0.002), abs(d));
      }
      void main() {
        float radius = length(runeUv);
        float angle = atan(runeUv.y, runeUv.x);
        float outer = stroke(radius - 0.85, 0.009);
        float inner = stroke(radius - 0.61, 0.006);
        float segments = stroke(radius - 0.91, 0.007) * step(0.3, sin(angle * 4.0 - time * 0.25));
        float sector = 6.2831853 / 12.0;
        float a = mod(angle + time * 0.08 + sector * 0.5, sector) - sector * 0.5;
        vec2 glyph = vec2(a * 0.73, radius - 0.73);
        float diamond = stroke(abs(glyph.x) + abs(glyph.y) - 0.045, 0.007);
        float stem = stroke(glyph.x, 0.005) * (1.0 - step(0.078, abs(glyph.y)));
        float runes = max(diamond, stem);
        float halo = exp(-abs(radius - 0.85) * 65.0) * 0.16;
        float alpha = max(max(outer, inner) * 0.78, max(segments, runes) * 0.9) + halo;
        alpha *= 0.88 + sin(time * 1.8) * 0.12;
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(tint, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  }), [color, time]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotion.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => { media.removeEventListener("change", update); material.dispose(); };
  }, [material]);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.visible = e.alive && e.visible;
    if (!reducedMotion.current) time.value += Math.min(delta, 0.05);
  });
  return <mesh ref={mesh} name="player-runic-ring" rotation-x={-Math.PI / 2} position-y={0.055} renderOrder={1} material={material}>
    <planeGeometry args={[3.2, 3.2]} />
  </mesh>;
}