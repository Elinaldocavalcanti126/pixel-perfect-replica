import type { World } from "../ecs/world";
import type { Entity } from "../types";
import { findPath } from "../map/pathfinding";
import { fireProjectile } from "./abilities";

const isRanged = (e: Entity) =>
  e.kind === "tower" || e.kind === "altar" || (e.minion?.ranged ?? false) || e.stats.range > 3;

/** Sistema de combate: persegue o alvo de ataque e aplica ataques básicos. */
export function combatSystem(w: World, dt: number) {
  const t = w.time;
  for (const e of w.entities) {
    if (!e.alive) continue;
    e.attackCd -= dt;
    if (e.status.tauntUntil > t) e.attackTarget = e.status.tauntBy;
    if (e.attackTarget == null) continue;
    const tgt = w.byId.get(e.attackTarget);
    if (!tgt || !w.isTargetable(tgt) || (e.team !== 2 && tgt.team !== 2 && tgt.team === e.team) || (e.team !== tgt.team && !tgt.visible && e.team === w.player?.team && e.kind === "hero" && e.hero?.isPlayer)) {
      e.attackTarget = null;
      continue;
    }
    const d = w.dist(e.pos, tgt.pos) - tgt.radius;
    if (d <= e.stats.range) {
      e.path = [];
      e.rot = Math.atan2(tgt.pos.x - e.pos.x, tgt.pos.z - e.pos.z);
      if (e.status.stunUntil > t) continue;
      if (e.attackCd <= 0) {
        e.attackCd = 1 / e.stats.atkSpeed;
        e.lastAttackTime = t;
        let dmg = e.stats.ad;
        let critical = false;
        if (e.hero?.defId === "archer") {
          e.hero.attackCount++;
          if (e.hero.attackCount % 4 === 0) { dmg *= 2; critical = true; }
        }
        if (isRanged(e)) {
          fireProjectile(w, e, {
            targetId: tgt.id, damage: dmg, magic: false, speed: e.kind === "tower" ? 22 : 18,
            color: e.kind === "tower" ? (e.team === 0 ? 0x7fb8ff : 0xff7a5c) : e.team === 0 ? 0xbcd6ff : e.team === 1 ? 0xffc2a8 : 0xd8d8a0,
            size: e.kind === "tower" ? 0.45 : 0.22, isAuto: true, critical,
          });
        } else {
          w.damage(e, tgt, dmg, false, critical);
        }
      }
    } else if (e.kind !== "tower" && e.kind !== "altar") {
      if (e.status.rootUntil > t) continue;
      if (e.kind === "hero") {
        if (t >= e.repathAt || e.path.length === 0) {
          e.path = findPath(e.pos, tgt.pos);
          e.repathAt = t + 0.4;
        }
      } else {
        e.path = [{ ...tgt.pos }];
      }
    } else {
      e.attackTarget = null;
    }
  }
}
