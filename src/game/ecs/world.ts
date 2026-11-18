import type { DamageEvent, Entity, Fx, KillEvent, Projectile, Stats, Team, Vec, Zone } from "../types";
import { heroById, XP_TABLE } from "../data/heroes";
import { itemById } from "../data/items";
import { FOUNTAIN } from "../map/map";

const emptyStatus = () => ({
  slowUntil: 0, slowFactor: 1, rootUntil: 0, stunUntil: 0, tauntUntil: 0, tauntBy: -1,
  shield: 0, shieldUntil: 0, buffUntil: 0,
});

export interface Input {
  mouse: Vec;
  targeting: number; // índice de habilidade aguardando confirmação, -1 nenhum
}

/** Mundo ECS leve: entidades com componentes opcionais, sistemas operam sobre elas. */
export class World {
  entities: Entity[] = [];
  byId = new Map<number, Entity>();
  projectiles: Projectile[] = [];
  zones: Zone[] = [];
  fx: Fx[] = [];
  killFeed: KillEvent[] = [];
  damageEvents: DamageEvent[] = [];
  nextDamageId = 1;
  time = 0;
  tick = 0;
  nextId = 1;
  version = 0; // muda quando entidades nascem/morrem (para o React)
  winner: Team | null = null;
  playerId = -1;
  nextWave = 5;
  campRespawn: number[] = [3, 3, 3];
  input: Input = { mouse: { x: 0, z: 0 }, targeting: -1 };
  paused = false;
  messages: { t: number; text: string }[] = [];

  add(e: Omit<Entity, "id">): Entity {
    const ent = { ...e, id: this.nextId++ } as Entity;
    this.entities.push(ent);
    this.byId.set(ent.id, ent);
    this.version++;
    return ent;
  }

  remove(e: Entity) {
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
    this.byId.delete(e.id);
    this.version++;
  }

  get player(): Entity | undefined {
    return this.byId.get(this.playerId);
  }

  makeBase(kind: Entity["kind"], team: Team, pos: Vec, stats: Stats, radius: number): Omit<Entity, "id"> {
    return {
      kind, team, alive: true, pos: { ...pos }, rot: team === 0 ? 0 : Math.PI, radius,
      hp: stats.maxHp, mana: stats.maxMana, stats, path: [], attackTarget: null, attackCd: 0,
      lastAttackTime: -10, status: emptyStatus(), lastAttacker: -1, visible: true, deathTime: 0,
      moving: false, repathAt: 0, hero: null, minion: null, tower: null, monster: null,
    };
  }

  spawnHero(defId: string, team: 0 | 1, isPlayer: boolean, lane: 0 | 1 | 2): Entity {
    const def = heroById(defId);
    const f = FOUNTAIN[team];
    const base = this.makeBase("hero", team, { x: f.x + (Math.random() - 0.5) * 3, z: f.z + (Math.random() - 0.5) * 6 }, { ...def.base, ap: 0 }, 0.7);
    base.hero = {
      defId, name: def.name, level: 1, xp: 0, gold: 500, items: [null, null, null, null, null, null],
      cds: [0, 0, 0, 0], kills: 0, deaths: 0, assists: 0, cs: 0, respawnAt: 0, isPlayer, lane,
      bot: isPlayer ? null : { state: "farm", think: 0 }, attackCount: 0, damagers: new Map(), combatUntil: 0,
    };
    const e = this.add(base);
    this.recalcStats(e);
    e.hp = e.stats.maxHp;
    e.mana = e.stats.maxMana;
    return e;
  }

  recalcStats(e: Entity) {
    const h = e.hero;
    if (!h) return;
    const def = heroById(h.defId);
    const L = h.level - 1;
    const hpFrac = e.hp / e.stats.maxHp, mpFrac = e.stats.maxMana ? e.mana / e.stats.maxMana : 1;
    const s: Stats = {
      ...def.base,
      ap: 0,
      maxHp: def.base.maxHp + def.perLevel.maxHp * L,
      maxMana: def.base.maxMana + def.perLevel.maxMana * L,
      ad: def.base.ad + def.perLevel.ad * L,
      armor: def.base.armor + def.perLevel.armor * L,
      mr: def.base.mr + def.perLevel.mr * L,
      atkSpeed: def.base.atkSpeed * (1 + 0.025 * L),
    };
    for (const id of h.items) {
      if (!id) continue;
      const it = itemById(id);
      if (!it) continue;
      for (const k of Object.keys(it.stats) as (keyof Stats)[]) {
        if (k === "atkSpeed") s.atkSpeed += def.base.atkSpeed * (it.stats.atkSpeed ?? 0) / 0.75;
        else s[k] += it.stats[k] ?? 0;
      }
    }
    e.stats = s;
    if (e.alive) {
      e.hp = Math.max(1, hpFrac * s.maxHp);
      e.mana = mpFrac * s.maxMana;
    }
  }

  dist(a: Vec, b: Vec) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  isTargetable(e: Entity) {
    if (!e.alive) return false;
    if (e.tower?.protectedBy.some((id) => this.byId.get(id)?.alive)) return false;
    if (e.tower?.unlockedBy.length && !e.tower.unlockedBy.some((id) => !this.byId.get(id)?.alive)) return false;
    return true;
  }

  addFx(pos: Vec, radius: number, color: number, dur = 0.5, y = 0.1) {
    if (this.fx.length > 80) this.fx.shift();
    this.fx.push({ pos: { ...pos }, radius, color, start: this.time, dur, y });
  }

  heal(e: Entity, amount: number) {
    if (!e.alive) return;
    e.hp = Math.min(e.stats.maxHp, e.hp + amount);
  }

