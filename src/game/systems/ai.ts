import type { World } from "../ecs/world";
import type { Entity } from "../types";
import { FOUNTAIN, laneWaypoints, BASE } from "../map/map";
import { findPath } from "../map/pathfinding";
import { castAbility, canCast } from "./abilities";
import { heroById } from "../data/heroes";
import { buyBest } from "./economy";

function nearestEnemy(w: World, e: Entity, range: number, filter?: (x: Entity) => boolean): Entity | undefined {
  let best: Entity | undefined, bd = range;
  for (const x of w.entities) {
    if (!x.alive || x.team === e.team || !w.isTargetable(x)) continue;
    if (e.team !== 2 && x.team === 2 && e.kind !== "hero") continue;
    if (filter && !filter(x)) continue;
    const d = w.dist(e.pos, x.pos);
    if (d < bd) { bd = d; best = x; }
  }
  return best;
}

export function minionSystem(w: World) {
  for (const e of w.entities) {
    if (!e.alive || !e.minion || w.tick % 5 !== e.id % 5) continue;
    const cur = e.attackTarget != null ? w.byId.get(e.attackTarget) : undefined;
    if (!cur || !cur.alive || w.dist(cur.pos, e.pos) > 9) {
      const tgt = nearestEnemy(w, e, 7, (x) => x.team !== 2);
      e.attackTarget = tgt?.id ?? null;
    }
    if (e.attackTarget == null) {
      const wps = laneWaypoints(e.team as 0 | 1, e.minion.lane);
      let wp = wps[e.minion.wp];
      if (wp && w.dist(e.pos, wp) < 2 && e.minion.wp < wps.length - 1) { e.minion.wp++; wp = wps[e.minion.wp]; }
      if (wp) e.path = [wp];
    }
  }
}

export function towerSystem(w: World) {
  for (const e of w.entities) {
    if (!e.alive || e.kind !== "tower") continue;
    const cur = e.attackTarget != null ? w.byId.get(e.attackTarget) : undefined;
    // prioridade: herói inimigo que ataca herói aliado próximo
    const aggressor = w.entities.find((x) => x.hero && x.alive && x.team !== e.team && w.dist(x.pos, e.pos) <= e.stats.range && x.attackTarget != null && w.byId.get(x.attackTarget)?.hero?.constructor && w.byId.get(x.attackTarget)!.team === e.team);
    if (aggressor) { e.attackTarget = aggressor.id; continue; }
    if (cur && cur.alive && w.dist(cur.pos, e.pos) <= e.stats.range) continue;
    const minion = nearestEnemy(w, e, e.stats.range, (x) => x.kind === "minion");
    e.attackTarget = (minion ?? nearestEnemy(w, e, e.stats.range, (x) => x.team !== 2))?.id ?? null;
  }
}

export function monsterSystem(w: World) {
  for (const e of w.entities) {
    if (!e.alive || !e.monster) continue;
    const home = e.monster.home;
    if (w.dist(e.pos, home) > 10) { e.attackTarget = null; e.path = [home]; e.hp = Math.min(e.stats.maxHp, e.hp + e.stats.maxHp * 0.02); continue; }
    if (e.attackTarget == null && e.lastAttacker > 0) {
      const a = w.byId.get(e.lastAttacker);
      if (a?.alive) e.attackTarget = a.id;
      e.lastAttacker = -1;
    }
    if (e.attackTarget == null && e.path.length === 0 && w.dist(e.pos, home) > 0.5) {
      e.path = [home];
      e.hp = Math.min(e.stats.maxHp, e.hp + e.stats.maxHp * 0.05);
    }
  }
}

function useAbilitiesOn(w: World, e: Entity, tgt: Entity) {
  const def = heroById(e.hero!.defId);
  const d = w.dist(e.pos, tgt.pos);
  for (let i = 0; i < 4; i++) {
    if (!canCast(w, e, i)) continue;
    const a = def.abilities[i]!;
    switch (a.kind) {
      case "selfShield": if (e.hp < e.stats.maxHp * 0.7) castAbility(w, e, i, e.pos); break;
      case "taunt": if (d < a.radius) castAbility(w, e, i, e.pos); break;
      case "aoeHeal": if (e.hp < e.stats.maxHp * 0.5) castAbility(w, e, i, e.pos); break;
      case "heal": case "allyShield": {
        const ally = w.entities.find((x) => x.hero && x.alive && x.team === e.team && x.hp < x.stats.maxHp * 0.6 && w.dist(x.pos, e.pos) < a.range);
        if (ally) castAbility(w, e, i, ally.pos);
        break;
      }
      case "blink": break;
      case "dash": if (a.radius > 0 && d < a.range && d > 3) castAbility(w, e, i, tgt.pos); break;
      default: if (d < Math.min(a.range, 14)) castAbility(w, e, i, tgt.pos);
    }
  }
}

