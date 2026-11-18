export type Vec = { x: number; z: number };
export type Team = 0 | 1 | 2; // 0 = azul, 1 = vermelho, 2 = neutro
export type Kind = "hero" | "minion" | "tower" | "altar" | "monster";

export interface Stats {
  maxHp: number;
  maxMana: number;
  ad: number;
  ap: number;
  armor: number;
  mr: number;
  speed: number;
  range: number;
  atkSpeed: number; // ataques por segundo
  hpRegen: number;
  manaRegen: number;
}

export interface Status {
  slowUntil: number;
  slowFactor: number;
  rootUntil: number;
  stunUntil: number;
  tauntUntil: number;
  tauntBy: number;
  shield: number;
  shieldUntil: number;
  buffUntil: number;
}

export interface BotState {
  state: "farm" | "retreat" | "fight" | "defend" | "push";
  think: number;
}

export interface HeroComp {
  defId: string;
  name: string;
  level: number;
  xp: number;
  gold: number;
  items: (string | null)[];
  cds: number[]; // tempo restante por habilidade
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  respawnAt: number;
  isPlayer: boolean;
  lane: 0 | 1 | 2;
  bot: BotState | null;
  attackCount: number;
  damagers: Map<number, number>; // heroId -> tempo
  combatUntil: number;
}

export interface Entity {
  id: number;
  kind: Kind;
  team: Team;
  alive: boolean;
  pos: Vec;
  rot: number;
  radius: number;
  hp: number;
  mana: number;
  stats: Stats;
  path: Vec[];
  attackTarget: number | null;
  attackCd: number;
  lastAttackTime: number;
  status: Status;
  lastAttacker: number;
  visible: boolean;
  deathTime: number;
  moving: boolean;
  repathAt: number;
  hero: HeroComp | null;
  minion: { lane: 0 | 1 | 2; wp: number; ranged: boolean } | null;
  tower: { protectedBy: number[]; unlockedBy: number[] } | null;
  monster: { camp: number; home: Vec; big: boolean } | null;
}

export interface Projectile {
  active: boolean;
  pos: Vec;
  dir: Vec;
  speed: number;
  targetId: number | null; // homing
  team: Team;
  sourceId: number;
  damage: number;
  magic: boolean;
  width: number;
  maxDist: number;
  traveled: number;
  color: number;
  size: number;
  onHit: "none" | "root" | "stun";
  effectDur: number;
  pierce: boolean;
  hit: Set<number>;
  isAbility: boolean;
  isAuto: boolean;
  critical?: boolean;
}

/** Informational combat feedback; never used to calculate damage. */
export interface DamageEvent {
  id: number;
  targetId: number;
  pos: Vec;
  amount: number;
  magic: boolean;
  critical: boolean;
  start: number;
}

export interface Zone {
  pos: Vec;
  radius: number;
  team: Team;
  sourceId: number;
  until: number;
  start: number;
  kind: "slow" | "trap" | "meteor";
  damage: number;
  color: number;
  done: boolean;
}

export interface Fx {
  pos: Vec;
  radius: number;
  color: number;
  start: number;
  dur: number;
  y: number;
}

export interface KillEvent {
  t: number;
  killer: string;
  victim: string;
  killerTeam: Team;
}