  damage(src: Entity | undefined, tgt: Entity, raw: number, magic: boolean, critical = false) {
    if (!tgt.alive || !this.isTargetable(tgt) || this.winner !== null) return;
    if (src?.status.buffUntil && src.status.buffUntil > this.time) raw *= 1.2;
    const res = magic ? tgt.stats.mr : tgt.stats.armor;
    let dmg = raw * (100 / (100 + Math.max(0, res)));
    if (tgt.status.shield > 0 && tgt.status.shieldUntil > this.time) {
      const a = Math.min(tgt.status.shield, dmg);
      tgt.status.shield -= a;
      dmg -= a;
    }
    if (dmg > 0 && tgt.visible) {
      this.damageEvents = this.damageEvents.filter((event) => this.time - event.start < 1.2);
      const recent = [...this.damageEvents].reverse().find((event) => event.targetId === tgt.id && event.magic === magic && !event.critical && !critical && this.time - event.start < 0.2);
      if (recent) recent.amount += dmg;
      else {
        if (this.damageEvents.length >= 64) this.damageEvents.shift();
        this.damageEvents.push({ id: this.nextDamageId++, targetId: tgt.id, pos: { ...tgt.pos }, amount: dmg, magic, critical, start: this.time });
      }
    }
    tgt.hp -= dmg;
    if (src) {
      tgt.lastAttacker = src.id;
      if (src.hero && tgt.hero) tgt.hero.damagers.set(src.id, this.time);
      if (src.hero) src.hero.combatUntil = this.time + 4;
      if (tgt.hero) tgt.hero.combatUntil = this.time + 4;
    }
    if (tgt.hp <= 0) this.kill(tgt, src);
  }

  kill(tgt: Entity, src: Entity | undefined) {
    tgt.alive = false;
    tgt.hp = 0;
    tgt.deathTime = this.time;
    tgt.path = [];
    tgt.attackTarget = null;
    this.version++;
    const killerHero = src?.hero ? src : undefined;

    // XP por proximidade para heróis inimigos da vítima
    const xpVal = tgt.kind === "hero" ? 120 + tgt.hero!.level * 30 : tgt.kind === "minion" ? 30 : tgt.kind === "monster" ? (tgt.monster!.big ? 150 : 50) : tgt.kind === "tower" ? 80 : 0;
    if (xpVal) {
      const near = this.entities.filter((e) => e.hero && e.alive && e.team !== tgt.team && this.dist(e.pos, tgt.pos) < 14);
      for (const h of near) this.grantXp(h, xpVal / Math.max(1, near.length * 0.7));
    }

    if (tgt.kind === "minion" || tgt.kind === "monster") {
      if (killerHero) {
        killerHero.hero!.gold += tgt.kind === "monster" ? (tgt.monster!.big ? 100 : 40) : tgt.minion!.ranged ? 20 : 22;
        killerHero.hero!.cs++;
        if (tgt.monster?.big) {
          // buff de dano para o time que matou
          for (const h of this.entities) if (h.hero && h.team === killerHero.team) h.status.buffUntil = this.time + 60;
          this.msg(`${killerHero.hero!.name} conquistou a Bênção do Colosso!`);
        }
      }
    }
    if (tgt.kind === "monster") this.campRespawn[tgt.monster!.camp] = Math.max(this.campRespawn[tgt.monster!.camp] ?? 0, this.time + 60);

    if (tgt.kind === "hero") {
      const h = tgt.hero!;
      h.deaths++;
      h.respawnAt = this.time + 5 + h.level * 2;
      let killerName = src?.hero?.name ?? (src?.kind === "tower" ? "Torre" : src?.kind === "minion" ? "Lacaios" : "Selva");
      if (killerHero) {
        killerHero.hero!.kills++;
        killerHero.hero!.gold += 300;
      }
      for (const [id, t] of h.damagers) {
        if (id === killerHero?.id || this.time - t > 10) continue;
        const a = this.byId.get(id);
        if (a?.hero && a.team !== tgt.team) { a.hero.assists++; a.hero.gold += 120; }
      }
      h.damagers.clear();
      this.killFeed.push({ t: this.time, killer: killerName, victim: h.name, killerTeam: src?.team ?? 2 });
      if (this.killFeed.length > 6) this.killFeed.shift();
      this.addFx(tgt.pos, 2.5, 0xb32020, 0.8);
    }

    if (tgt.kind === "tower" || tgt.kind === "altar") {
      for (const h of this.entities) if (h.hero && h.team !== tgt.team) h.hero.gold += 150;
      this.addFx(tgt.pos, 5, 0xff8a3c, 1.2);
      this.msg(tgt.kind === "altar" ? "O altar foi destruído!" : `Uma torre ${tgt.team === 0 ? "azul" : "vermelha"} caiu!`);
      if (tgt.kind === "altar") this.winner = tgt.team === 0 ? 1 : 0;
    }
  }

  msg(text: string) {
    this.messages.push({ t: this.time, text });
    if (this.messages.length > 4) this.messages.shift();
  }

  grantXp(e: Entity, xp: number) {
    const h = e.hero!;
    if (h.level >= 18) return;
    h.xp += xp;
    while (h.level < 18 && h.xp >= XP_TABLE[h.level - 1]!) {
      h.xp -= XP_TABLE[h.level - 1]!;
      h.level++;
      this.recalcStats(e);
      e.hp = Math.min(e.stats.maxHp, e.hp + 90);
      this.addFx(e.pos, 1.8, 0xf2c94c, 0.7);
    }
  }
}
