import { useSyncExternalStore } from "react";
import type { World } from "./ecs/world";
import type { KillEvent, Team } from "./types";

export interface HeroRow {
  id: number; name: string; defId: string; team: Team; level: number; k: number; d: number; a: number; cs: number; gold: number; alive: boolean; respawn: number; items: (string | null)[];
}
export interface HudSnapshot {
  time: number;
  version: number;
  hp: number; maxHp: number; mana: number; maxMana: number; level: number; xp: number; gold: number; alive: boolean; respawn: number;
  stats: { ad: number; ap: number; armor: number; mr: number; speed: number; atkSpeed: number };
  cds: number[]; canCast: boolean[]; items: (string | null)[]; defId: string; targeting: number; buffed: boolean; shield: number;
  heroes: HeroRow[]; kills: KillEvent[]; messages: { t: number; text: string }[]; winner: Team | null; teamKills: [number, number];
}

let snap: HudSnapshot | null = null;
const subs = new Set<() => void>();

export function publishHud(w: World) {
  const me = w.player;
  if (!me?.hero) return;
  const h = me.hero;
  const heroes: HeroRow[] = w.entities.filter((e) => e.hero).map((e) => ({
    id: e.id, name: e.hero!.name, defId: e.hero!.defId, team: e.team, level: e.hero!.level, k: e.hero!.kills, d: e.hero!.deaths, a: e.hero!.assists,
    cs: e.hero!.cs, gold: Math.floor(e.hero!.gold), alive: e.alive, respawn: Math.max(0, e.hero!.respawnAt - w.time), items: [...e.hero!.items],
  }));
  snap = {
    time: w.time, version: w.version,
    hp: me.hp, maxHp: me.stats.maxHp, mana: me.mana, maxMana: me.stats.maxMana, level: h.level, xp: h.xp, gold: Math.floor(h.gold), alive: me.alive,
    respawn: Math.max(0, h.respawnAt - w.time),
    stats: { ad: me.stats.ad, ap: me.stats.ap, armor: me.stats.armor, mr: me.stats.mr, speed: me.stats.speed, atkSpeed: me.stats.atkSpeed },
    cds: [...h.cds], canCast: [0, 1, 2, 3].map((i) => (i === 3 ? h.level >= 6 : true)), items: [...h.items], defId: h.defId,
    targeting: w.input.targeting, buffed: me.status.buffUntil > w.time, shield: me.status.shieldUntil > w.time ? me.status.shield : 0,
    heroes, kills: [...w.killFeed], messages: w.messages.filter((m) => w.time - m.t < 5), winner: w.winner,
    teamKills: [heroes.filter((x) => x.team === 0).reduce((s, x) => s + x.k, 0), heroes.filter((x) => x.team === 1).reduce((s, x) => s + x.k, 0)],
  };
  subs.forEach((f) => f());
}

export function resetHud() { snap = null; }

export function useHud(): HudSnapshot | null {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => snap,
    () => null,
  );
}
