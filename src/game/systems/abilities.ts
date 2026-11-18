import type { World } from "../ecs/world";
import type { Entity, Projectile, Vec } from "../types";
import { abilityLevel, heroById } from "../data/heroes";
import { isWalkable } from "../map/map";
import { lineOfWalk } from "../map/pathfinding";

type ProjOpts = Partial<Omit<Projectile, "pos" | "team" | "sourceId" | "active" | "hit">> & { damage: number };

export function fireProjectile(w: World, src: Entity, o: ProjOpts) {
  let p = w.projectiles.find((x) => !x.active);
  if (!p) {
    if (w.projectiles.length > 150) return;
    p = { active: false } as Projectile;
    w.projectiles.push(p);
  }
  Object.assign(p, {
    active: true, pos: { x: src.pos.x, z: src.pos.z }, dir: { x: 0, z: 1 }, speed: 18, targetId: null,
    team: src.team, sourceId: src.id, magic: false, width: 0.8, maxDist: 20, traveled: 0, color: 0xffffff,
    size: 0.3, onHit: "none", effectDur: 0, pierce: false, hit: new Set<number>(), isAbility: false, isAuto: false, critical: false,
    ...o,
  });
}

function scaled(src: Entity, idx: number) {
  const def = heroById(src.hero!.defId).abilities[idx]!;
  const lvl = Math.max(1, abilityLevel(src.hero!.level, idx));
  const power = src.hero!.defId === "archer" ? src.stats.ad : src.stats.ap + src.stats.ad * 0.2;
  return def.base + def.perLevel * (lvl - 1) + def.ratio * power;
}

function clampRange(from: Vec, to: Vec, range: number): Vec {
  const dx = to.x - from.x, dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d <= range || d === 0) return { ...to };
  return { x: from.x + (dx / d) * range, z: from.z + (dz / d) * range };
}

function furthestWalkable(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x, dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  const steps = Math.ceil(d / 0.3);
  let last = { ...from };
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + (dx * i) / steps, z: from.z + (dz * i) / steps };
    if (!isWalkable(p.x, p.z)) break;
    last = p;
  }
  return last;
}

const enemiesNear = (w: World, src: Entity, pos: Vec, r: number) =>
  w.entities.filter((e) => e.alive && e.team !== src.team && w.isTargetable(e) && e.kind !== "altar" && w.dist(e.pos, pos) <= r + e.radius);

function onAbilityHit(w: World, src: Entity) {
  if (src.hero?.defId === "mage" || src.hero?.defId === "maelis") src.hero.cds = src.hero.cds.map((c) => Math.max(0, c - 0.6));
}

export function canCast(w: World, e: Entity, idx: number) {
  const h = e.hero;
  if (!h || !e.alive) return false;
  const def = heroById(h.defId).abilities[idx];
  if (!def) return false;
  if (abilityLevel(h.level, idx) === 0) return false;
  if (h.cds[idx]! > 0) return false;
  if (e.mana < def.mana) return false;
  if (e.status.stunUntil > w.time) return false;
  return true;
}

/** Executa a habilidade idx do herói, mirando no ponto informado. */
export function castAbility(w: World, e: Entity, idx: number, point: Vec): boolean {
  if (!canCast(w, e, idx)) return false;
  const h = e.hero!;
  const def = heroById(h.defId).abilities[idx]!;
  const lvl = abilityLevel(h.level, idx);
  const val = scaled(e, idx);
  const dirx = point.x - e.pos.x, dirz = point.z - e.pos.z;
  const dl = Math.hypot(dirx, dirz) || 1;
  const dir = { x: dirx / dl, z: dirz / dl };
  const t = w.time;
  const accent = heroById(h.defId).accent;
  e.rot = Math.atan2(dir.x, dir.z);

  switch (def.kind) {
    case "dash":
    case "blink":
    case "leap": {
      if (e.status.rootUntil > t && def.kind !== "blink") return false;
      const target = clampRange(e.pos, point, def.range);
      const dest = def.kind === "blink" ? (isWalkable(target.x, target.z) ? target : furthestWalkable(e.pos, target)) : furthestWalkable(e.pos, target);
      w.addFx(e.pos, 1.2, accent, 0.4);
      e.pos.x = dest.x; e.pos.z = dest.z;
      e.path = [];
      if (def.radius > 0) {
        const hit = enemiesNear(w, e, dest, def.radius);
        for (const x of hit) {
          w.damage(e, x, val, true);
          x.status.stunUntil = Math.max(x.status.stunUntil, t + (def.kind === "leap" ? 1 : 0.5));
        }
        w.addFx(dest, def.radius, accent, 0.6);
      } else w.addFx(dest, 1.2, accent, 0.4);
      break;
    }
    case "selfShield":
      e.status.shield = val + e.stats.maxHp * 0.06;
      e.status.shieldUntil = t + 3;
      w.addFx(e.pos, 1.4, 0xc9a227, 3, 1);
      break;
    case "taunt": {
      for (const x of enemiesNear(w, e, e.pos, def.radius)) {
        if (x.kind === "tower") continue;
        x.status.tauntUntil = t + 1.5;
        x.status.tauntBy = e.id;
        w.damage(e, x, val, true);
      }
      w.addFx(e.pos, def.radius, 0xd94c2a, 0.6);
      break;
    }
    case "skillshot":
    case "root":
      fireProjectile(w, e, {
        dir, speed: 22, damage: val, magic: true, width: def.radius, maxDist: def.range,
        color: accent, size: 0.45, onHit: def.kind === "root" ? "root" : "none", effectDur: 1.5, isAbility: true,
      });
      break;
    case "multishot":
      for (const a of [-0.25, 0, 0.25]) {
        const c = Math.cos(a), s = Math.sin(a);
        fireProjectile(w, e, {
          dir: { x: dir.x * c - dir.z * s, z: dir.x * s + dir.z * c }, speed: 24, damage: val, magic: false,
          width: def.radius, maxDist: def.range, color: accent, size: 0.25, isAbility: true,
        });
      }
      break;
    case "globalArrow":
      fireProjectile(w, e, {
        dir, speed: 30, damage: val, magic: false, width: def.radius, maxDist: def.range, color: accent,
        size: 0.6, onHit: "stun", effectDur: 1.5, isAbility: true,
      });
      break;
    case "slowZone":
    case "trap":
    case "meteor": {
      const p = clampRange(e.pos, point, def.range);
      w.zones.push({
        pos: p, radius: def.radius, team: e.team, sourceId: e.id, start: t,
        until: t + (def.kind === "slowZone" ? 3 : def.kind === "trap" ? 30 : 1),
        kind: def.kind === "slowZone" ? "slow" : def.kind, damage: val, color: accent, done: false,
      });
      break;
    }
    case "heal":
    case "allyShield": {
      const allies = w.entities.filter((x) => x.hero && x.alive && x.team === e.team && w.dist(x.pos, e.pos) <= def.range);
      allies.sort((a, b) => w.dist(a.pos, point) - w.dist(b.pos, point));
      const tgt = allies[0] ?? e;
      if (def.kind === "heal") w.heal(tgt, val);
      else { tgt.status.shield = val; tgt.status.shieldUntil = t + 3; }
      w.addFx(tgt.pos, 1.5, def.kind === "heal" ? 0x7be08a : 0xf3e7a8, 0.7, 0.2);
      break;
    }
    case "aoeHeal":
      for (const x of w.entities) if (x.hero && x.alive && x.team === e.team && w.dist(x.pos, e.pos) <= def.radius) {
        w.heal(x, val);
        w.addFx(x.pos, 1.5, 0x7be08a, 0.8);
      }
      w.addFx(e.pos, def.radius, 0xf3e7a8, 1);
      break;
  }
  e.mana -= def.mana;
  h.cds[idx] = def.cd[Math.max(0, lvl - 1)] ?? def.cd[0]!;
  return true;
}

