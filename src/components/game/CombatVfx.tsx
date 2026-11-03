import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { World } from "@/game/ecs/world";

const TOKENS = ["--damage-physical", "--damage-magical", "--damage-critical", "--damage-outline", "--vfx-core", "--hero-rim-warrior", "--hero-rim-mage", "--hero-rim-archer", "--hero-rim-support"];

function useVfxPalette() {
  const palette = useMemo(() => TOKENS.map(() => new THREE.Color()), []);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    TOKENS.forEach((token, i) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css.getPropertyValue(token).trim();
      ctx.fillRect(0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      palette[i]?.setRGB((pixel[0] ?? 255) / 255, (pixel[1] ?? 255) / 255, (pixel[2] ?? 255) / 255, THREE.SRGBColorSpace);
    });
  }, [palette]);
  return palette;
}

/** Fixed-size pools: no per-particle React state or remote fonts/textures. */
export function CombatVfx({ w }: { w: World }) {
  const palette = useVfxPalette();
  const sparks = useRef<THREE.InstancedMesh>(null);
  const streaks = useRef<THREE.InstancedMesh>(null);
  const slashes = useRef<THREE.InstancedMesh>(null);
  const numbers = useRef<THREE.Group>(null);
  const pool = useRef<{ sprite: THREE.Sprite; canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; key: string }[]>([]);
  const math = useMemo(() => ({ matrix: new THREE.Matrix4(), pos: new THREE.Vector3(), scale: new THREE.Vector3(), quaternion: new THREE.Quaternion(), direction: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), color: new THREE.Color() }), []);

  useEffect(() => {
    const group = numbers.current;
    if (!group) return;
    const entries = Array.from({ length: 64 }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 128;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = 25;
      sprite.visible = false;
      group.add(sprite);
      return { sprite, texture, canvas, key: "" };
    });
    pool.current = entries;
    return () => {
      entries.forEach(({ sprite, texture }) => { group.remove(sprite); sprite.material.dispose(); texture.dispose(); });
      pool.current = [];
    };
  }, []);

  useFrame(({ camera, gl }) => {
    const sparkMesh = sparks.current, streakMesh = streaks.current, slashMesh = slashes.current;
    if (!sparkMesh || !streakMesh || !slashMesh) return;
    const { matrix, pos, scale, quaternion, direction, up, color } = math;
    let sp = 0, st = 0, sl = 0, num = 0;
    const nearby = (x: number, z: number) => Math.hypot(camera.position.x - x, camera.position.z - z) < 44;
    const place = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, tint: THREE.Color, energy: number) => {
      matrix.compose(pos.set(x, y, z), quaternion, scale.set(sx, sy, sz));
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.copy(tint).multiplyScalar(Math.min(6, energy)));
    };
    const burst = (x: number, z: number, age: number, tint: THREE.Color, radius = 1, y = 1.2, seed = 0) => {
      if (age < 0 || age > 0.55 || !nearby(x, z)) return;
      const fade = 1 - age / 0.55;
      for (let i = 0; i < 9 && sp < 768; i++) {
        const angle = i * 2.39996 + seed;
        const travel = age * (3 + i % 3) * Math.min(radius, 3);
        quaternion.identity();
        const size = (0.06 + (i % 3) * 0.035) * fade;
        place(sparkMesh, sp++, x + Math.cos(angle) * travel, y + Math.sin(i * 1.7) * age * 2 + age * 2 - age * age * 5, z + Math.sin(angle) * travel, size, size, size, tint, fade * 5);
      }
    };
    for (const event of w.damageEvents) {
      const age = w.time - event.start;
      const target = w.byId.get(event.targetId);
      if (age < 0 || age >= 1.2 || !target?.visible || !nearby(event.pos.x, event.pos.z)) continue;
      const tint = palette[event.critical ? 2 : event.magic ? 1 : 0];
      if (!tint) continue;
      burst(event.pos.x, event.pos.z, age, tint, event.critical ? 1.5 : 0.8, 1.1, event.id);
      const entry = pool.current[num++];
      if (!entry) continue;
      const key = `${event.id}:${Math.max(1, Math.round(event.amount))}:${event.critical}`;
      if (entry.key !== key) {
        entry.key = key;
        const ctx = entry.canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 256, 128);
          ctx.font = `900 ${event.critical ? 76 : 62}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineJoin = "round"; ctx.lineWidth = 10;
          ctx.strokeStyle = palette[3]?.getStyle() ?? "";
          ctx.fillStyle = tint.getStyle();
          const text = String(Math.max(1, Math.round(event.amount)));
          ctx.strokeText(text, 128, 64); ctx.fillText(text, 128, 64);
          entry.texture.needsUpdate = true;
        }
      }
      entry.sprite.visible = true;
      entry.sprite.position.set(event.pos.x + ((event.id % 3) - 1) * 0.5, (target.kind === "hero" ? 3 : target.kind === "tower" ? 6.8 : 1.8) + age * 1.7, event.pos.z);
      const punch = event.critical ? 1.55 + Math.max(0, 1 - age * 7) * 0.35 : 1;
      entry.sprite.scale.set(2.2 * punch, 1.1 * punch, 1);
      entry.sprite.material.opacity = Math.min(1, (1.2 - age) / 0.3);
    }
    pool.current.slice(num).forEach(({ sprite }) => { sprite.visible = false; });
    for (const e of w.entities) {
      if (!e.hero || !e.alive || !e.visible || !nearby(e.pos.x, e.pos.z)) continue;
      const id = ["warrior", "mage", "archer", "support"].indexOf(e.hero.defId);
      const tint = palette[5 + Math.max(0, id)];
      if (!tint) continue;
      const age = w.time - e.lastAttackTime;
      if (e.hero.defId === "warrior" && age >= 0 && age < 0.34 && sl < 32) {
        quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -e.rot + Math.PI * 0.15 + age * 5, "YXZ"));
        place(slashMesh, sl++, e.pos.x, 1, e.pos.z, 1.55, 1.55, 1.55, tint, (1 - age / 0.34) * 5);
      }
      if ((e.hero.defId === "mage" || e.hero.defId === "support") && e.hero.cds.some((cd) => cd > 0)) {
        quaternion.identity();
        const pulse = 0.1 + Math.sin(w.time * 5 + e.id) * 0.025;
        place(sparkMesh, sp++, e.pos.x + Math.cos(e.rot) * 0.45, 1.65, e.pos.z - Math.sin(e.rot) * 0.45, pulse, pulse, pulse, tint, 3);
      }
    }
    for (const p of w.projectiles) {
      if (!p.active || st >= 160 || !nearby(p.pos.x, p.pos.z)) continue;
      const src = w.byId.get(p.sourceId);
      // Never reveal shots from hidden opponents.
      if (!src?.visible) continue;
      const tint = p.magic ? palette[1] : src.hero?.defId === "archer" ? palette[7] : palette[2];
      if (!tint) continue;
      const length = p.isAbility ? 2.3 : 1.25;
      direction.set(p.dir.x, 0, p.dir.z).normalize();
      if (direction.lengthSq() === 0) continue;
      quaternion.setFromUnitVectors(up, direction);
      place(streakMesh, st++, p.pos.x - p.dir.x * length * 0.5, 1.1, p.pos.z - p.dir.z * length * 0.5, Math.max(0.05, p.size * 0.22), length, Math.max(0.05, p.size * 0.22), tint, 4);
      quaternion.identity();
      if (sp < 768) place(sparkMesh, sp++, p.pos.x, 1.1, p.pos.z, p.size * 0.55, p.size * 0.55, p.size * 0.55, palette[4] ?? tint, 5);
    }
    for (const f of w.fx) {
      const age = w.time - f.start;
      const visible = w.entities.some((e) => e.visible && w.dist(e.pos, f.pos) < f.radius + 2);
      if (visible && f.radius >= 1) burst(f.pos.x, f.pos.z, age, palette[1] ?? color, f.radius, Math.max(0.5, f.y), f.start);
    }
    for (const [mesh, count] of [[sparkMesh, sp], [streakMesh, st], [slashMesh, sl]] as const) {
      mesh.count = count; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    if (import.meta.env.DEV) {
      gl.domElement.dataset["damageNumbers"] = String(num);
      gl.domElement.dataset["vfxParticles"] = String(sp);
      gl.domElement.dataset["vfxTrails"] = String(st + sl);
    }
  });

  return <>
    <group ref={numbers} />
    <instancedMesh ref={sparks} args={[undefined, undefined, 768]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={streaks} args={[undefined, undefined, 160]} frustumCulled={false}>
      <cylinderGeometry args={[0.15, 1, 1, 5]} />
      <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={slashes} args={[undefined, undefined, 32]} frustumCulled={false}>
      <ringGeometry args={[0.76, 1, 32, 1, 0, Math.PI * 0.9]} />
      <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  </>;
}