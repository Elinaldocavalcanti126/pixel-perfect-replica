import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { HERO_ASSETS } from "./heroAssets";
import { createHeroOutline, createHeroRamp, toonMaterial } from "./heroMaterials";
import { inPlaceClips, playHeroClip } from "./heroAnimation";
import { useHeroColors } from "./heroVisuals";
import { HeroRegalia } from "./HeroRegalia";

function ShowcaseModel({ heroId }: { heroId: string }) {
  const asset = HERO_ASSETS[heroId] ?? HERO_ASSETS["warrior"]!;
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(asset.url);
  const animationSource = useGLTF(asset.animationUrl ?? asset.url);
  const weaponSource = useGLTF(asset.weapon?.url ?? asset.url);
  const colors = useHeroColors(heroId, 0);
  const model = useMemo(() => {
    const object = clone(scene);
    if (asset.weapon) {
      const anchor = object.getObjectByName(asset.weapon.anchor);
      const sourcePivot = weaponSource.scene.getObjectByName(asset.weapon.pivot);
      if (anchor && sourcePivot) anchor.add(clone(sourcePivot));
    }
    const ramp = createHeroRamp();
    const materials: THREE.Material[] = [];
    const meshes: THREE.Mesh[] = [];
    const includeAll = asset.accessories.includes("*");
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const bodyPart = /^(Knight|Mage|Rogue)_(Arm|Body|Head|Leg)/.test(node.name);
      node.visible = includeAll || bodyPart || asset.accessories.includes(node.name);
      if (!node.visible) return;
      const accessory = !includeAll && asset.accessories.includes(node.name);
      const convert = (source: THREE.Material) => {
        const material = toonMaterial(source, ramp, colors.rim, colors.tint, colors.accent, accessory);
        materials.push(material);
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
      meshes.push(node);
    });
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    meshes.forEach((mesh) => bounds.expandByObject(mesh));
    const size = bounds.getSize(new THREE.Vector3());
    const scale = asset.height / (size.y || 1);
    const center = bounds.getCenter(new THREE.Vector3());
    const outline = createHeroOutline(new THREE.Color(0.025, 0.035, 0.055), 0.015 / scale);
    materials.push(outline);
    for (const mesh of meshes) {
      const hull = mesh instanceof THREE.SkinnedMesh
        ? new THREE.SkinnedMesh(mesh.geometry, outline)
        : new THREE.Mesh(mesh.geometry, outline);
      if (hull instanceof THREE.SkinnedMesh && mesh instanceof THREE.SkinnedMesh) {
        hull.bindMode = mesh.bindMode;
        hull.bind(mesh.skeleton, mesh.bindMatrix);
        hull.bindMatrixInverse.copy(mesh.bindMatrixInverse);
      }
      hull.frustumCulled = false;
      hull.morphTargetInfluences = mesh.morphTargetInfluences;
      hull.morphTargetDictionary = mesh.morphTargetDictionary;
      mesh.add(hull);
    }
    return { object, scale, offset: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number], materials, ramp };
  }, [scene, weaponSource.scene, asset, colors, heroId]);

  const clips = useMemo(() => inPlaceClips(asset.animationUrl ? animationSource.animations : animations), [asset.animationUrl, animationSource.animations, animations]);
  const { actions } = useAnimations(clips, group);
  useEffect(() => {
    const idle = asset.clips.idle;
    playHeroClip(actions, null, idle, "idle");
    return () => {
      model.materials.forEach((material) => material.dispose());
      model.ramp.dispose();
    };
  }, [actions, asset, model]);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += Math.min(delta, 0.05) * 0.12;
  });

  return <group ref={group} position-y={-0.32}>
    <group scale={0.74}>
      <group position={model.offset} scale={model.scale}><primitive object={model.object} dispose={null} /></group>
      <HeroRegalia heroId={heroId} />
    </group>
  </group>;
}

export default function HeroShowcase({ heroId }: { heroId: string }) {
  return <div className="hero-showcase" aria-hidden="true"><Canvas dpr={[1, 1.4]} camera={{ position: [0, 1.45, 6.1], fov: 29, near: 0.1, far: 30 }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={1.15} />
    <directionalLight position={[3, 5, 4]} intensity={2.3} color="#ffe6b8" />
    <pointLight position={[-2.8, 2.6, 1.2]} intensity={27} color={heroId === "maelis" ? "#8deaff" : heroId === "veyra" ? "#e57de8" : heroId === "mage" ? "#a98bff" : heroId === "archer" ? "#8ce6a5" : heroId === "support" ? "#83e6d3" : "#ffd27a"} distance={8} />
    <Suspense fallback={null}><ShowcaseModel heroId={heroId} /></Suspense>
  </Canvas></div>;
}
