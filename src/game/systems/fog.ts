import type { World } from "../ecs/world";

/** Névoa de guerra: inimigos só são visíveis dentro da visão de aliados do jogador. */
export function fogSystem(w: World) {
  const team = w.player?.team ?? 0;
  const viewers = w.entities.filter((e) => e.alive && e.team === team);
  for (const e of w.entities) {
    if (e.team === team || e.kind === "tower" || e.kind === "altar") { e.visible = true; continue; }
    let vis = false;
    for (const v of viewers) {
      const r = v.kind === "hero" ? 14 : v.kind === "tower" ? 13 : 9;
      const dx = v.pos.x - e.pos.x, dz = v.pos.z - e.pos.z;
      if (dx * dx + dz * dz < r * r) { vis = true; break; }
    }
    e.visible = vis;
  }
}
