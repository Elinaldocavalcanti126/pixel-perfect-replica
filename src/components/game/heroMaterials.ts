import * as THREE from "three";

/** A three-band ramp keeps the original palette textures, but replaces PBR shading. */
export function createHeroRamp() {
  const ramp = new THREE.DataTexture(new Uint8Array([65, 155, 255]), 3, 1, THREE.RedFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export function toonMaterial(source: THREE.Material, ramp: THREE.DataTexture) {
  const original = source as THREE.MeshStandardMaterial;
  return new THREE.MeshToonMaterial({
    color: original.color?.clone() ?? new THREE.Color(1, 1, 1),
    map: original.map ?? null,
    gradientMap: ramp,
    vertexColors: source.vertexColors,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    side: source.side,
    emissive: original.emissive?.clone() ?? new THREE.Color(0, 0, 0),
    emissiveMap: original.emissiveMap ?? null,
    emissiveIntensity: Math.min(original.emissiveIntensity ?? 0, 0.35),
  });
}

/** Inverted hull, expanded AFTER skinning: the ink follows elbows, knees and weapons. */
export function createHeroOutline(color: THREE.Color, thickness: number) {
  return new THREE.ShaderMaterial({
    uniforms: { ink: { value: color }, thickness: { value: thickness } },
    side: THREE.BackSide,
    vertexShader: `
      #include <common>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <fog_pars_vertex>
      uniform float thickness;
      void main() {
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        transformed += normalize(objectNormal) * thickness;
        #include <project_vertex>
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 ink;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(ink, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    fog: true,
  });
}