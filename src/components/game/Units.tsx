import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { World } from "@/game/ecs/world";
import type { Entity } from "@/game/types";
import { AnimatedHero } from "./AnimatedHero";

function useEntitySync(w: World, e: Entity, ref: React.RefObject<THREE.Group | null>, anim?: (g: THREE.Group, t: number) => void) {
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.visible = e.visible && (e.alive || w.time - e.deathTime < 1.5 || e.kind === "tower" || e.kind === "altar");
    const k = 1 - Math.exp(-18 * dt);
    g.position.x += (e.pos.x - g.position.x) * k;
    g.position.z += (e.pos.z - g.position.z) * k;
    if (Math.abs(e.pos.x - g.position.x) > 4 || Math.abs(e.pos.z - g.position.z) > 4) g.position.set(e.pos.x, 0, e.pos.z);
    let dr = e.rot - g.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    g.rotation.y += dr * Math.min(1, dt * 12);
    anim?.(g, w.time);
  });
}

export const HeroModel = AnimatedHero;

export function TowerModel({ w, e }: { w: World; e: Entity }) {
  const ref = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const alt = e.kind === "altar";
  useEntitySync(w, e, ref, (g, t) => {
    g.rotation.y = 0;
    const cr = crystal.current;
    if (!cr) return;
    cr.visible = e.alive;
    cr.rotation.y = t * (alt ? 0.6 : 1.2);
    cr.position.y = (alt ? 4 : 5.2) + Math.sin(t * 2) * 0.15;
    g.scale.y = e.alive ? 1 : 0.35;
  });
  const col = e.team === 0 ? "#5d8fd9" : "#d9655d";
  return (
    <group ref={ref} position={[e.pos.x, 0, e.pos.z]}>
      {alt ? <>
        <mesh position-y={0.5} castShadow receiveShadow><cylinderGeometry args={[2.6, 3, 1, 8]} /><meshStandardMaterial color="#7a7468" flatShading /></mesh>
        <mesh position-y={1.6} castShadow><cylinderGeometry args={[1.6, 2.2, 1.2, 8]} /><meshStandardMaterial color="#8d867a" flatShading /></mesh>
      </> : <>
        <mesh position-y={0.4} castShadow receiveShadow><cylinderGeometry args={[1.5, 1.7, 0.8, 6]} /><meshStandardMaterial color="#6f6a60" flatShading /></mesh>
        <mesh position-y={2.3} castShadow><cylinderGeometry args={[0.8, 1.2, 3.4, 6]} /><meshStandardMaterial color="#8a8376" flatShading /></mesh>
        <mesh position-y={4.2} castShadow><cylinderGeometry args={[1.2, 0.9, 0.6, 6]} /><meshStandardMaterial color="#5c5750" flatShading /></mesh>
      </>}
      <mesh ref={crystal}>
        <octahedronGeometry args={[alt ? 1.2 : 0.6, 0]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.4} flatShading />
      </mesh>
      <pointLight position-y={alt ? 4 : 5} color={col} intensity={alt ? 30 : 12} distance={alt ? 14 : 9} />
    </group>
  );
}

export function MonsterModel({ w, e }: { w: World; e: Entity }) {
  const ref = useRef<THREE.Group>(null);
  const big = e.monster?.big ?? false;
  useEntitySync(w, e, ref, (g, t) => {
    const atk = t - e.lastAttackTime;
    g.scale.setScalar(e.alive ? 1 + (atk < 0.25 ? 0.1 : 0) : Math.max(0.01, 1 - (t - e.deathTime)));
  });
  return (
    <group ref={ref} position={[e.pos.x, 0, e.pos.z]}>
      {big ? <>
        <mesh position-y={1.4} castShadow><dodecahedronGeometry args={[1.3, 0]} /><meshStandardMaterial color="#6b6f5c" flatShading /></mesh>
        <mesh position={[0, 2.5, 0.4]}><dodecahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color="#5a5e4c" flatShading /></mesh>
        <mesh position={[0, 2.6, 0.9]}><sphereGeometry args={[0.12, 6, 6]} /><meshStandardMaterial color="#ffb347" emissive="#ff8a00" emissiveIntensity={2} /></mesh>
        <mesh position={[1.3, 1.2, 0]}><boxGeometry args={[0.6, 1.6, 0.6]} /><meshStandardMaterial color="#5a5e4c" flatShading /></mesh>
        <mesh position={[-1.3, 1.2, 0]}><boxGeometry args={[0.6, 1.6, 0.6]} /><meshStandardMaterial color="#5a5e4c" flatShading /></mesh>
      </> : <>
        <mesh position-y={0.55} rotation-x={Math.PI / 2} castShadow><capsuleGeometry args={[0.32, 0.8, 3, 6]} /><meshStandardMaterial color="#5b4e44" flatShading /></mesh>
        <mesh position={[0, 0.7, 0.6]} rotation-x={Math.PI / 2}><coneGeometry args={[0.25, 0.5, 5]} /><meshStandardMaterial color="#4a3f37" flatShading /></mesh>
      </>}
    </group>
  );
}
