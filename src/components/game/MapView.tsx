import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { COLS, ROWS, MIN_X, MIN_Z, MAP_W, MAP_H, walkable, terrain, cellCenter, FOUNTAIN } from "@/game/map/map";

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function useGroundTexture() {
  return useMemo(() => {
    const S = 8;
    const cv = document.createElement("canvas");
    cv.width = COLS * S; cv.height = ROWS * S;
    const ctx = cv.getContext("2d")!;
    const r = rand(7);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const t = terrain[i];
        const n = r() * 14;
        ctx.fillStyle = !walkable[i] ? `rgb(${22 + n},${34 + n},${24 + n})` : t === 2 ? `rgb(${112 + n},${92 + n},${64 + n})` : `rgb(${62 + n},${92 + n},${52 + n})`;
        ctx.fillRect(x * S, y * S, S, S);
      }
    // ruído fino
    for (let k = 0; k < 9000; k++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? "255,240,200" : "0,0,0"},${0.05 + r() * 0.06})`;
      ctx.fillRect(r() * cv.width, r() * cv.height, 2 + r() * 3, 2 + r() * 3);
    }
    ctx.filter = "blur(3px)";
    ctx.drawImage(cv, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

export function MapView() {
  const tex = useGroundTexture();
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);

  const spots = useMemo(() => {
    const r = rand(42);
    const trees: { x: number; z: number; s: number }[] = [];
    const rk: { x: number; z: number; s: number; ry: number }[] = [];
    for (let y = 0; y < ROWS; y += 2)
      for (let x = 0; x < COLS; x += 2) {
        if (walkable[y * COLS + x]) continue;
        let near = false;
        for (let dy = -3; dy <= 3 && !near; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && xx >= 0 && yy < ROWS && xx < COLS && walkable[yy * COLS + xx]) { near = true; break; }
          }
        const p = cellCenter(x, y);
        if (near ? r() < 0.85 : r() < 0.18) {
          if (r() < 0.75) trees.push({ x: p.x + r() - 0.5, z: p.z + r() - 0.5, s: 0.8 + r() * 0.8 });
          else rk.push({ x: p.x, z: p.z, s: 0.8 + r() * 1.2, ry: r() * 6 });
        }
      }
    return { trees, rk };
  }, []);

  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    spots.trees.forEach((t, i) => {
      m.compose(p.set(t.x, 0.6 * t.s, t.z), q.identity(), s.set(t.s, t.s, t.s)); trunks.current!.setMatrixAt(i, m);
      m.compose(p.set(t.x, 2 * t.s, t.z), q, s.set(t.s, t.s * (1 + (i % 3) * 0.15), t.s)); crowns.current!.setMatrixAt(i, m);
      crowns.current!.setColorAt(i, new THREE.Color().setHSL(0.27 + (i % 7) * 0.012, 0.35, 0.18 + (i % 5) * 0.025));
    });
    spots.rk.forEach((t, i) => {
      m.compose(p.set(t.x, 0.3 * t.s, t.z), q.setFromEuler(new THREE.Euler(0, t.ry, 0)), s.set(t.s, t.s * 0.7, t.s)); rocks.current!.setMatrixAt(i, m);
    });
    for (const im of [trunks, crowns, rocks]) { im.current!.instanceMatrix.needsUpdate = true; if (im.current!.instanceColor) im.current!.instanceColor.needsUpdate = true; }
  }, [spots]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[MIN_X + MAP_W / 2, 0, MIN_Z + MAP_H / 2]} receiveShadow>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#14201a" roughness={1} />
      </mesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.trees.length]}>
        <cylinderGeometry args={[0.15, 0.25, 1.2, 5]} />
        <meshStandardMaterial color="#4a3423" flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, spots.trees.length]}>
        <coneGeometry args={[1.1, 2.6, 6]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[undefined, undefined, spots.rk.length]}>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#5d6064" flatShading />
      </instancedMesh>
      {FOUNTAIN.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <mesh position-y={0.1}><cylinderGeometry args={[5.5, 6, 0.2, 24]} /><meshStandardMaterial color="#6e6a5e" flatShading /></mesh>
          <mesh position-y={0.25}><cylinderGeometry args={[4.6, 4.6, 0.1, 24]} /><meshStandardMaterial color={i === 0 ? "#3b6fb6" : "#b6463b"} emissive={i === 0 ? "#1d3d70" : "#702018"} emissiveIntensity={0.6} /></mesh>
        </group>
      ))}
    </group>
  );
}
