import type { Vec } from "../types";
import { COLS, ROWS, walkable, cellOf, cellCenter, isWalkable } from "./map";

/** A* em grade (navmesh em células) + suavização por linha de visão. */
const N = COLS * ROWS;
const g = new Float32Array(N);
const f = new Float32Array(N);
const parent = new Int32Array(N);
const stamp = new Uint32Array(N);
const closed = new Uint32Array(N);
let curStamp = 1;
const heap: number[] = [];

function push(n: number) {
  heap.push(n);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (f[heap[p]!]! <= f[n]!) break;
    heap[i] = heap[p]!;
    i = p;
  }
  heap[i] = n;
}
function pop(): number {
  const top = heap[0]!;
  const last = heap.pop()!;
  if (heap.length) {
    let i = 0;
    for (;;) {
      const l = i * 2 + 1, r = l + 1;
      let m = i;
      const fm = () => (m === i ? f[last]! : f[heap[m]!]!);
      if (l < heap.length && f[heap[l]!]! < fm()) m = l;
      if (r < heap.length && f[heap[r]!]! < fm()) m = r;
      if (m === i) break;
      heap[i] = heap[m]!;
      i = m;
    }
    heap[i] = last;
  }
  return top;
}

function nearestWalkableCell(c: number, r: number): number {
  for (let rad = 0; rad < 12; rad++) {
    for (let dr = -rad; dr <= rad; dr++)
      for (let dc = -rad; dc <= rad; dc++) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue;
        if (walkable[rr * COLS + cc]) return rr * COLS + cc;
      }
  }
  return -1;
}

export function lineOfWalk(a: Vec, b: Vec): boolean {
  const dx = b.x - a.x, dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const steps = Math.ceil(d / 0.4);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(a.x + dx * t, a.z + dz * t)) return false;
  }
  return true;
}

export function findPath(from: Vec, to: Vec): Vec[] {
  if (lineOfWalk(from, to)) return [{ ...to }];
  const s = cellOf(from.x, from.z), e = cellOf(to.x, to.z);
  const start = nearestWalkableCell(s.c, s.r), goal = nearestWalkableCell(e.c, e.r);
  if (start < 0 || goal < 0) return [];
  curStamp++;
  heap.length = 0;
  const gc = goal % COLS, gr = (goal / COLS) | 0;
  const h = (n: number) => {
    const dc = Math.abs((n % COLS) - gc), dr = Math.abs(((n / COLS) | 0) - gr);
    return dc + dr + (Math.SQRT2 - 2) * Math.min(dc, dr);
  };
  stamp[start] = curStamp; g[start] = 0; f[start] = h(start); parent[start] = -1;
  push(start);
  let found = false;
  let iter = 0;
  while (heap.length && iter++ < 20000) {
    const n = pop();
    if (closed[n] === curStamp) continue;
    closed[n] = curStamp;
    if (n === goal) { found = true; break; }
    const nc = n % COLS, nr = (n / COLS) | 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const cc = nc + dc, rr = nr + dr;
        if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue;
        const m = rr * COLS + cc;
        if (!walkable[m] || closed[m] === curStamp) continue;
        if (dr && dc && (!walkable[nr * COLS + cc] || !walkable[rr * COLS + nc])) continue;
        const ng = g[n]! + (dr && dc ? Math.SQRT2 : 1);
        if (stamp[m] !== curStamp || ng < g[m]!) {
          stamp[m] = curStamp; g[m] = ng; f[m] = ng + h(m); parent[m] = n;
          push(m);
        }
      }
  }
  if (!found) return [];
  const cells: Vec[] = [];
  for (let n = goal; n !== -1; n = parent[n]!) cells.push(cellCenter(n % COLS, (n / COLS) | 0));
  cells.reverse();
  if (isWalkable(to.x, to.z)) cells[cells.length - 1] = { ...to };
  // suavização (string pulling)
  const out: Vec[] = [];
  let anchor = from;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !lineOfWalk(anchor, cells[j]!)) j--;
    out.push(cells[j]!);
    anchor = cells[j]!;
    i = j + 1;
  }
  return out;
}
