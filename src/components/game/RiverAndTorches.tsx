import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COLS, ROWS, cellCenter, walkable } from "@/game/map/map";
import { inRiver, riverCenter, riverWidth, TORCH_SPOTS } from "./terrainDetails";
import { useTerrainPalette } from "./terrainPalette";

export function RiverAndTorches() {
  const colors = useTerrainPalette();
  const water = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [], uv: number[] = [], indices: number[] = [];
    for (let i = 0; i <= 84; i++) {
      const z = i - 42, x = riverCenter(z);
      positions.push(x - riverWidth, 0.025, z, x + riverWidth, 0.025, z);
      uv.push(0, i / 84, 1, i / 84);
      if (i < 84) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, waterColor: { value: new THREE.Color() }, foamColor: { value: new THREE.Color() } }]),
      vertexShader: `uniform float time; varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vEye;
        #include <fog_pars_vertex>
        void main(){vUv=uv; vec3 p=position; p.y+=sin(p.z*2.5+time*1.3)*0.012; vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;
        vNormal=normalize(vec3(0.06*cos(p.x*3.0+time),1.0,0.12*cos(p.z*2.5+time*1.3)));vEye=cameraPosition-world.xyz;
        vec4 mvPosition=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float time; uniform vec3 waterColor; uniform vec3 foamColor; varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vEye;
        #include <fog_pars_fragment>
        void main(){float edge=smoothstep(0.35,0.49,abs(vUv.x-0.5));float wave=sin(vWorld.z*4.0+sin(vWorld.x*3.0+time)*1.5-time*1.7);
        float ripple=smoothstep(0.86,1.0,wave);vec3 n=normalize(vNormal); vec3 view=normalize(vEye);float fresnel=pow(1.0-clamp(dot(n,view),0.0,1.0),3.0);
        vec3 reflected=reflect(-view,n);float glint=pow(max(dot(reflected,normalize(vec3(0.5,1.0,0.3))),0.0),28.0);
        vec3 color=mix(waterColor,foamColor,fresnel*0.35+edge*0.3+ripple*0.09)+foamColor*glint*0.4;
        gl_FragColor=vec4(color,0.62+edge*0.15);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        }`,
    });
    return { geometry, material };
  }, []);
  const fords = useMemo(() => {
    const list: { x: number; z: number }[] = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const p = cellCenter(col, row);
      if (walkable[row * COLS + col] && inRiver(p.x, p.z)) list.push(p);
    }
    return list;
  }, []);
  const ford = useRef<THREE.InstancedMesh>(null), posts = useRef<THREE.InstancedMesh>(null), bowls = useRef<THREE.InstancedMesh>(null), flames = useRef<THREE.InstancedMesh>(null), embers = useRef<THREE.InstancedMesh>(null);
  const math = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);
  useEffect(() => {
    const { m, p, q, s } = math;
    fords.forEach((v, i) => { m.compose(p.set(v.x, 0.065, v.z), q.identity(), s.set(0.96, 0.1, 0.96)); ford.current?.setMatrixAt(i, m); });
    TORCH_SPOTS.forEach(([x, z], i) => {
      m.compose(p.set(x, 0.65, z), q.identity(), s.set(1, 1, 1)); posts.current?.setMatrixAt(i, m);
      m.compose(p.set(x, 1.35, z), q, s.set(1, 1, 1)); bowls.current?.setMatrixAt(i, m);
    });
    [ford.current, posts.current, bowls.current].forEach((mesh) => { if (mesh) mesh.instanceMatrix.needsUpdate = true; });
  }, [math, fords]);
  useEffect(() => () => { water.geometry.dispose(); water.material.dispose(); }, [water]);
  useFrame(({ clock, gl }) => {
    const time = clock.elapsedTime;
    const t = water.material.uniforms["time"]; if (t) t.value = time;
    water.material.uniforms["waterColor"]?.value.copy(colors["water"]);
    water.material.uniforms["foamColor"]?.value.copy(colors["foam"]);
    const { m, p, q, s } = math;
    TORCH_SPOTS.forEach(([x, z], i) => {
      const flicker = 1 + Math.sin(time * 11 + i * 7) * 0.13;
      m.compose(p.set(x + Math.sin(time * 8 + i) * 0.04, 1.63, z), q.identity(), s.set(0.23 * flicker, 0.55 * flicker, 0.23));
      flames.current?.setMatrixAt(i, m);
      for (let k = 0; k < 3; k++) {
        const age = (time * 0.5 + k / 3 + i * 0.13) % 1;
        m.compose(p.set(x + Math.sin(age * 6 + i) * age * 0.35, 1.8 + age * 1.4, z + Math.cos(age * 6 + i) * age * 0.25), q, s.setScalar(0.04 * (1 - age)));
        embers.current?.setMatrixAt(i * 3 + k, m);
      }
    });
    [flames.current, embers.current].forEach((mesh) => { if (mesh) mesh.instanceMatrix.needsUpdate = true; });
    if (import.meta.env.DEV) gl.domElement.dataset["terrainAnimated"] = String(time.toFixed(2));
  });
  return <group name="river-and-torches">
    <mesh geometry={water.geometry} material={water.material} dispose={null} />
    <instancedMesh ref={ford} args={[undefined, undefined, fords.length]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={colors["stone"]} roughness={0.9} flatShading />
    </instancedMesh>
    <instancedMesh ref={posts} args={[undefined, undefined, TORCH_SPOTS.length]}>
      <cylinderGeometry args={[0.12, 0.2, 1.3, 6]} /><meshStandardMaterial color={colors["stone"]} roughness={0.85} />
    </instancedMesh>
    <instancedMesh ref={bowls} args={[undefined, undefined, TORCH_SPOTS.length]}>
      <cylinderGeometry args={[0.34, 0.16, 0.22, 8]} /><meshStandardMaterial color={colors["bark"]} metalness={0.5} roughness={0.6} />
    </instancedMesh>
    <instancedMesh ref={flames} args={[undefined, undefined, TORCH_SPOTS.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 7, 5]} /><meshBasicMaterial color={colors["flame"]} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={embers} args={[undefined, undefined, TORCH_SPOTS.length * 3]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} /><meshBasicMaterial color={colors["ember"]} toneMapped={false} />
    </instancedMesh>
  </group>;
}