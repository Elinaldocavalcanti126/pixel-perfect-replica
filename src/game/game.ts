import { World } from "./ecs/world";
import { HEROES } from "./data/heroes";
import { buildStructures, spawnSystem } from "./systems/spawn";
import { movementSystem } from "./systems/movement";
import { combatSystem } from "./systems/combat";
import { castAbility, projectileSystem, canCast } from "./systems/abilities";
import { botSystem, minionSystem, monsterSystem, towerSystem } from "./systems/ai";
import { fogSystem } from "./systems/fog";
import { findPath } from "./map/pathfinding";
import { heroById } from "./data/heroes";
import type { Vec } from "./types";
import { publishHud } from "./store";

export const TICK = 1 / 30;

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Cria uma partida 5x5: jogador + 4 bots aliados contra 5 bots. */
export function createMatch(playerHero: string): World {
  const w = new World();
  buildStructures(w);
  const ids = HEROES.map((h) => h.id);
  const blue = [playerHero, ...shuffled(ids.filter((id) => id !== playerHero)).slice(0, 4)];
  while (blue.length < 5) blue.push(ids[Math.floor(Math.random() * ids.length)]!);
  const red = shuffled(ids).slice(0, 5);
  while (red.length < 5) red.push(ids[Math.floor(Math.random() * ids.length)]!);
  const laneOrder = [0, 1, 2, 1, 2] as const;
  blue.forEach((id, i) => {
    const e = w.spawnHero(id, 0, i === 0, laneOrder[i % laneOrder.length]!);
    if (i === 0) w.playerId = e.id;
  });
  red.forEach((id, i) => w.spawnHero(id, 1, false, laneOrder[i % laneOrder.length]!));
  return w;
}

/** Passo fixo de simulação (30 Hz), independente da renderização. */
export function step(w: World) {
  if (w.paused || w.winner !== null) return;
  w.time += TICK;
  w.tick++;
  spawnSystem(w, TICK);
  botSystem(w);
  minionSystem(w);
  towerSystem(w);
  monsterSystem(w);
  combatSystem(w, TICK);
  movementSystem(w, TICK);
  projectileSystem(w, TICK);
  fogSystem(w);
  if (w.tick % 3 === 0) publishHud(w);
}

// ---- Comandos do jogador (camada de input, pronta para virar mensagens de rede) ----
export function cmdRightClick(w: World, p: Vec) {
  const me = w.player;
  if (!me || !me.alive) return;
  w.input.targeting = -1;
  let best = null as null | (typeof w.entities)[number], bd = 1.8;
  for (const e of w.entities) {
    if (!e.alive || e.team === me.team || !e.visible || !w.isTargetable(e)) continue;
    const d = w.dist(e.pos, p) - e.radius;
    if (d < bd) { bd = d; best = e; }
  }
  if (best) { me.attackTarget = best.id; me.repathAt = 0; w.addFx(best.pos, best.radius + 0.4, 0xd94c2a, 0.3); }
  else { me.attackTarget = null; me.path = findPath(me.pos, p); w.addFx(p, 0.6, 0x9fd18b, 0.35); }
}

export function cmdStop(w: World) {
  const me = w.player;
  if (!me) return;
  me.path = []; me.attackTarget = null;
}

/** Touch movement uses the same wall-aware pathfinder without click VFX or cancelling aim. */
export function cmdMoveStick(w: World, direction: Vec) {
  const me = w.player;
  if (!me?.alive || w.paused || w.winner !== null) return;
  if (Math.hypot(direction.x, direction.z) < 0.01) { cmdStop(w); return; }
  me.attackTarget = null;
  me.path = findPath(me.pos, { x: me.pos.x + direction.x * 2, z: me.pos.z + direction.z * 2 });
}

export function cmdAttackNearest(w: World) {
  const me = w.player;
  if (!me?.alive || w.paused || w.winner !== null) return;
  const current = me.attackTarget === null ? undefined : w.byId.get(me.attackTarget);
  if (current?.visible && current.team !== me.team && w.isTargetable(current) && w.dist(me.pos, current.pos) <= me.stats.range + current.radius + 3) return;
  const target = w.entities.filter((e) => e.team !== me.team && e.visible && w.isTargetable(e) && w.dist(me.pos, e.pos) <= me.stats.range + e.radius + 3)
    .sort((a, b) => w.dist(me.pos, a.pos) - w.dist(me.pos, b.pos))[0];
  if (!target) return;
  me.attackTarget = target.id;
  me.repathAt = 0;
}

export function cmdAbility(w: World, idx: number) {
  const me = w.player;
  if (!me || !canCast(w, me, idx)) return;
  if (!me.hero || w.paused || w.winner !== null) return;
  const def = heroById(me.hero.defId).abilities[idx];
  if (!def) return;
  if (def.targeted) w.input.targeting = w.input.targeting === idx ? -1 : idx;
  else castAbility(w, me, idx, w.input.mouse);
}

export function cmdConfirm(w: World) {
  const me = w.player;
  if (!me || w.input.targeting < 0 || w.paused || w.winner !== null) return;
  castAbility(w, me, w.input.targeting, w.input.mouse);
  w.input.targeting = -1;
}
