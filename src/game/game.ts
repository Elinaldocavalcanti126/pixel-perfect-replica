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

/** Cria uma partida 5x5: jogador + 4 bots aliados contra 5 bots. */
export function createMatch(playerHero: string): World {
  const w = new World();
  buildStructures(w);
  const ids = HEROES.map((h) => h.id);
  const others = ids.filter((i) => i !== playerHero);
  const blue = [playerHero, ...others, ids[Math.floor(Math.random() * 4)]!];
  const red = [...ids].sort(() => Math.random() - 0.5);
  red.push(ids[Math.floor(Math.random() * 4)]!);
  blue.forEach((id, i) => {
    const e = w.spawnHero(id, 0, i === 0, (i % 2) as 0 | 1);
    if (i === 0) w.playerId = e.id;
  });
  red.forEach((id, i) => w.spawnHero(id, 1, false, (i % 2) as 0 | 1));
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

export function cmdAbility(w: World, idx: number) {
  const me = w.player;
  if (!me || !canCast(w, me, idx)) return;
  const def = heroById(me.hero!.defId).abilities[idx]!;
  if (def.targeted) w.input.targeting = w.input.targeting === idx ? -1 : idx;
  else castAbility(w, me, idx, w.input.mouse);
}

export function cmdConfirm(w: World) {
  const me = w.player;
  if (!me || w.input.targeting < 0) return;
  castAbility(w, me, w.input.targeting, w.input.mouse);
  w.input.targeting = -1;
}