/** Atualiza projéteis e zonas. */
export function projectileSystem(w: World, dt: number) {
  const t = w.time;
  for (const p of w.projectiles) {
    if (!p.active) continue;
    const src = w.byId.get(p.sourceId);
    if (p.targetId != null) {
      const tgt = w.byId.get(p.targetId);
      if (!tgt || !tgt.alive) { p.active = false; continue; }
      const dx = tgt.pos.x - p.pos.x, dz = tgt.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      const step = p.speed * dt;
      if (d <= step + tgt.radius * 0.5) {
        w.damage(src, tgt, p.damage, p.magic, p.critical);
        p.active = false;
      } else {
        p.dir.x = dx / d; p.dir.z = dz / d;
        p.pos.x += p.dir.x * step; p.pos.z += p.dir.z * step;
      }
      continue;
    }
    const step = p.speed * dt;
    p.pos.x += p.dir.x * step; p.pos.z += p.dir.z * step;
    p.traveled += step;
    if (p.traveled >= p.maxDist) { p.active = false; continue; }
    for (const e of w.entities) {
      if (!e.alive || e.team === p.team || p.hit.has(e.id) || e.kind === "altar" || e.kind === "tower") continue;
      if (p.onHit === "stun" && e.kind !== "hero") continue; // flecha do horizonte só para em heróis
      if (w.dist(e.pos, p.pos) > e.radius + p.width) continue;
      p.hit.add(e.id);
      w.damage(src, e, p.damage, p.magic, p.critical);
      if (p.onHit === "root") e.status.rootUntil = t + p.effectDur;
      if (p.onHit === "stun") e.status.stunUntil = t + p.effectDur;
      w.addFx(e.pos, 1, p.color, 0.35, 0.8);
      if (src && p.isAbility) onAbilityHit(w, src);
      if (!p.pierce) { p.active = false; break; }
    }
  }
  for (const z of w.zones) {
    if (z.done) continue;
    const src = w.byId.get(z.sourceId);
    const inside = w.entities.filter((e) => e.alive && e.team !== z.team && e.kind !== "tower" && e.kind !== "altar" && w.dist(e.pos, z.pos) <= z.radius + e.radius);
    if (z.kind === "slow") {
      for (const e of inside) {
        e.status.slowUntil = t + 0.2; e.status.slowFactor = 0.6;
        w.damage(src, e, z.damage * dt, true);
      }
    } else if (z.kind === "trap" && t - z.start > 0.5) {
      const first = inside[0];
      if (first) {
        first.status.rootUntil = t + 1.5;
        w.damage(src, first, z.damage, true);
        w.addFx(z.pos, 2, z.color, 0.6);
        z.done = true;
      }
    } else if (z.kind === "meteor" && t >= z.until) {
      for (const e of inside) w.damage(src, e, z.damage, true);
      w.addFx(z.pos, z.radius, 0xff6a2a, 0.9);
      w.addFx(z.pos, z.radius * 0.5, 0xffd27a, 0.6, 0.3);
      if (src && inside.length) onAbilityHit(w, src);
      z.done = true;
    }
    if (t >= z.until) z.done = true;
  }
  if (w.zones.length > 40 || w.tick % 60 === 0) w.zones = w.zones.filter((z) => !z.done);
  void lineOfWalk;
}
