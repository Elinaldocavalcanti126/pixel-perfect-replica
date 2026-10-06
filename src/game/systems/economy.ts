import type { World } from "../ecs/world";
import type { Entity } from "../types";
import { ITEMS, itemById } from "../data/items";
import { FOUNTAIN, FOUNTAIN_R } from "../map/map";

export const inShopRange = (w: World, e: Entity) => !e.alive || w.dist(e.pos, FOUNTAIN[e.team as 0 | 1]) < FOUNTAIN_R + 3;

export function buyItem(w: World, e: Entity, id: string): string | null {
  const h = e.hero;
  const it = itemById(id);
  if (!h || !it) return "Item inválido";
  if (!inShopRange(w, e)) return "Volte à base para comprar";
  if (h.gold < it.cost) return "Ouro insuficiente";
  const slot = h.items.indexOf(null);
  if (slot < 0) return "Inventário cheio";
  h.gold -= it.cost;
  h.items[slot] = id;
  w.recalcStats(e);
  return null;
}

export function sellItem(w: World, e: Entity, slot: number) {
  const h = e.hero;
  const id = h?.items[slot];
  if (!h || !id || !inShopRange(w, e)) return;
  h.gold += Math.floor((itemById(id)?.cost ?? 0) * 0.6);
  h.items[slot] = null;
  w.recalcStats(e);
}

const PREFS: Record<string, string[]> = {
  warrior: ["colossus", "plate", "blade", "boots", "aegis", "crystal", "dusk"],
  mage: ["grimoire", "staff", "amulet", "boots", "cloak", "crystal"],
  archer: ["dusk", "bow", "blade", "boots", "crystal", "bow"],
  support: ["staff", "amulet", "aegis", "boots", "crystal", "plate"],
};

export function buyBest(w: World, e: Entity) {
  const prefs = PREFS[e.hero!.defId] ?? ITEMS.map((i) => i.id);
  for (const id of prefs) {
    const it = itemById(id)!;
    if (e.hero!.items.filter((x) => x === id).length >= 1 && id !== "bow") continue;
    if (e.hero!.gold >= it.cost) buyItem(w, e, id);
  }
}
