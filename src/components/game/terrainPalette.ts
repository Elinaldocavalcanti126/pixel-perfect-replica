import { useEffect, useMemo } from "react";
import * as THREE from "three";

export function useTerrainPalette() {
  const colors = useMemo(() => Object.fromEntries(["forest", "bark", "stone", "water", "foam", "flame", "ember"].map((key) => [key, new THREE.Color()])), []);
  useEffect(() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    Object.entries(colors).forEach(([key, color]) => {
      ctx.fillStyle = css.getPropertyValue(`--terrain-${key}`).trim(); ctx.fillRect(0, 0, 1, 1);
      const p = ctx.getImageData(0, 0, 1, 1).data;
      color.setRGB((p[0] ?? 255) / 255, (p[1] ?? 255) / 255, (p[2] ?? 255) / 255, THREE.SRGBColorSpace);
      if (key === "flame" || key === "ember") color.multiplyScalar(2.5);
    });
  }, [colors]);
  return colors;
}