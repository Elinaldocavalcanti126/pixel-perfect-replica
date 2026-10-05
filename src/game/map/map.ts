import type { Vec } from "../types";

/** Mapa em "8": duas lanes (superior e inferior) + selva em X ao centro. */
export const MAP_W = 132;
export const MAP_H = 84;
export const MIN_X = -MAP_W / 2;
export const MIN_Z = -MAP_H / 2;
export const CELL = 1;
export const COLS = MAP_W / CELL;
export const ROWS = MAP_H / CELL;

interface Corridor {
  pts: Vec[];
  half: number;
  lane: boolean;
}

const v = (x: number, z: number): Vec => ({ x, z });

export const TOP_LANE: Vec[] = [v(-50, -5), v(-43, -25), v(-22, -31), v(22, -31), v(43, -25), v(50, -5)];
export const BOT_LANE: Vec[] = TOP_LANE.map((p) => v(p.x, -p.z));

export const CORRIDORS: Corridor[] = [
  { pts: TOP_LANE, half: 4.5, lane: true },
  { pts: BOT_LANE, half: 4.5, lane: true },
  { pts: [v(-32, -28), v(-14, -10), v(0, 0), v(14, 10), v(32, 28)], half: 3, lane: false },
  { pts: [v(-32, 28), v(-14, 10), v(0, 0), v(14, -10), v(32, -28)], half: 3, lane: false },
];

export const CLEARINGS: { c: Vec; r: number }[] = [
  { c: v(0, 0), r: 6.5 },
  { c: v(-14, 10), r: 4.5 },
  { c: v(14, -10), r: 4.5 },
  { c: v(-14, -10), r: 4 },
  { c: v(14, 10), r: 4 },
  { c: v(-54, 0), r: 12 },
  { c: v(54, 0), r: 12 },
];

export const BASE = [v(-54, 0), v(54, 0)] as const;
export const FOUNTAIN = [v(-60, 0), v(60, 0)] as const;
export const FOUNTAIN_R = 6;

export const CAMPS = [
  { pos: v(0, 0), big: true },
  { pos: v(-14, 10), big: false },
  { pos: v(14, -10), big: false },
];

/** Torres: para cada time, [top externa, top interna, bot externa, bot interna, base], altar à parte. */
export function towerLayout(team: 0 | 1) {
  const s = team === 0 ? -1 : 1;
  return {
    towers: [
      { pos: v(22 * s, -31), lane: 0, tier: 0 },
      { pos: v(42 * s, -24), lane: 0, tier: 1 },
      { pos: v(22 * s, 31), lane: 1, tier: 0 },
      { pos: v(42 * s, 24), lane: 1, tier: 1 },
      { pos: v(46 * s, 0), lane: -1, tier: 2 },
    ],
    altar: v(54 * s, 0),
  };
}

function distToSeg(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  let t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx - p.x, cz = a.z + t * dz - p.z;
  return Math.sqrt(cx * cx + cz * cz);
}

export function distToCorridor(p: Vec, c: Corridor) {
  let d = Infinity;
  for (let i = 0; i < c.pts.length - 1; i++) d = Math.min(d, distToSeg(p, c.pts[i]!, c.pts[i + 1]!));
  return d;
}

/** 1 = caminhável, 0 = bloqueado */
export const walkable = new Uint8Array(COLS * ROWS);
/** 2 = lane (terra), 1 = selva/base (grama) */
export const terrain = new Uint8Array(COLS * ROWS);

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const p = v(MIN_X + (c + 0.5) * CELL, MIN_Z + (r + 0.5) * CELL);
    let w = 0, t = 0;
    for (const cor of CORRIDORS) {
      if (distToCorridor(p, cor) <= cor.half) {
        w = 1;
        t = Math.max(t, cor.lane ? 2 : 1);
      }
    }
    for (const cl of CLEARINGS) {
      const dx = p.x - cl.c.x, dz = p.z - cl.c.z;
      if (dx * dx + dz * dz <= cl.r * cl.r) {
        w = 1;
        t = Math.max(t, 1);
      }
    }
    walkable[r * COLS + c] = w;
    terrain[r * COLS + c] = t;
  }
}

export const cellOf = (x: number, z: number) => {
  const c = Math.floor((x - MIN_X) / CELL), r = Math.floor((z - MIN_Z) / CELL);
  return { c, r };
};

export function isWalkable(x: number, z: number) {
  const { c, r } = cellOf(x, z);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  return walkable[r * COLS + c] === 1;
}

export const cellCenter = (c: number, r: number): Vec => v(MIN_X + (c + 0.5) * CELL, MIN_Z + (r + 0.5) * CELL);

/** Caminho de waypoints dos minions por lane e time. */
export function laneWaypoints(team: 0 | 1, lane: 0 | 1): Vec[] {
  const pts = (lane === 0 ? TOP_LANE : BOT_LANE).map((p) => ({ ...p }));
  const full = [v(-54, 0), ...pts, v(54, 0)];
  return team === 0 ? full : full.reverse();
}
