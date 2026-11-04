/** Visual-only winding river across the map; ford stones preserve every existing route. */
export const riverCenter = (z: number) => Math.sin(z * 0.1) * 3;
export const riverWidth = 3.2;
export const inRiver = (x: number, z: number) => Math.abs(x - riverCenter(z)) < riverWidth;
export const TORCH_SPOTS = [
  [-20, -16], [-16, -20], [20, 16], [16, 20],
  [-20, 16], [-16, 20], [20, -16], [16, -20],
  [-30, -36], [30, -36], [-30, 36], [30, 36],
] as const;