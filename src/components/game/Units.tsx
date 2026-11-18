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
  const col = e.team === 0 ? "#69a8ff" : "#ff7567";
  const stone = "#686b70";
  const darkStone = "#393e46";
  const gold = "#d4b56f";
  return (
    <group ref={ref} position={[e.pos.x, 0, e.pos.z]}>
      {alt ? <>
        <mesh position-y={0.3} castShadow receiveShadow><cylinderGeometry args={[3.2, 3.7, 0.6, 10]} /><meshStandardMaterial color={darkStone} flatShading /></mesh>
        <mesh position-y={0.72} rotation-x={Math.PI / 2}><torusGeometry args={[3.15, 0.16, 6, 10]} /><meshStandardMaterial color={gold} metalness={0.45} roughness={0.4} /></mesh>
        <mesh position-y={0.95} castShadow><cylinderGeometry args={[2.6, 3.1, 0.65, 8]} /><meshStandardMaterial color={stone} flatShading /></mesh>
        <mesh position-y={1.42} castShadow><cylinderGeometry args={[1.9, 2.55, 0.8, 8]} /><meshStandardMaterial color="#85817a" flatShading /></mesh>
        <mesh position-y={1.87} rotation-x={Math.PI / 2}><torusGeometry args={[2.18, 0.12, 6, 8]} /><meshStandardMaterial color={gold} metalness={0.45} roughness={0.4} /></mesh>
        {Array.from({ length: 4 }, (_, i) => {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const x = Math.cos(angle) * 2.5;
          const z = Math.sin(angle) * 2.5;
          return <group key={i} position={[x, 1.15, z]} rotation-y={-angle}>
            <mesh position-y={0.75} castShadow><boxGeometry args={[0.5, 1.8, 0.5]} /><meshStandardMaterial color={darkStone} flatShading /></mesh>
            <mesh position-y={1.78} castShadow><coneGeometry args={[0.42, 0.85, 5]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.7} flatShading /></mesh>
          </group>;
        })}
        <mesh position-y={1.9} castShadow><cylinderGeometry args={[1.4, 1.9, 0.65, 8]} /><meshStandardMaterial color="#a59c87" flatShading /></mesh>
      </> : <>
        <mesh position-y={0.4} castShadow receiveShadow><cylinderGeometry args={[1.65, 1.95, 0.8, 8]} /><meshStandardMaterial color={darkStone} flatShading /></mesh>
        <mesh position-y={0.86} rotation-x={Math.PI / 2}><torusGeometry args={[1.58, 0.13, 6, 8]} /><meshStandardMaterial color={gold} metalness={0.4} roughness={0.45} /></mesh>
        <mesh position-y={2.25} castShadow><cylinderGeometry args={[0.82, 1.32, 2.9, 7]} /><meshStandardMaterial color={stone} flatShading /></mesh>
        <mesh position-y={3.45} rotation-x={Math.PI / 2}><torusGeometry args={[0.96, 0.12, 6, 7]} /><meshStandardMaterial color={gold} metalness={0.4} roughness={0.45} /></mesh>
        <mesh position-y={3.95} castShadow><cylinderGeometry args={[1.34, 1.08, 0.55, 7]} /><meshStandardMaterial color={darkStone} flatShading /></mesh>
        {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 1.05, 4.45, Math.sin(i * Math.PI / 3) * 1.05]} rotation-y={-i * Math.PI / 3} castShadow>
          <boxGeometry args={[0.32, 0.78, 0.42]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.45} flatShading />
        </mesh>)}
      </>}
      <mesh ref={crystal}>
        <octahedronGeometry args={alt ? [1.45, 0] : [0.78, 0]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={alt ? 2.2 : 1.8} metalness={0.25} roughness={0.28} flatShading />
      </mesh>
      {alt && <mesh position-y={0.12} rotation-x={Math.PI / 2}>
        <torusGeometry args={[4.2, 0.08, 5, 32]} />
        <meshBasicMaterial color={col} transparent opacity={0.68} />
      </mesh>}
      <pointLight position-y={alt ? 4 : 5} color={col} intensity={alt ? 34 : 8} distance={alt ? 18 : 7} />
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
  const core = e.team === 0 ? "#df9b47" : "#7de0bb";
  return (
    <group ref={ref} position={[e.pos.x, 0, e.pos.z]}>
      {big ? <>
        <mesh position-y={1.42} scale={[1.15, 1.25, 0.92]} castShadow><dodecahedronGeometry args={[1.3, 0]} /><meshStandardMaterial color="#667366" flatShading roughness={0.94} /></mesh>
        <mesh position={[0, 2.48, 0.48]} scale={[0.9, 0.76, 0.78]} castShadow><dodecahedronGeometry args={[0.68, 0]} /><meshStandardMaterial color="#788477" flatShading /></mesh>
        <mesh position={[0, 2.85, 0.9]} castShadow><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color={core} emissive={core} emissiveIntensity={1.8} flatShading /></mesh>
        {[-1, 1].map((side) => <group key={side} position={[side * 0.32, 2.48, 1.08]}>
          <mesh position-y={0.04}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#fff0c2" emissive={core} emissiveIntensity={1.5} /></mesh>
          <mesh position={[side * 0.13, 0.28, -0.05]} rotation-z={side * -0.35}><coneGeometry args={[0.2, 0.62, 5]} /><meshStandardMaterial color="#a79d7b" flatShading /></mesh>
        </group>)}
        {[-1, 1].map((side) => <group key={side} position={[side * 1.2, 1.45, 0]} rotation-z={side * -0.12}>
          <mesh position-y={-0.08} castShadow><capsuleGeometry args={[0.42, 1.15, 3, 6]} /><meshStandardMaterial color="#59675e" flatShading /></mesh>
          <mesh position={[side * 0.18, 0.65, 0.08]} rotation-z={side * -0.3}><coneGeometry args={[0.38, 0.68, 5]} /><meshStandardMaterial color="#9b987c" flatShading /></mesh>
          <mesh position={[0, -0.78, 0.24]} castShadow><dodecahedronGeometry args={[0.48, 0]} /><meshStandardMaterial color="#4c5c53" flatShading /></mesh>
        </group>)}
        <mesh position-y={0.42} rotation-x={Math.PI / 2} castShadow><torusGeometry args={[0.78, 0.12, 5, 9]} /><meshStandardMaterial color="#c2a66c" metalness={0.42} roughness={0.55} /></mesh>
        {[0, 1, 2].map((i) => <mesh key={i} position={[Math.cos(i * 2.1) * 0.8, 1.48 + (i % 2) * 0.48, Math.sin(i * 2.1) * 0.67]} rotation-y={i * 1.7}>
          <octahedronGeometry args={[0.27, 0]} /><meshStandardMaterial color={core} emissive={core} emissiveIntensity={0.85} flatShading />
        </mesh>)}
      </> : <>
        <mesh position-y={0.58} rotation-x={Math.PI / 2} scale={[1.18, 1, 0.92]} castShadow><capsuleGeometry args={[0.32, 0.72, 3, 7]} /><meshStandardMaterial color="#78644e" flatShading /></mesh>
        <mesh position={[0, 0.74, 0.55]} rotation-x={Math.PI / 2} castShadow><dodecahedronGeometry args={[0.36, 0]} /><meshStandardMaterial color="#8a765c" flatShading /></mesh>
        <mesh position={[0, 0.8, 0.86]}><sphereGeometry args={[0.11, 7, 5]} /><meshStandardMaterial color={core} emissive={core} emissiveIntensity={1.2} /></mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 0.22, 0.89, 0.71]} rotation-z={side * 0.36}>
          <coneGeometry args={[0.12, 0.34, 5]} /><meshStandardMaterial color="#c4b18c" flatShading />
        </mesh>)}
        <mesh position-y={0.28} rotation-z={-0.15} castShadow><boxGeometry args={[0.24, 0.34, 0.3]} /><meshStandardMaterial color="#594d3d" flatShading /></mesh>
      </>}
    </group>
  );
}
