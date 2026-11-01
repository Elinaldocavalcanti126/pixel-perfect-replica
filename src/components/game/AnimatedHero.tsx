import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { World } from "@/game/ecs/world";
import type { Entity } from "@/game/types";
import { HERO_ASSETS, type HeroAsset } from "./heroAssets";
import { createHeroOutline, createHeroRamp, toonMaterial } from "./heroMaterials";
import { inPlaceClips, playHeroClip, type HeroMotion } from "./heroAnimation";

function Rig({ w, e, asset }: { w: World; e: Entity; asset: HeroAsset }) {
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(asset.url);
  const rig = useMemo(() => {
    const object = clone(scene);
    const ramp = createHeroRamp();
    const materials: THREE.Material[] = [];
    const meshes: THREE.Mesh[] = [];
    object.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const bodyPart = /^(Knight|Mage|Rogue)_(Arm|Body|Head|Leg)/.test(o.name);
      o.visible = bodyPart || asset.accessories.includes(o.name);
      if (!o.visible) return;
      const convert = (source: THREE.Material) => {
        const mat = toonMaterial(source, ramp);
        // Different costumes, not team tints: retain readable class identities.
        if (e.hero?.defId === "support") mat.color.setRGB(0.72, 1, 0.83);
        materials.push(mat);
        return mat;
      };
      o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      meshes.push(o);
    });
    object.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const mesh of meshes) box.expandByObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const scale = asset.height / (size.y || 1);
    const center = box.getCenter(new THREE.Vector3());
    const outline = createHeroOutline(new THREE.Color(0.025, 0.035, 0.055), 0.015 / scale);
    materials.push(outline);
    for (const mesh of meshes) {
      let hull: THREE.Mesh;
      if (mesh instanceof THREE.SkinnedMesh) {
        const skinned = new THREE.SkinnedMesh(mesh.geometry, outline);
        skinned.bindMode = mesh.bindMode;
        skinned.bind(mesh.skeleton, mesh.bindMatrix);
        skinned.bindMatrixInverse.copy(mesh.bindMatrixInverse);
        hull = skinned;
      } else hull = new THREE.Mesh(mesh.geometry, outline);
      hull.name = `${mesh.name}_ink`;
      hull.frustumCulled = false;
      hull.morphTargetInfluences = mesh.morphTargetInfluences;
      hull.morphTargetDictionary = mesh.morphTargetDictionary;
      mesh.add(hull);
    }
    return { object, scale, offset: [-center.x * scale, -box.min.y * scale, -center.z * scale] as [number, number, number], materials, ramp };
  }, [scene, asset, e]);
  const clips = useMemo(() => inPlaceClips(animations), [animations]);
  const { actions } = useAnimations(clips, root);
  const state = useRef({ previous: null as string | null, motion: "idle" as HeroMotion, until: 0,
    attack: e.lastAttackTime, cds: [...(e.hero?.cds ?? [])], alive: e.alive });

  useEffect(() => () => {
    rig.materials.forEach((mat) => mat.dispose());
    rig.ramp.dispose();
  }, [rig]);

  useFrame((_, rawDelta) => {
    const group = root.current;
    const hero = e.hero;
    if (!group || !hero) return;
    const dt = Math.min(rawDelta, 0.05);
    group.visible = e.visible && (e.alive || w.time - e.deathTime < 2.5);
    const k = 1 - Math.exp(-18 * dt);
    const teleport = Math.hypot(e.pos.x - group.position.x, e.pos.z - group.position.z) > 4;
    group.position.x = teleport ? e.pos.x : THREE.MathUtils.lerp(group.position.x, e.pos.x, k);
    group.position.z = teleport ? e.pos.z : THREE.MathUtils.lerp(group.position.z, e.pos.z, k);
    const angle = Math.atan2(Math.sin(e.rot - group.rotation.y), Math.cos(e.rot - group.rotation.y));
    group.rotation.y += angle * (1 - Math.exp(-12 * dt));
    const s = state.current;
    let motion: HeroMotion = e.moving ? "run" : "idle";
    let restart = false;
    if (!e.alive) {
      motion = "death";
      restart = s.alive;
    } else {
      const cast = hero.cds.some((cd, idx) => cd > (s.cds[idx] ?? 0) + 0.1);
      if (cast) { s.motion = "cast"; s.until = w.time + 0.65; restart = true; }
      else if (e.lastAttackTime > s.attack) {
        s.motion = "attack"; s.until = w.time + Math.min(0.6, 0.75 / e.stats.atkSpeed); restart = true;
      }
      if (w.time < s.until) motion = s.motion;
      if (!s.alive) restart = true;
    }
    const name = asset.clips[motion];
    if (restart || s.previous !== name) {
      const duration = motion === "cast" ? 0.65 : motion === "attack" ? Math.min(0.6, 0.75 / e.stats.atkSpeed) : undefined;
      s.previous = playHeroClip(actions, s.previous, name, motion, duration);
      s.motion = motion;
      group.userData["heroMotion"] = motion;
    }
    s.attack = e.lastAttackTime;
    s.cds = [...hero.cds];
    s.alive = e.alive;
  });

  return <group ref={root} name={`hero-${e.id}`} position={[e.pos.x, 0, e.pos.z]}>
    <group position={rig.offset} scale={rig.scale}><primitive object={rig.object} dispose={null} /></group>
  </group>;
}

export function AnimatedHero({ w, e }: { w: World; e: Entity }) {
  const asset = HERO_ASSETS[e.hero?.defId ?? "warrior"] ?? HERO_ASSETS["warrior"];
  if (!asset) return null;
  return <Suspense fallback={<mesh position={[e.pos.x, 0.1, e.pos.z]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.6, 0.8, 24]} /><meshBasicMaterial color={e.team === 0 ? 0x4f86d9 : 0xd9574f} /></mesh>}>
    <Rig w={w} e={e} asset={asset} />
  </Suspense>;
}