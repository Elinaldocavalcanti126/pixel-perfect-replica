import type { Stats } from "../types";

export interface ItemDef {
  id: string;
  name: string;
  cost: number;
  desc: string;
  stats: Partial<Stats>;
  icon: string;
}

export const ITEMS: ItemDef[] = [
  { id: "blade", name: "Lâmina de Ferro", cost: 350, desc: "+15 de dano", stats: { ad: 15 }, icon: "⚔" },
  { id: "staff", name: "Cajado Rúnico", cost: 400, desc: "+30 de poder", stats: { ap: 30 }, icon: "✦" },
  { id: "plate", name: "Couraça", cost: 300, desc: "+20 de armadura", stats: { armor: 20 }, icon: "⛨" },
  { id: "crystal", name: "Cristal Vital", cost: 400, desc: "+200 de vida", stats: { maxHp: 200 }, icon: "❤" },
  { id: "boots", name: "Botas Andarilhas", cost: 300, desc: "+0,8 de velocidade", stats: { speed: 0.8 }, icon: "➶" },
  { id: "bow", name: "Corda Veloz", cost: 400, desc: "+20% vel. de ataque", stats: { atkSpeed: 0.15 }, icon: "➹" },
  { id: "amulet", name: "Amuleto Lunar", cost: 350, desc: "+250 mana, +2 regen. de mana", stats: { maxMana: 250, manaRegen: 2 }, icon: "☾" },
  { id: "cloak", name: "Manto Espectral", cost: 350, desc: "+25 de resist. mágica", stats: { mr: 25 }, icon: "❖" },
  { id: "colossus", name: "Coração do Colosso", cost: 1100, desc: "+400 de vida, +25 armadura", stats: { maxHp: 400, armor: 25 }, icon: "⬢" },
  { id: "grimoire", name: "Grimório Abissal", cost: 1100, desc: "+75 de poder", stats: { ap: 75 }, icon: "✷" },
  { id: "dusk", name: "Lâmina do Crepúsculo", cost: 1100, desc: "+40 de dano, +15% vel. ataque", stats: { ad: 40, atkSpeed: 0.12 }, icon: "☽" },
  { id: "aegis", name: "Égide Prateada", cost: 1000, desc: "+250 vida, +30 resist. mágica", stats: { maxHp: 250, mr: 30 }, icon: "⛉" },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
