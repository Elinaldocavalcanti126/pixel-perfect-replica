import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { COLS, ROWS, MIN_X, MIN_Z, MAP_W, MAP_H, walkable, terrain, cellCenter, FOUNTAIN } from "@/game/map/map";
import stoneUrl from "@/assets/terrain/mossy-stones.jpg";
import grassUrl from "@/assets/terrain/painted-grass.jpg";
import { inRiver, TORCH_SPOTS } from "./terrainDetails";
import { RiverAndTorches } from "./RiverAndTorches";
import { useTerrainPalette } from "./terrainPalette";

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function useGroundTexture() {
  const tex = useMemo(() => {
    const S = 16;
    const cv = document.createElement("canvas");
    cv.width = COLS * S; cv.height = ROWS * S;
    const ctx = cv.getContext("2d");
    if (ctx) { ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--terrain-forest").trim(); ctx.fillRect(0, 0, cv.width, cv.height); }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url; });
    Promise.all([load(stoneUrl), load(grassUrl)]).then(([stone, grass]) => {
      if (cancelled) return;
      const cv = tex.image as HTMLCanvasElement, ctx = cv.getContext("2d");
      if (!ctx) return;
      const S = 16, tileCells = 8;
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        const image = terrain[idx] === 2 ? stone : grass;
        const crop = image.width / tileCells;
        ctx.drawImage(image, (col % tileCells) * crop, (row % tileCells) * crop, crop, crop, col * S, row * S, S, S);
        if (!walkable[idx]) {
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--terrain-forest").trim();
          ctx.fillRect(col * S, row * S, S, S); ctx.globalAlpha = 1;
        }
      }
      tex.needsUpdate = true;
    }).catch(() => { /* Retain the immediately available ground on a failed texture request. */ });
    return () => { cancelled = true; tex.dispose(); };
  }, [tex]);
  return tex;
}

export function MapView() {
  const tex = useGroundTexture();
  const colors = useTerrainPalette();
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
        if (inRiver(p.x, p.z) || TORCH_SPOTS.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 2)) continue;
        if (near ? r() < 0.85 : r() < 0.18) {
          if (r() < 0.75) trees.push({ x: p.x + r() - 0.5, z: p.z + r() - 0.5, s: 0.8 + r() * 0.8 });
          else rk.push({ x: p.x, z: p.z, s: 0.8 + r() * 1.2, ry: r() * 6 });
        }
      }
    return { trees, rk };
  }, []);

  useEffect(() => {
    const trunkMesh = trunks.current, crownMesh = crowns.current, rockMesh = rocks.current;
    if (!trunkMesh || !crownMesh || !rockMesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    spots.trees.forEach((t, i) => {
      m.compose(p.set(t.x, 0.6 * t.s, t.z), q.identity(), s.set(t.s, t.s, t.s)); trunkMesh.setMatrixAt(i, m);
      // Three overlapping foliage tiers replace the single bare cone with a
      // fuller, varied canopy while retaining a low draw-call count.
      for (let tier = 0; tier < 3; tier++) {
        const index = i * 3 + tier;
        const spread = 1 - tier * 0.22;
        m.compose(p.set(t.x, (1.2 + tier * 0.76) * t.s, t.z), q, s.set(t.s * spread, t.s * (1.35 - tier * 0.08), t.s * spread));
        crownMesh.setMatrixAt(index, m);
        const foliage = (colors["forest"] ?? new THREE.Color()).clone().multiplyScalar(1.55 + tier * 0.16 + (i % 4) * 0.06);
        if (i % 3 === 0) foliage.offsetHSL(0.025, 0.08, 0.015);
        crownMesh.setColorAt(index, foliage);
      }
    });
    spots.rk.forEach((t, i) => {
      m.compose(p.set(t.x, 0.3 * t.s, t.z), q.setFromEuler(new THREE.Euler(0, t.ry, 0)), s.set(t.s, t.s * 0.7, t.s)); rockMesh.setMatrixAt(i, m);
    });
    for (const im of [trunkMesh, crownMesh, rockMesh]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }, [spots, colors]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[MIN_X + MAP_W / 2, 0, MIN_Z + MAP_H / 2]} receiveShadow>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={0.12} roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={colors["forest"]} roughness={1} />
      </mesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, spots.trees.length]}>
        <cylinderGeometry args={[0.15, 0.25, 1.2, 5]} />
        <meshStandardMaterial color={colors["bark"]} flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, spots.trees.length * 3]}>
        <coneGeometry args={[1.05, 1.8, 7]} />
        <meshStandardMaterial flatShading roughness={0.88} />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[undefined, undefined, spots.rk.length]}>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={colors["stone"]} flatShading />
      </instancedMesh>
      {FOUNTAIN.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <mesh position-y={0.1}><cylinderGeometry args={[5.5, 6, 0.2, 24]} /><meshStandardMaterial color="#6e6a5e" flatShading /></mesh>
          <mesh position-y={0.25}><cylinderGeometry args={[4.6, 4.6, 0.1, 24]} /><meshStandardMaterial color={i === 0 ? "#3b6fb6" : "#b6463b"} emissive={i === 0 ? "#1d3d70" : "#702018"} emissiveIntensity={0.6} /></mesh>
        </group>
      ))}
      <RiverAndTorches />
    </group>
  );
}