/** IA dos bots: máquina de estados farm / push / fight / retreat / defend. */
export function botSystem(w: World) {
  for (const e of w.entities) {
    const h = e.hero;
    if (!h || !h.bot || !e.alive) continue;
    const b = h.bot;
    if (w.time < b.think) continue;
    b.think = w.time + 0.35 + Math.random() * 0.2;
    const team = e.team as 0 | 1;
    const f = FOUNTAIN[team];
    const hpf = e.hp / e.stats.maxHp;

    if (b.state === "retreat") {
      if (w.dist(e.pos, f) < 6) {
        buyBest(w, e);
        if (hpf > 0.9 && e.mana > e.stats.maxMana * 0.6) b.state = "farm";
        e.path = []; e.attackTarget = null;
      } else if (e.path.length === 0) e.path = findPath(e.pos, f);
      continue;
    }
    if (hpf < 0.3) {
      b.state = "retreat"; e.attackTarget = null; e.path = findPath(e.pos, f);
      const near = nearestEnemy(w, e, 6, (x) => x.kind === "hero");
      const bi = heroById(h.defId).abilities.findIndex((a) => a.kind === "blink" || (a.kind === "dash" && a.radius === 0));
      if (near && bi >= 0) castAbility(w, e, bi, f);
      continue;
    }
    // defesa da base
    const base = BASE[team];
    const invader = nearestEnemy(w, { ...e, pos: base } as Entity, 16, (x) => x.team !== 2);
    if (invader && w.dist(e.pos, base) < 40) { b.state = "defend"; e.attackTarget = invader.id; useAbilitiesOn(w, e, invader); continue; }

    // luta: herói inimigo próximo e isolado
    const foe = nearestEnemy(w, e, 11, (x) => x.kind === "hero");
    if (foe) {
      const allies = w.entities.filter((x) => x.hero && x.alive && x.team === team && w.dist(x.pos, foe.pos) < 12).length;
      const enemies = w.entities.filter((x) => x.hero && x.alive && x.team === foe.team && w.dist(x.pos, foe.pos) < 12).length;
      const enemyTower = w.entities.some((x) => x.kind === "tower" && x.alive && x.team !== team && w.dist(x.pos, foe.pos) < 9.5);
      if (!enemyTower && allies >= enemies && foe.hp / foe.stats.maxHp < hpf + 0.25) {
        b.state = "fight"; e.attackTarget = foe.id; useAbilitiesOn(w, e, foe); continue;
      }
    }
    // farm / push
    b.state = "farm";
    const minion = nearestEnemy(w, e, 12, (x) => x.kind === "minion");
    if (minion) {
      const towerCover = w.entities.some((x) => x.kind === "tower" && x.alive && x.team !== team && w.isTargetable(x) && w.dist(x.pos, minion.pos) < 9.5);
      const allyMinionsNear = w.entities.filter((x) => x.minion && x.alive && x.team === team && w.dist(x.pos, minion.pos) < 9).length;
      if (!towerCover || allyMinionsNear >= 2) {
        const low = w.entities.filter((x) => x.minion && x.alive && x.team !== team && w.dist(x.pos, e.pos) < 10).sort((a, b2) => a.hp - b2.hp)[0];
        e.attackTarget = (low ?? minion).id;
        continue;
      }
    }
    // avança junto com os aliados da lane
    const allyMinions = w.entities.filter((x) => x.minion && x.alive && x.team === team && x.minion.lane === h.lane);
    const tower = nearestEnemy(w, e, 10, (x) => x.kind === "tower" || x.kind === "altar");
    if (tower && allyMinions.some((m) => w.dist(m.pos, tower.pos) < 9)) { b.state = "push"; e.attackTarget = tower.id; continue; }
    e.attackTarget = null;
    let goal = allyMinions.sort((a, c) => (team === 0 ? c.pos.x - a.pos.x : a.pos.x - c.pos.x))[0]?.pos;
    if (!goal) { const wps = laneWaypoints(team, h.lane); goal = wps[2]!; }
    if (w.dist(e.pos, goal) > 4 && (e.path.length === 0 || w.time > e.repathAt)) {
      e.path = findPath(e.pos, { x: goal.x - (team === 0 ? 2 : -2), z: goal.z });
      e.repathAt = w.time + 2;
    }
  }
}
