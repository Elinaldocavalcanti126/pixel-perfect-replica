import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { World } from "@/game/ecs/world";
import { heroById } from "@/game/data/heroes";

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const P = new THREE.Vector3();
const C = new THREE.Color();
const R = new THREE.Vector3();
const UPQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

/** Minions renderizados com instancing (um draw call por parte). */
export function Minions({ w }: { w: World }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const render = useRef(new Map<number, { x: number; z: number }>());
  useFrame((_, dt) => {
    let n = 0;
    const k = 1 - Math.exp(-18 * dt);
    for (const e of w.entities) {
      if (!e.minion || !e.visible) continue;
      let r = render.current.get(e.id);
      if (!r) { r = { x: e.pos.x, z: e.pos.z }; render.current.set(e.id, r); }
      r.x += (e.pos.x - r.x) * k; r.z += (e.pos.z - r.z) * k;
      const dead = !e.alive;
      const sc = dead ? Math.max(0.01, 1 - (w.time - e.deathTime)) : 1;
      const bob = e.moving ? Math.abs(Math.sin(w.time * 10 + e.id)) * 0.12 : 0;
      const atk = w.time - e.lastAttackTime < 0.2 ? 0.15 : 0;
      Q.setFromEuler(new THREE.Euler(atk, e.rot, 0));
      const s = e.minion.ranged ? 0.85 : 1;
      M.compose(P.set(r.x, (0.45 + bob) * sc, r.z), Q, S.set(s * sc, s * sc, s * sc));
      body.current!.setMatrixAt(n, M);
      M.compose(P.set(r.x, (0.95 + bob) * sc, r.z), Q, S.set(sc, sc, sc));
      head.current!.setMatrixAt(n, M);
      C.set(e.team === 0 ? (e.minion.ranged ? 0x6fa0e8 : 0x3d6fb8) : e.minion.ranged ? 0xe88a6f : 0xb84a3d);
      body.current!.setColorAt(n, C);
      n++;
      if (n >= 200) break;
    }
    if (w.tick % 60 === 0) for (const id of render.current.keys()) if (!w.byId.has(id)) render.current.delete(id);
    for (const im of [body.current!, head.current!]) {
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={body} args={[undefined, undefined, 200]} frustumCulled={false}>
        <cylinderGeometry args={[0.28, 0.38, 0.8, 6]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, 200]} frustumCulled={false}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#d8c8a8" flatShading />
      </instancedMesh>
    </>
  );
}

/** Barras de vida flutuantes (billboard, instanciadas). */
export function HealthBars({ w }: { w: World }) {
  const bg = useRef<THREE.InstancedMesh>(null);
  const fg = useRef<THREE.InstancedMesh>(null);
  const cam = useThree((s) => s.camera);
  useFrame(() => {
    let n = 0;
    R.set(1, 0, 0).applyQuaternion(cam.quaternion);
    for (const e of w.entities) {
      if (!e.alive || !e.visible) continue;
      if (e.hp >= e.stats.maxHp && e.kind !== "hero" && e.kind !== "tower" && e.kind !== "altar") continue;
      const width = e.kind === "hero" ? 1.6 : e.kind === "tower" || e.kind === "altar" ? 2.6 : e.monster?.big ? 2 : 0.9;
      const y = e.kind === "hero" ? 2.6 : e.kind === "tower" ? 6.4 : e.kind === "altar" ? 5.6 : e.monster?.big ? 3.4 : 1.5;
      const frac = Math.max(0, e.hp / e.stats.maxHp);
      M.compose(P.set(e.pos.x, y, e.pos.z), cam.quaternion, S.set(width + 0.08, 0.2, 1));
      bg.current!.setMatrixAt(n, M);
      P.addScaledVector(R, -(1 - frac) * width * 0.5);
      P.y += 0.001;
      M.compose(P, cam.quaternion, S.set(Math.max(0.001, width * frac), 0.13, 1));
      fg.current!.setMatrixAt(n, M);
      C.set(e.id === w.playerId ? 0x7ed957 : e.team === 0 ? 0x4f9bff : e.team === 1 ? 0xff5a4f : 0xe0c060);
      fg.current!.setColorAt(n, C);
      n++;
      if (n >= 250) break;
    }
    bg.current!.count = n; fg.current!.count = n;
    bg.current!.instanceMatrix.needsUpdate = true; fg.current!.instanceMatrix.needsUpdate = true;
    if (fg.current!.instanceColor) fg.current!.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bg} args={[undefined, undefined, 250]} frustumCulled={false} renderOrder={10}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#120c08" depthTest={false} />
      </instancedMesh>
      <instancedMesh ref={fg} args={[undefined, undefined, 250]} frustumCulled={false} renderOrder={11}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial depthTest={false} />
      </instancedMesh>
    </>
  );
}

/** Projéteis, efeitos, zonas e indicador de mira. */
export function Effects({ w }: { w: World }) {
  const proj = useRef<THREE.InstancedMesh>(null);
  const rings = useRef<THREE.InstancedMesh>(null);
  const disc = useRef<THREE.InstancedMesh>(null);
  const mats = useMemo(() => ({
    add: { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false } as const,
  }), []);
  useFrame(() => {
    let n = 0;
    for (const p of w.projectiles) {
      if (!p.active) continue;
      M.compose(P.set(p.pos.x, 1.1, p.pos.z), Q.identity(), S.setScalar(p.size));
      proj.current!.setMatrixAt(n, M);
      proj.current!.setColorAt(n, C.set(p.color));
      n++;
    }
    proj.current!.count = n;
    let r = 0, d = 0;
    const ring = (x: number, z: number, rad: number, col: number, a: number, y = 0.08) => {
      if (r >= 160) return;
      M.compose(P.set(x, y, z), UPQ, S.setScalar(rad));
      rings.current!.setMatrixAt(r, M);
      rings.current!.setColorAt(r, C.set(col).multiplyScalar(a));
      r++;
    };
    const fill = (x: number, z: number, rad: number, col: number, a: number) => {
      if (d >= 60) return;
      M.compose(P.set(x, 0.06, z), UPQ, S.setScalar(rad));
      disc.current!.setMatrixAt(d, M);
      disc.current!.setColorAt(d, C.set(col).multiplyScalar(a));
      d++;
    };
    for (const f of w.fx) {
      const k = (w.time - f.start) / f.dur;
      if (k > 1 || k < 0) continue;
      ring(f.pos.x, f.pos.z, f.radius * (0.4 + 0.6 * k), f.color, 1 - k, f.y);
      fill(f.pos.x, f.pos.z, f.radius * (0.3 + 0.7 * k), f.color, (1 - k) * 0.35);
    }
    for (const z of w.zones) {
      if (z.done) continue;
      if (z.team !== w.player?.team && z.kind === "trap") continue;
      const pulse = 0.6 + Math.sin(w.time * 6) * 0.2;
      ring(z.pos.x, z.pos.z, z.radius, z.color, pulse);
      fill(z.pos.x, z.pos.z, z.radius, z.color, z.kind === "meteor" ? 0.2 + 0.4 * ((w.time - z.start) / (z.until - z.start)) : 0.18);
    }
    // mira
    const me = w.player;
    if (me && me.alive && w.input.targeting >= 0) {
      const a = heroById(me.hero!.defId).abilities[w.input.targeting]!;
      ring(me.pos.x, me.pos.z, a.range, 0xe8d6a0, 0.5);
      ring(w.input.mouse.x, w.input.mouse.z, Math.max(0.8, a.radius), 0xf2c94c, 0.9);
    }
    // círculo de alcance do ataque do jogador (sutil)
    if (me && me.alive) ring(me.pos.x, me.pos.z, me.stats.range + me.radius, 0x9a8a60, 0.12);
    for (const [im, c] of [[rings.current!, r], [disc.current!, d]] as const) {
      im.count = c; im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    proj.current!.instanceMatrix.needsUpdate = true;
    if (proj.current!.instanceColor) proj.current!.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={proj} args={[undefined, undefined, 160]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial {...mats.add} />
      </instancedMesh>
      <instancedMesh ref={rings} args={[undefined, undefined, 160]} frustumCulled={false}>
        <ringGeometry args={[0.92, 1, 48]} />
        <meshBasicMaterial {...mats.add} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={disc} args={[undefined, undefined, 60]} frustumCulled={false}>
        <circleGeometry args={[1, 40]} />
        <meshBasicMaterial {...mats.add} side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  );
}
