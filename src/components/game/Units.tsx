import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { World } from "@/game/ecs/world";
import type { Entity } from "@/game/types";
import { heroById } from "@/game/data/heroes";

const TEAM_COL = [0x4f86d9, 0xd9574f, 0x9a8f6a];

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

export function HeroModel({ w, e }: { w: World; e: Entity }) {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const def = heroById(e.hero!.defId);
  const phase = useRef(0);
  useEntitySync(w, e, ref, (g, t) => {
    const b = body.current!, a = arm.current!;
    if (!e.alive) {
      const k = Math.min(1, (t - e.deathTime) * 2);
      b.rotation.x = -k * 1.4; b.position.y = -k * 0.4;
      g.visible = e.visible && t - e.deathTime < 3;
      return;
    }
    b.rotation.x = 0;
    if (e.moving) phase.current += 0.25;
    b.position.y = e.moving ? Math.abs(Math.sin(phase.current)) * 0.18 : Math.sin(t * 2) * 0.04;
    const atk = t - e.lastAttackTime;
    a.rotation.x = atk < 0.3 ? -Math.sin((atk / 0.3) * Math.PI) * 1.6 : e.moving ? Math.sin(phase.current) * 0.5 : 0;
  });
  const c = def.color, acc = def.accent;
  return (
    <group ref={ref} position={[e.pos.x, 0, e.pos.z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.04}>
        <ringGeometry args={[0.75, 0.9, 24]} />
        <meshBasicMaterial color={TEAM_COL[e.team]} transparent opacity={0.85} />
      </mesh>
      <group ref={body}>
        <mesh position-y={0.85} castShadow><cylinderGeometry args={[0.35, 0.5, 1.1, 7]} /><meshStandardMaterial color={c} flatShading /></mesh>
        <mesh position-y={1.6} castShadow><icosahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#e2c3a0" flatShading /></mesh>
        {def.id === "warrior" && <>
          <mesh position={[0, 1.85, 0]}><coneGeometry args={[0.34, 0.35, 6]} /><meshStandardMaterial color="#6c6c70" metalness={0.6} flatShading /></mesh>
          <mesh position={[-0.55, 1.0, 0.1]} castShadow><boxGeometry args={[0.15, 0.9, 0.7]} /><meshStandardMaterial color={acc} metalness={0.5} flatShading /></mesh>
        </>}
        {def.id === "mage" && <>
          <mesh position={[0, 2.05, 0]}><coneGeometry args={[0.35, 0.8, 6]} /><meshStandardMaterial color={c} flatShading /></mesh>
          <mesh position={[0, 0.4, 0]}><coneGeometry args={[0.6, 0.8, 7]} /><meshStandardMaterial color={c} flatShading /></mesh>
        </>}
        {def.id === "archer" && <mesh position={[0, 1.7, -0.05]}><coneGeometry args={[0.36, 0.5, 5]} /><meshStandardMaterial color="#2d4a2a" flatShading /></mesh>}
        {def.id === "support" && <mesh position={[0, 2.0, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[0.3, 0.04, 6, 16]} /><meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={1.2} /></mesh>}
        <group ref={arm} position={[0.48, 1.25, 0]}>
          {def.id === "warrior" && <mesh position={[0, -0.1, 0.55]} rotation-x={Math.PI / 2}><boxGeometry args={[0.12, 1.2, 0.08]} /><meshStandardMaterial color="#c8c8cc" metalness={0.8} roughness={0.3} /></mesh>}
          {(def.id === "mage" || def.id === "support") && <>
            <mesh position={[0, 0, 0.1]}><cylinderGeometry args={[0.04, 0.04, 1.6, 5]} /><meshStandardMaterial color="#5a3d26" /></mesh>
            <mesh position={[0, 0.85, 0.1]}><octahedronGeometry args={[0.16, 0]} /><meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={1.5} /></mesh>
          </>}
          {def.id === "archer" && <mesh position={[0, 0, 0.3]} rotation-y={Math.PI / 2}><torusGeometry args={[0.55, 0.035, 4, 12, Math.PI]} /><meshStandardMaterial color="#6b4a2a" /></mesh>}
        </group>
      </group>
    </group>
  );
}

export function TowerModel({ w, e }: { w: World; e: Entity }) {
  const ref = useRef<THREE.Group>(null);
  const crystal = useRef<THREE.Mesh>(null);
  const alt = e.kind === "altar";
  useEntitySync(w, e, ref, (g, t) => {
    g.rotation.y = 0;
    const cr = crystal.current!;
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
  const big = e.monster!.big;
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
        <mesh position={[0, 0.7, 0.6]}><coneGeometry args={[0.25, 0.5, 5]} rotation-x={Math.PI / 2} /><meshStandardMaterial color="#4a3f37" flatShading /></mesh>
      </>}
    </group>
  );
}
