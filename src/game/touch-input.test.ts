import { describe, expect, it } from "vitest";
import { aimPoint, stickVector } from "./touch-input";
import { World } from "./ecs/world";
import { cmdAttackNearest, cmdMoveStick, cmdAbility } from "./game";

describe("touch controls", () => {
  it("maps screen-right to +X and screen-up to -Z", () => {
    expect(stickVector(44, 0)).toEqual({ x: 1, z: 0 });
    expect(stickVector(0, -44)).toEqual({ x: 0, z: -1 });
  });
  it("ignores resting input and bounds diagonals", () => {
    expect(stickVector(2, 2)).toEqual({ x: 0, z: 0 });
    const d = stickVector(100, 100);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
  });
  it("aims in screen direction and keeps casts within ability range", () => {
    expect(aimPoint({ x: 0, z: 0 }, stickVector(0, -44), 8, 0)).toEqual({ x: 0, z: -8 });
    expect(aimPoint({ x: 0, z: 0 }, { x: 0, z: 0 }, 8, Math.PI / 2).x).toBeCloseTo(8);
  });
  it("never selects hidden enemies or allies", () => {
    const w = new World();
    const me = w.spawnHero("warrior", 0, true, 0);
    w.playerId = me.id;
    const hidden = w.spawnHero("mage", 1, false, 0);
    hidden.pos = { x: me.pos.x + 1, z: me.pos.z }; hidden.visible = false;
    const ally = w.spawnHero("support", 0, false, 0);
    ally.pos = { ...me.pos };
    cmdAttackNearest(w);
    expect(me.attackTarget).toBeNull();
    hidden.visible = true;
    cmdAttackNearest(w);
    expect(me.attackTarget).toBe(hidden.id);
  });
  it("does not move, attack or cast while paused", () => {
    const w = new World();
    const me = w.spawnHero("warrior", 0, true, 0);
    w.playerId = me.id; w.paused = true;
    const mana = me.mana;
    cmdMoveStick(w, { x: 1, z: 0 }); cmdAttackNearest(w); cmdAbility(w, 1);
    expect(me.path).toEqual([]); expect(me.attackTarget).toBeNull(); expect(me.mana).toBe(mana);
  });
});