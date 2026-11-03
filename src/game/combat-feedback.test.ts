import { describe, expect, it } from "vitest";
import { World } from "./ecs/world";
import { combatSystem } from "./systems/combat";
import { projectileSystem } from "./systems/abilities";

function setup() {
  const w = new World();
  const src = w.spawnHero("archer", 0, true, 0);
  const target = w.spawnHero("warrior", 1, false, 0);
  target.pos = { x: src.pos.x + 1, z: src.pos.z };
  w.playerId = src.id;
  return { w, src, target };
}

describe("combat feedback", () => {
  it("reports post-armor physical damage without altering it", () => {
    const { w, src, target } = setup();
    const hp = target.hp;
    w.damage(src, target, 100, false);
    expect(w.damageEvents[0]?.magic).toBe(false);
    expect(w.damageEvents[0]?.amount).toBeCloseTo(10000 / (100 + target.stats.armor));
    expect(hp - target.hp).toBeCloseTo(w.damageEvents[0]?.amount ?? 0);
  });
  it("reports magical damage and excludes shield-absorbed damage", () => {
    const { w, src, target } = setup();
    target.status.shield = 1000;
    target.status.shieldUntil = 10;
    w.damage(src, target, 100, true);
    expect(w.damageEvents).toHaveLength(0);
    target.status.shield = 0;
    w.damage(src, target, 100, true);
    expect(w.damageEvents[0]?.magic).toBe(true);
    expect(w.damageEvents[0]?.amount).toBeCloseTo(10000 / (100 + target.stats.mr));
  });
  it("labels the existing fourth crossbow shot critical, retaining double damage", () => {
    const { w, src, target } = setup();
    if (!src.hero) throw new Error("missing hero");
    src.hero.attackCount = 3;
    src.attackTarget = target.id;
    combatSystem(w, 1 / 30);
    projectileSystem(w, 1);
    expect(w.damageEvents[0]?.critical).toBe(true);
    expect(w.damageEvents[0]?.amount).toBeCloseTo(src.stats.ad * 2 * 100 / (100 + target.stats.armor));
  });
  it("coalesces rapid damage and bounds feedback to 64 events", () => {
    const { w, src, target } = setup();
    w.damage(src, target, 1, true);
    w.damage(src, target, 1, true);
    expect(w.damageEvents).toHaveLength(1);
    expect(w.damageEvents[0]?.amount).toBeCloseTo(200 / (100 + target.stats.mr));
    for (let i = 0; i < 80; i++) w.damage(src, target, 1, false, true);
    expect(w.damageEvents).toHaveLength(64);
  });
});