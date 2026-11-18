import type { World } from "../ecs/world";
import type { Stats } from "../types";
import { CAMPS, FOUNTAIN, FOUNTAIN_R, laneWaypoints, towerLayout } from "../map/map";

const st = (o: Partial<Stats>): Stats => ({
  maxHp: 100, maxMana: 0, ad: 10, ap: 0, armor: 0, mr: 0, speed: 0, range: 1.5, atkSpeed: 1, hpRegen: 0, manaRegen: 0, ...o,
});

export function buildStructures(w: World) {
  for (const team of [0, 1] as const) {
    const L = towerLayout(team);
    const ids = new Map<string, number>();
    for (const tw of L.towers) {
      const e = w.add(w.makeBase("tower", team, tw.pos, st({ maxHp: tw.tier === 2 ? 3200 : 2600, ad: 150, armor: 40, mr: 40, range: 9, atkSpeed: 0.85 }), 1.4));
      e.tower = { protectedBy: [], unlockedBy: [] };
      ids.set(`${tw.lane}:${tw.tier}`, e.id);
    }
    const innerTowers: number[] = [];
    for (const lane of [0, 1, 2] as const) {
      const outer = ids.get(`${lane}:0`);
      const inner = ids.get(`${lane}:1`);
      if (outer !== undefined && inner !== undefined) {
        w.byId.get(inner)!.tower!.protectedBy = [outer];
        innerTowers.push(inner);
      }
    }
    const baseTowerId = ids.get("-1:2")!;
    const baseTower = w.byId.get(baseTowerId)!;
    baseTower.tower!.unlockedBy = innerTowers;
    const altar = w.add(w.makeBase("altar", team, L.altar, st({ maxHp: 5000, armor: 30, mr: 30, range: 0, ad: 0 }), 2.4));
    altar.tower = { protectedBy: [baseTowerId], unlockedBy: [] };
  }
}

export function spawnWave(w: World) {
  for (const team of [0, 1] as const)
    for (const lane of [0, 1, 2] as const) {
      const wps = laneWaypoints(team, lane);
      for (let i = 0; i < 4; i++) {
        const ranged = i === 3;
        const start = wps[0]!;
        const laneZ = lane === 0 ? -2 : lane === 2 ? 2 : 0;
        const e = w.add(w.makeBase("minion", team, { x: start.x + (team === 0 ? 2 : -2) - i * (team === 0 ? 1.2 : -1.2), z: start.z + laneZ }, st(ranged
          ? { maxHp: 300 + w.time * 0.6, ad: 22 + w.time * 0.02, speed: 4.4, range: 5.5, atkSpeed: 0.7 }
          : { maxHp: 460 + w.time * 0.8, ad: 14 + w.time * 0.02, speed: 4.4, range: 1.3, atkSpeed: 0.9, armor: 10 }), 0.5));
        e.minion = { lane, wp: 1, ranged };
      }
    }
}

export function spawnCamp(w: World, idx: number) {
  const c = CAMPS[idx]!;
  const mk = (dx: number, dz: number, big: boolean) => {
    const e = w.add(w.makeBase("monster", 2, { x: c.pos.x + dx, z: c.pos.z + dz }, st(big
      ? { maxHp: 2200, ad: 60, armor: 20, mr: 20, speed: 4, range: 2.2, atkSpeed: 0.7 }
      : { maxHp: 700, ad: 30, armor: 10, speed: 5, range: 1.6, atkSpeed: 0.9 }), big ? 1.4 : 0.7));
    e.monster = { camp: idx, home: { ...e.pos }, big };
  };
  if (c.big) mk(0, 0, true);
  else { mk(-1.2, 0, false); mk(1.2, 0, false); }
}

/** Ondas, acampamentos, respawn de heróis, regeneração, fonte e passivas. */
export function spawnSystem(w: World, dt: number) {
  const t = w.time;
  if (t >= w.nextWave) { spawnWave(w); w.nextWave += 30; }
  for (let i = 0; i < CAMPS.length; i++) {
    const r = w.campRespawn[i]!;
    if (r > 0 && t >= r && !w.entities.some((e) => e.monster?.camp === i && e.alive)) {
      w.campRespawn[i] = 0;
      spawnCamp(w, i);
    }
  }
  // limpa corpos
  for (let i = w.entities.length - 1; i >= 0; i--) {
    const e = w.entities[i]!;
    if (!e.alive && e.kind !== "hero" && e.kind !== "tower" && e.kind !== "altar" && t - e.deathTime > 1.5) w.remove(e);
  }
  for (const e of w.entities) {
    const h = e.hero;
    if (!h) continue;
    if (!e.alive) {
      if (t >= h.respawnAt && w.winner === null) {
        const f = FOUNTAIN[e.team as 0 | 1];
        e.alive = true; e.pos = { x: f.x, z: f.z + (Math.random() - 0.5) * 4 };
        e.hp = e.stats.maxHp; e.mana = e.stats.maxMana; e.path = []; e.attackTarget = null;
        e.status.stunUntil = e.status.rootUntil = e.status.slowUntil = e.status.tauntUntil = 0;
        w.version++;
      }
      continue;
    }
    for (let i = 0; i < 4; i++) h.cds[i] = Math.max(0, h.cds[i]! - dt);
    w.heal(e, e.stats.hpRegen * dt);
    e.mana = Math.min(e.stats.maxMana, e.mana + e.stats.manaRegen * dt);
    h.gold += 2 * dt;
    const f = FOUNTAIN[e.team as 0 | 1];
    if (w.dist(e.pos, f) < FOUNTAIN_R + 1) {
      w.heal(e, e.stats.maxHp * 0.12 * dt);
      e.mana = Math.min(e.stats.maxMana, e.mana + e.stats.maxMana * 0.12 * dt);
    }
    if (h.defId === "warrior" && e.hp < e.stats.maxHp * 0.3) w.heal(e, e.stats.maxHp * 0.03 * dt);
    if (h.defId === "support")
      for (const a of w.entities) if (a.hero && a.alive && a.team === e.team && a !== e && w.dist(a.pos, e.pos) < 7) w.heal(a, a.stats.maxHp * 0.01 * dt);
    if (e.status.shieldUntil < t) e.status.shield = 0;
  }
  // fonte mata inimigos que invadem
  for (const e of w.entities) {
    if (!e.alive || e.kind !== "hero") continue;
    const ef = FOUNTAIN[(1 - (e.team as number)) as 0 | 1];
    if (w.dist(e.pos, ef) < FOUNTAIN_R) w.damage(undefined, e, 400 * dt, true);
  }
}
