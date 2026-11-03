import type { World } from "./ecs/world";
import { step, TICK, cmdRightClick, cmdAbility, cmdConfirm } from "./game";

export function installGameDebug(w: World) {
  if (!import.meta.env.DEV) return () => {};
  const api = {
    world: w,
    sim(seconds: number) { for (let i = 0; i < Math.min(seconds, 300) / TICK; i++) step(w); },
    move(x: number, z: number) { cmdRightClick(w, { x, z }); },
    ability(index: number, x: number, z: number) { w.input.mouse = { x, z }; cmdAbility(w, index); if (w.input.targeting >= 0) cmdConfirm(w); },
  };
  const target = window as Window & { __game?: typeof api };
  target.__game = api;
  return () => { if (target.__game === api) delete target.__game; };
}