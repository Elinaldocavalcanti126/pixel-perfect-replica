import type { World } from "../ecs/world";
import { isWalkable } from "../map/map";

/** Sistema de movimento: segue o caminho, separa unidades e respeita paredes. */
export function movementSystem(w: World, dt: number) {
  const t = w.time;
  const units = w.entities;
  for (const e of units) {
    e.moving = false;
    if (!e.alive || e.kind === "tower" || e.kind === "altar") continue;
    if (e.status.stunUntil > t || e.status.rootUntil > t) continue;
    const next = e.path[0];
    if (!next) continue;
    const speed = e.stats.speed * (e.status.slowUntil > t ? e.status.slowFactor : 1);
    const dx = next.x - e.pos.x, dz = next.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    const step = speed * dt;
    if (d <= step) {
      e.pos.x = next.x; e.pos.z = next.z;
      e.path.shift();
    } else {
      e.pos.x += (dx / d) * step;
      e.pos.z += (dz / d) * step;
    }
    e.rot = Math.atan2(dx, dz);
    e.moving = true;
  }
  // separação simples + colisão com estruturas
  for (let i = 0; i < units.length; i++) {
    const a = units[i]!;
    if (!a.alive || a.kind === "tower" || a.kind === "altar") continue;
    for (let j = 0; j < units.length; j++) {
      if (i === j) continue;
      const b = units[j]!;
      if (!b.alive) continue;
      const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) * (b.kind === "tower" || b.kind === "altar" ? 1 : 0.35);
      const nx = a.pos.x + (dx / d) * push, nz = a.pos.z + (dz / d) * push;
      if (isWalkable(nx, nz)) { a.pos.x = nx; a.pos.z = nz; }
    }
  }
}
