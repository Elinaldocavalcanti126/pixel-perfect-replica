import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { World } from "@/game/ecs/world";
import { heroById } from "@/game/data/heroes";

/**
 * Ground decals for aim feedback: ability range ring + cursor marker while
 * targeting, and a pulsing lock ring under the current attack target.
 * Purely visual: reads world state every frame, never writes to it.
 */
export function TargetingRings({ w }: { w: World }) {
  const rangeRef = useRef<THREE.Mesh>(null);
  const cursorRef = useRef<THREE.Mesh>(null);
  const lockRef = useRef<THREE.Mesh>(null);
  const colors = useMemo(() => ({ range: new THREE.Color(), target: new THREE.Color() }), []);

  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const read = (token: string, target: THREE.Color, fallback: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css.getPropertyValue(token).trim() || fallback;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      target.setRGB((pixel[0] ?? 255) / 255, (pixel[1] ?? 255) / 255, (pixel[2] ?? 255) / 255, THREE.SRGBColorSpace);
    };
    read("--ring-range", colors.range, "#e8c96a");
    read("--ring-target", colors.target, "#d94c2a");
  }, [colors]);

  const mats = useMemo(() => {
    const make = (color: THREE.Color, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    return {
      range: make(colors.range, 0.55),
      cursor: make(colors.range, 0.7),
      lock: make(colors.target, 0.8),
    };
  }, [colors]);

  useEffect(() => () => { Object.values(mats).forEach((m) => m.dispose()); }, [mats]);

  useFrame(() => {
    const range = rangeRef.current, cursor = cursorRef.current, lock = lockRef.current;
    if (!range || !cursor || !lock) return;
    const me = w.player;
    const idx = w.input.targeting;

    // Anel de alcance + marcador de área no cursor enquanto mira uma habilidade.
    if (me?.alive && me.hero && idx >= 0) {
      const ab = heroById(me.hero.defId).abilities[idx];
      const r = ab && (ab.range > 0 ? ab.range : ab.radius);
      range.visible = !!r;
      if (ab && r) {
        range.position.set(me.pos.x, 0.06, me.pos.z);
        range.scale.setScalar(r);
      }
      cursor.visible = !!ab;
      if (ab) {
        cursor.position.set(w.input.mouse.x, 0.06, w.input.mouse.z);
        cursor.scale.setScalar(Math.max(0.7, ab.radius || 0.7));
      }
    } else {
      range.visible = false;
      cursor.visible = false;
    }

    // Anel de foco pulsante sob o alvo de ataque atual.
    const tgt = me?.attackTarget != null ? w.byId.get(me.attackTarget) : undefined;
    if (me?.alive && tgt?.alive && tgt.visible && tgt.team !== me.team) {
      lock.visible = true;
      const pulse = 1 + Math.sin(w.time * 6) * 0.08;
      lock.position.set(tgt.pos.x, 0.06, tgt.pos.z);
      lock.scale.setScalar((tgt.radius + 0.55) * pulse);
      mats.lock.opacity = 0.55 + Math.sin(w.time * 6) * 0.25;
    } else {
      lock.visible = false;
    }
  });

  return (
    <>
      <mesh ref={rangeRef} rotation-x={-Math.PI / 2} renderOrder={2} material={mats.range} visible={false}>
        <ringGeometry args={[0.975, 1, 72]} />
      </mesh>
      <mesh ref={cursorRef} rotation-x={-Math.PI / 2} renderOrder={2} material={mats.cursor} visible={false}>
        <ringGeometry args={[0.82, 1, 40]} />
      </mesh>
      <mesh ref={lockRef} rotation-x={-Math.PI / 2} renderOrder={2} material={mats.lock} visible={false}>
        <ringGeometry args={[0.86, 1, 40]} />
      </mesh>
    </>
  );
}
