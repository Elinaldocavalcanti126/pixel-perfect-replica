export type AbilityKind =
  | "dash"
  | "selfShield"
  | "taunt"
  | "leap"
  | "skillshot"
  | "slowZone"
  | "blink"
  | "meteor"
  | "multishot"
  | "trap"
  | "globalArrow"
  | "heal"
  | "allyShield"
  | "root"
  | "aoeHeal";

export interface AbilityDef {
  key: "Q" | "W" | "E" | "R";
  name: string;
  desc: string;
  kind: AbilityKind;
  cd: number[]; // por nível de habilidade
  mana: number;
  range: number;
  radius: number;
  base: number; // dano/cura base
  perLevel: number;
  ratio: number; // escala com AP (ou AD para arqueiro)
  targeted: boolean; // requer clique de confirmação
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  role: string;
  passive: { name: string; desc: string };
  color: number;
  accent: number;
  base: {
    maxHp: number;
    maxMana: number;
    ad: number;
    armor: number;
    mr: number;
    speed: number;
    range: number;
    atkSpeed: number;
    hpRegen: number;
    manaRegen: number;
  };
  perLevel: { maxHp: number; maxMana: number; ad: number; armor: number; mr: number };
  ranged: boolean;
  abilities: AbilityDef[];
}

export const HEROES: HeroDef[] = [
  {
    id: "warrior",
    name: "Thorvak",
    title: "o Muro de Basalto",
    role: "Guerreiro · Tanque",
    passive: { name: "Pele de Pedra", desc: "Abaixo de 30% de vida, regenera 3% da vida máxima por segundo." },
    color: 0x8a6a4a,
    accent: 0xc9a227,
    base: { maxHp: 720, maxMana: 260, ad: 62, armor: 34, mr: 30, speed: 5.4, range: 1.8, atkSpeed: 0.75, hpRegen: 4, manaRegen: 2 },
    perLevel: { maxHp: 105, maxMana: 20, ad: 4, armor: 3.5, mr: 1.5 },
    ranged: false,
    abilities: [
      { key: "Q", name: "Investida", desc: "Avança até o ponto, causando dano e atordoando inimigos no fim.", kind: "dash", cd: [9, 8.5, 8, 7.5, 7], mana: 40, range: 8, radius: 2.5, base: 60, perLevel: 35, ratio: 0.6, targeted: true },
      { key: "W", name: "Égide de Granito", desc: "Ganha um escudo que absorve dano por 3s.", kind: "selfShield", cd: [14, 13, 12, 11, 10], mana: 50, range: 0, radius: 0, base: 90, perLevel: 40, ratio: 0.08, targeted: false },
      { key: "E", name: "Rugido Ancestral", desc: "Provoca inimigos próximos, forçando-os a atacá-lo.", kind: "taunt", cd: [13, 12, 11, 10, 9], mana: 55, range: 0, radius: 5, base: 40, perLevel: 25, ratio: 0.4, targeted: false },
      { key: "R", name: "Salto Sísmico", desc: "Salta até o ponto, esmagando e atordoando em área.", kind: "leap", cd: [80, 70, 60], mana: 100, range: 12, radius: 5, base: 180, perLevel: 110, ratio: 0.8, targeted: true },
    ],
  },
  {
    id: "mage",
    name: "Ilyra",
    title: "Tecelã de Brasas",
    role: "Mago · Burst",
    passive: { name: "Eco Arcano", desc: "Acertar uma habilidade reduz as outras recargas em 0,6s." },
    color: 0x3a3f6b,
    accent: 0xe8743b,
    base: { maxHp: 520, maxMana: 420, ad: 48, armor: 20, mr: 30, speed: 5.3, range: 7, atkSpeed: 0.65, hpRegen: 2.5, manaRegen: 4 },
    perLevel: { maxHp: 80, maxMana: 35, ad: 2.5, armor: 3, mr: 1 },
    ranged: true,
    abilities: [
      { key: "Q", name: "Lança de Brasa", desc: "Projétil em linha que causa alto dano mágico.", kind: "skillshot", cd: [6, 5.5, 5, 4.5, 4], mana: 45, range: 14, radius: 0.9, base: 85, perLevel: 45, ratio: 0.75, targeted: true },
      { key: "W", name: "Pântano Gélido", desc: "Cria uma zona que torna inimigos lentos e causa dano contínuo.", kind: "slowZone", cd: [14, 13, 12, 11, 10], mana: 70, range: 11, radius: 4, base: 25, perLevel: 12, ratio: 0.2, targeted: true },
      { key: "E", name: "Passo Etéreo", desc: "Teleporta-se a uma curta distância.", kind: "blink", cd: [18, 16, 14, 12, 10], mana: 60, range: 7, radius: 0, base: 0, perLevel: 0, ratio: 0, targeted: true },
      { key: "R", name: "Chuva de Cinzas", desc: "Após 1s, um meteoro devasta a área alvo.", kind: "meteor", cd: [70, 60, 50], mana: 120, range: 14, radius: 6, base: 250, perLevel: 130, ratio: 1, targeted: true },
    ],
  },
  {
    id: "archer",
    name: "Kaelis",
    title: "Olho do Bosque",
    role: "Arqueiro · DPS",
    passive: { name: "Flecha Certeira", desc: "Todo 4º ataque básico causa dano dobrado." },
    color: 0x3f5a3a,
    accent: 0xd8c38a,
    base: { maxHp: 560, maxMana: 300, ad: 60, armor: 22, mr: 30, speed: 5.5, range: 8, atkSpeed: 0.85, hpRegen: 3, manaRegen: 2.5 },
    perLevel: { maxHp: 85, maxMana: 22, ad: 4.5, armor: 3, mr: 1 },
    ranged: true,
    abilities: [
      { key: "Q", name: "Leque de Flechas", desc: "Dispara três flechas em cone.", kind: "multishot", cd: [7, 6.5, 6, 5.5, 5], mana: 40, range: 11, radius: 0.7, base: 50, perLevel: 30, ratio: 0.7, targeted: true },
      { key: "W", name: "Armadilha de Espinhos", desc: "Coloca uma armadilha que prende o primeiro inimigo.", kind: "trap", cd: [16, 15, 14, 13, 12], mana: 50, range: 8, radius: 1.6, base: 60, perLevel: 30, ratio: 0.3, targeted: true },
      { key: "E", name: "Rolamento", desc: "Esquiva rapidamente na direção do cursor.", kind: "dash", cd: [12, 11, 10, 9, 8], mana: 30, range: 6, radius: 0, base: 0, perLevel: 0, ratio: 0, targeted: true },
      { key: "R", name: "Flecha do Horizonte", desc: "Uma flecha que cruza o mapa e atordoa o primeiro herói.", kind: "globalArrow", cd: [80, 70, 60], mana: 100, range: 80, radius: 1.4, base: 220, perLevel: 120, ratio: 0.9, targeted: true },
    ],
  },
  {
    id: "support",
    name: "Seravin",
    title: "Voz da Aurora",
    role: "Suporte · Cura",
    passive: { name: "Presença Serena", desc: "Aliados heróis próximos regeneram 1% da vida por segundo." },
    color: 0xd9d2c0,
    accent: 0x5fb3a3,
    base: { maxHp: 560, maxMana: 400, ad: 46, armor: 24, mr: 32, speed: 5.3, range: 6.5, atkSpeed: 0.65, hpRegen: 3, manaRegen: 4 },
    perLevel: { maxHp: 85, maxMana: 32, ad: 2.5, armor: 3, mr: 1.2 },
    ranged: true,
    abilities: [
      { key: "Q", name: "Bênção", desc: "Cura o herói aliado mais próximo do cursor.", kind: "heal", cd: [9, 8.5, 8, 7.5, 7], mana: 60, range: 10, radius: 0, base: 70, perLevel: 35, ratio: 0.5, targeted: true },
      { key: "W", name: "Véu de Luz", desc: "Concede escudo ao aliado mais próximo do cursor.", kind: "allyShield", cd: [12, 11, 10, 9, 8], mana: 55, range: 10, radius: 0, base: 80, perLevel: 35, ratio: 0.5, targeted: true },
      { key: "E", name: "Grilhão Solar", desc: "Projétil que aprisiona o primeiro inimigo atingido.", kind: "root", cd: [12, 11, 10, 9, 8], mana: 60, range: 12, radius: 0.9, base: 50, perLevel: 30, ratio: 0.4, targeted: true },
      { key: "R", name: "Alvorecer", desc: "Cura todos os aliados em uma grande área ao redor.", kind: "aoeHeal", cd: [90, 80, 70], mana: 120, range: 0, radius: 11, base: 180, perLevel: 100, ratio: 0.7, targeted: false },
    ],
  },
];

export const heroById = (id: string): HeroDef => HEROES.find((h) => h.id === id) ?? HEROES[0]!;

/** Nível automático das habilidades: básicas 1..5, ultimate 0..3 (níveis 6/11/16). */
export function abilityLevel(heroLevel: number, idx: number): number {
  if (idx === 3) return heroLevel >= 16 ? 3 : heroLevel >= 11 ? 2 : heroLevel >= 6 ? 1 : 0;
  return Math.min(5, 1 + Math.floor((heroLevel - 1) / 3));
}

export const XP_TABLE = Array.from({ length: 18 }, (_, i) => 180 + i * 100); // xp para subir do nível i+1
