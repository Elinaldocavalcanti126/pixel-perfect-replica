import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Team } from "@/game/types";
import { heroById } from "@/game/data/heroes";

/** Resolve the themed CSS palette to linear colors, including browser-native OKLCH. */
export function useHeroColors(defId: string, team: Team) {
  const colors = useMemo(() => ({ rim: new THREE.Color(), team: new THREE.Color() }), []);
  const style = useMemo(() => {
    const hero = heroById(defId);
    return {
      tint: new THREE.Color(hero.color).lerp(new THREE.Color(0xffffff), 0.55),
      accent: new THREE.Color(hero.accent).lerp(new THREE.Color(0xffffff), 0.36),
    };
  }, [defId]);
  const palette = useMemo(() => ({ ...colors, ...style }), [colors, style]);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const styles = getComputedStyle(document.documentElement);
    const read = (token: string, target: THREE.Color) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = styles.getPropertyValue(token).trim();
      ctx.fillRect(0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      target.setRGB((pixel[0] ?? 255) / 255, (pixel[1] ?? 255) / 255, (pixel[2] ?? 255) / 255, THREE.SRGBColorSpace);
    };
    const id = ["warrior", "mage", "archer", "support", "veyra", "maelis"].includes(defId) ? defId : "warrior";
    read(`--hero-rim-${id}`, palette.rim);
    read(team === 1 ? "--team-red" : "--team-blue", palette.team);
  }, [palette, defId, team]);
  return palette;
}
