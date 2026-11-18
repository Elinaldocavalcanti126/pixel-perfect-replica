import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { heroById } from "@/game/data/heroes";

/** Small class-specific ornaments add a clear silhouette without replacing the CC0 rigs. */
export function HeroRegalia({ heroId }: { heroId: string }) {
  const ref = useRef<THREE.Group>(null);
  const mantleRef = useRef<THREE.Group>(null);
  const hero = heroById(heroId);
  const accent = `#${hero.accent.toString(16).padStart(6, "0")}`;
  const base = `#${hero.color.toString(16).padStart(6, "0")}`;
  const capeShape = useMemo(() => {
    const silhouettes: Record<string, [number, number][]> = {
      warrior: [[-0.38, 0.2], [0.38, 0.2], [0.52, -0.08], [0.4, -0.42], [0.54, -1.08], [0.2, -1.02], [0, -1.3], [-0.2, -1.02], [-0.54, -1.08], [-0.4, -0.42]],
      mage: [[-0.3, 0.2], [0.3, 0.2], [0.42, -0.12], [0.25, -0.68], [0.38, -1.34], [0.06, -1.16], [-0.16, -1.36], [-0.24, -0.7], [-0.42, -0.12]],
      archer: [[-0.34, 0.2], [0.34, 0.2], [0.4, -0.12], [0.22, -0.55], [0.44, -1.08], [0.12, -0.94], [0, -1.2], [-0.18, -0.92], [-0.46, -1.04], [-0.25, -0.5], [-0.42, -0.12]],
      support: [[-0.34, 0.2], [0.34, 0.2], [0.55, -0.1], [0.46, -0.42], [0.5, -0.86], [0.24, -0.98], [0, -1.2], [-0.24, -0.98], [-0.5, -0.86], [-0.46, -0.42], [-0.55, -0.1]],
      veyra: [[-0.3, 0.2], [0.34, 0.2], [0.42, -0.12], [0.28, -0.46], [0.52, -1.22], [0.12, -1.04], [-0.02, -0.82], [-0.3, -1.3], [-0.4, -0.56], [-0.42, -0.12]],
      maelis: [[-0.32, 0.2], [0.32, 0.2], [0.48, -0.14], [0.3, -0.52], [0.48, -1.12], [0.14, -0.98], [0, -1.34], [-0.18, -0.98], [-0.48, -1.12], [-0.3, -0.52], [-0.48, -0.14]],
    };
    const points = silhouettes[heroId] ?? silhouettes["warrior"]!;
    const shape = new THREE.Shape();
    shape.moveTo(...points[0]!);
    points.slice(1).forEach((point) => shape.lineTo(...point));
    shape.closePath();
    return shape;
  }, [heroId]);
  const tabardShape = useMemo(() => {
    const shape = new THREE.Shape();
    const width = heroId === "warrior" ? 0.22 : 0.17;
    shape.moveTo(-width, 0.14);
    shape.lineTo(width, 0.14);
    shape.lineTo(width * 0.78, -0.22);
    shape.lineTo(0, -0.5);
    shape.lineTo(-width * 0.78, -0.22);
    shape.closePath();
    return shape;
  }, [heroId]);
  const pauldronScale = heroId === "warrior" ? 1.35 : heroId === "maelis" ? 1.12 : heroId === "support" ? 0.96 : 0.88;

  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;
    const t = clock.elapsedTime;
    group.position.y = Math.sin(t * 1.8 + hero.color) * 0.025;
    if (mantleRef.current) {
      mantleRef.current.rotation.z = Math.sin(t * 1.35 + hero.accent) * 0.035;
      mantleRef.current.rotation.x = Math.sin(t * 1.1 + hero.color) * 0.022;
    }
    if (heroId === "mage" || heroId === "support") group.rotation.z = Math.sin(t * 0.8) * 0.035;
    if (heroId === "maelis") group.rotation.y = t * 0.24;
    if (heroId === "veyra") group.rotation.z = Math.sin(t * 2.5) * 0.018;
  });

  return (
    <group ref={ref}>
      {/* Contrasting mantle and shoulder plates give every hero a stronger
          silhouette from the distant isometric match camera. */}
      <group ref={mantleRef} position={[0, 1.72, -0.28]}>
        <mesh position-z={-0.035} castShadow>
          <shapeGeometry args={[capeShape]} />
          <meshStandardMaterial color={base} side={THREE.DoubleSide} roughness={0.78} flatShading />
        </mesh>
        <mesh position={[0, -0.04, 0.008]} scale={[0.72, 0.9, 1]}>
          <shapeGeometry args={[capeShape]} />
          <meshStandardMaterial color={accent} side={THREE.DoubleSide} roughness={0.58} metalness={0.12} flatShading />
        </mesh>
        <mesh position={[0, -0.04, 0.018]} scale={[0.62, 0.84, 1]}>
          <shapeGeometry args={[capeShape]} />
          <meshStandardMaterial color={base} side={THREE.DoubleSide} roughness={0.78} flatShading />
        </mesh>
      </group>
      <group position={[0, 1.53, 0.13]}>
        {[-1, 1].map((side) => <group key={`pauldron-${side}`} position={[side * 0.38, 0, 0]} rotation-z={side * -0.16}>
          <mesh scale={[pauldronScale, 0.92, 1]} castShadow>
            <icosahedronGeometry args={[0.23, 0]} />
            <meshStandardMaterial color={base} metalness={0.56} roughness={0.36} flatShading />
          </mesh>
          <mesh position={[0, -0.015, 0.14]} scale={[0.42, 0.5, 0.5]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color={accent} metalness={0.5} roughness={0.28} emissive={accent} emissiveIntensity={0.12} flatShading />
          </mesh>
        </group>)}
        <mesh position={[0, 0.08, 0.23]} rotation-z={Math.PI} scale={[0.72, 0.8, 0.55]}>
          <coneGeometry args={[0.18, 0.48, 5]} />
          <meshStandardMaterial color={accent} metalness={0.4} roughness={0.35} flatShading />
        </mesh>
      </group>
      <group>
        <mesh position={[0, 1.3, 0.24]} scale={[0.82, 0.9, 0.4]} castShadow>
          <dodecahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={base} metalness={0.38} roughness={0.42} flatShading />
        </mesh>
        <mesh position={[0, 1.31, 0.405]} scale={[0.66, 0.78, 0.34]}>
          <octahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color={accent} metalness={0.58} roughness={0.25} emissive={accent} emissiveIntensity={0.12} flatShading />
        </mesh>
        <mesh position={[0, 1.33, 0.51]}>
          <octahedronGeometry args={[heroId === "warrior" ? 0.13 : 0.105, 0]} />
          <meshStandardMaterial color="#fff4dc" emissive={accent} emissiveIntensity={heroId === "maelis" || heroId === "mage" ? 1.1 : 0.62} metalness={0.18} roughness={0.22} flatShading />
        </mesh>
        <mesh position={[0, 0.98, 0.04]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.34, 0.055, 6, 14]} />
          <meshStandardMaterial color={accent} metalness={0.56} roughness={0.32} flatShading />
        </mesh>
        <mesh position={[0, 0.97, 0.33]} scale={[1, 1, 0.48]}>
          <octahedronGeometry args={[0.13, 0]} />
          <meshStandardMaterial color={accent} metalness={0.64} roughness={0.28} emissive={accent} emissiveIntensity={0.18} flatShading />
        </mesh>
        <mesh position={[0, 0.79, 0.27]} castShadow>
          <shapeGeometry args={[tabardShape]} />
          <meshStandardMaterial color={base} side={THREE.DoubleSide} roughness={0.72} flatShading />
        </mesh>
        <mesh position={[0, 0.79, 0.282]} scale={[0.55, 0.88, 1]}>
          <shapeGeometry args={[tabardShape]} />
          <meshStandardMaterial color={accent} side={THREE.DoubleSide} roughness={0.5} metalness={0.14} flatShading />
        </mesh>
      </group>
      {heroId === "warrior" && <>
        {[-1, 1].map((side) => <group key={side} position={[side * 0.38, 1.46, 0.02]} rotation-z={side * -0.16}>
          <mesh castShadow><icosahedronGeometry args={[0.25, 0]} /><meshStandardMaterial color={base} metalness={0.52} roughness={0.38} flatShading /></mesh>
          <mesh position={[0, 0.015, 0.2]}><octahedronGeometry args={[0.075, 0]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} flatShading /></mesh>
        </group>)}
        <mesh position={[0, 1.34, 0.26]}><octahedronGeometry args={[0.14, 0]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.65} flatShading /></mesh>
        {[-1, 1].map((side) => <mesh key={`crest-${side}`} position={[side * 0.45, 1.72, -0.04]} rotation-z={side * -0.35} castShadow>
          <coneGeometry args={[0.11, 0.42, 5]} /><meshStandardMaterial color={accent} metalness={0.4} roughness={0.42} flatShading />
        </mesh>)}
      </>}
      {heroId === "mage" && <group position={[0, 1.96, -0.1]}>
        <mesh><torusGeometry args={[0.31, 0.025, 6, 28]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} metalness={0.25} roughness={0.35} /></mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 0.31, 0.03, 0]}><octahedronGeometry args={[0.07, 0]} /><meshStandardMaterial color="#e9f2ff" emissive={accent} emissiveIntensity={0.8} flatShading /></mesh>)}
        <mesh position={[0, -0.55, 0.18]}><octahedronGeometry args={[0.16, 0]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} metalness={0.2} flatShading /></mesh>
      </group>}
      {heroId === "archer" && <group position={[0.34, 1.18, -0.18]} rotation-z={-0.16}>
        <mesh castShadow><cylinderGeometry args={[0.12, 0.17, 0.68, 7]} /><meshStandardMaterial color={base} roughness={0.82} flatShading /></mesh>
        <mesh position-y={0.29}><cylinderGeometry args={[0.13, 0.1, 0.08, 7]} /><meshStandardMaterial color={accent} metalness={0.35} roughness={0.5} flatShading /></mesh>
        {[-1, 0, 1].map((side) => <group key={side} position={[side * 0.055, 0.42, 0]} rotation-z={side * 0.12}>
          <mesh position-y={0.08}><cylinderGeometry args={[0.012, 0.012, 0.42, 5]} /><meshStandardMaterial color="#d7c59a" /></mesh>
          <mesh position-y={0.28}><coneGeometry args={[0.035, 0.12, 4]} /><meshStandardMaterial color={accent} flatShading /></mesh>
        </group>)}
        <mesh position={[0, -0.35, -0.18]} rotation-z={-0.12} castShadow><boxGeometry args={[0.32, 0.52, 0.18]} /><meshStandardMaterial color={base} roughness={0.82} flatShading /></mesh>
        {[-1, 0, 1].map((side) => <mesh key={`fletch-${side}`} position={[side * 0.08, -0.03, -0.2]} rotation-z={side * 0.14}>
          <coneGeometry args={[0.045, 0.16, 4]} /><meshStandardMaterial color={accent} flatShading />
        </mesh>)}
      </group>}
      {heroId === "support" && <group position={[0, 2.02, -0.2]}>
        <mesh><torusGeometry args={[0.38, 0.035, 6, 32]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.75} metalness={0.35} roughness={0.3} /></mesh>
        {Array.from({ length: 3 }, (_, i) => {
          const angle = (i / 3) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(angle) * 0.38, Math.sin(angle) * 0.38, 0]}>
            <octahedronGeometry args={[0.075, 0]} />
            <meshStandardMaterial color="#f0ffed" emissive={accent} emissiveIntensity={0.9} flatShading />
          </mesh>;
        })}
        {[-1, 1].map((side) => <mesh key={`wing-${side}`} position={[side * 0.48, -0.42, -0.12]} rotation-z={side * -0.35} castShadow>
          <octahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color="#e7e6d5" emissive={accent} emissiveIntensity={0.28} metalness={0.18} flatShading />
        </mesh>)}
      </group>}
      {heroId === "veyra" && <>
        {[-1, 1].map((side) => <group key={side} position={[side * 0.48, 0.86, 0.2]} rotation-z={side * -0.32}>
          <mesh castShadow><cylinderGeometry args={[0.045, 0.065, 0.42, 6]} /><meshStandardMaterial color="#34213f" metalness={0.45} flatShading /></mesh>
          <mesh position-y={side * 0.35} castShadow><coneGeometry args={[0.095, 0.62, 5]} /><meshStandardMaterial color={accent} metalness={0.48} roughness={0.27} emissive={accent} emissiveIntensity={0.35} flatShading /></mesh>
          <mesh position-y={side * 0.08}><torusGeometry args={[0.11, 0.025, 5, 8]} /><meshStandardMaterial color="#f1d6ed" metalness={0.5} /></mesh>
        </group>)}
        <mesh position={[0, 1.55, -0.18]} rotation-z={0.28}><torusGeometry args={[0.46, 0.035, 5, 22, Math.PI * 1.45]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} /></mesh>
        <mesh position={[0, 1.42, 0.29]}><octahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color="#fff0fb" emissive={accent} emissiveIntensity={1.5} flatShading /></mesh>
      </>}
      {heroId === "maelis" && <group position={[0, 1.62, -0.16]}>
        <mesh><torusGeometry args={[0.48, 0.025, 5, 28]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} metalness={0.35} /></mesh>
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (i / 5) * Math.PI * 2;
          return <group key={i} position={[Math.cos(angle) * 0.53, Math.sin(angle) * 0.4, 0]} rotation-z={angle}>
            <mesh><octahedronGeometry args={[0.14 + (i % 2) * 0.035, 0]} /><meshStandardMaterial color="#d8fbff" emissive={accent} emissiveIntensity={1.2} metalness={0.28} roughness={0.22} flatShading /></mesh>
          </group>;
        })}
        <mesh position={[0, 0, 0.28]}><octahedronGeometry args={[0.19, 0]} /><meshStandardMaterial color="#f2ffff" emissive={accent} emissiveIntensity={1.6} flatShading /></mesh>
      </group>}
    </group>
  );
}
