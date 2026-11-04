import { useEffect, useState } from "react";
import * as THREE from "three";

export function useTerrainPalette() {
  const [colors, setColors] = useState(() => ({ forest: new THREE.Color(), bark: new THREE.Color(), stone: new THREE.Color(), water: new THREE.Color(), foam: new THREE.Color(), flame: new THREE.Color(), ember: new THREE.Color() }));
  useEffect(() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const resolved = { forest: new THREE.Color(), bark: new THREE.Color(), stone: new THREE.Color(), water: new THREE.Color(), foam: new THREE.Color(), flame: new THREE.Color(), ember: new THREE.Color() };
    Object.entries(resolved).forEach(([key, color]) => {
      ctx.fillStyle = css.getPropertyValue(`--terrain-${key}`).trim(); ctx.fillRect(0, 0, 1, 1);
      const p = ctx.getImageData(0, 0, 1, 1).data;
      color.setRGB((p[0] ?? 255) / 255, (p[1] ?? 255) / 255, (p[2] ?? 255) / 255, THREE.SRGBColorSpace);
      if (key === "flame" || key === "ember") color.multiplyScalar(2.5);
    });
    setColors(resolved);
  }, []);
  return colors;
}