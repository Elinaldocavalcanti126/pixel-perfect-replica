import type { Vec } from "./types";

export interface TouchInput {
  move: Vec;
  moving: boolean;
  aiming: boolean;
  attacking: boolean;
}

export const createTouchInput = (): TouchInput => ({ move: { x: 0, z: 0 }, moving: false, aiming: false, attacking: false });

/** The fixed camera looks toward -Z: screen-right is +X, screen-up is -Z. */
export function stickVector(dx: number, dy: number, radius = 44): Vec {
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < radius * 0.15) return { x: 0, z: 0 };
  const scale = Math.min(1, distance / radius) / distance;
  return { x: dx * scale, z: dy * scale };
}

export function aimPoint(origin: Vec, vector: Vec, range: number, facing: number): Vec {
  const length = Math.hypot(vector.x, vector.z);
  const distance = Math.max(1, range) * Math.min(1, length || 1);
  return {
    x: origin.x + (length ? vector.x / length : Math.sin(facing)) * distance,
    z: origin.z + (length ? vector.z / length : Math.cos(facing)) * distance,
  };
}