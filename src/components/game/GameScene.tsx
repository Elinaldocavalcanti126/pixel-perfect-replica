import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { World } from "@/game/ecs/world";
import { step, TICK, cmdRightClick, cmdConfirm } from "@/game/game";
import { MapView } from "./MapView";
import { HeroModel, MonsterModel, TowerModel } from "./Units";
import { Effects, HealthBars, Minions } from "./Instanced";

export interface CamState { x: number; z: number; zoom: number; locked: boolean }

function Controller({ w, cam }: { w: World; cam: CamState }) {
  const { camera, gl } = useThree();
  const acc = useRef(0);
  const ndc = useRef(new THREE.Vector2(0, 0));
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;
    const updateNdc = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      ndc.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const ground = () => {
      ray.setFromCamera(ndc.current, camera);
      return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
    };
    const down = (e: MouseEvent) => {
      updateNdc(e);
      const p = ground();
      if (!p) return;
      w.input.mouse = p;
      if (e.button === 2) cmdRightClick(w, p);
      if (e.button === 0) cmdConfirm(w);
    };
    const wheel = (e: WheelEvent) => { cam.zoom = Math.max(16, Math.min(42, cam.zoom + e.deltaY * 0.02)); };
    const menu = (e: Event) => e.preventDefault();
    el.addEventListener("mousemove", updateNdc);
    el.addEventListener("mousedown", down);
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("contextmenu", menu);
    return () => {
      el.removeEventListener("mousemove", updateNdc);
      el.removeEventListener("mousedown", down);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", menu);
    };
  }, [gl, camera, w, cam, ray, plane, hit]);

  useFrame((_, raw) => {
    acc.current += Math.min(raw, 0.25);
    while (acc.current >= TICK) { step(w); acc.current -= TICK; }
    ray.setFromCamera(ndc.current, camera);
    if (ray.ray.intersectPlane(plane, hit)) w.input.mouse = { x: hit.x, z: hit.z };
    const me = w.player;
    if (cam.locked && me) {
      const k = 1 - Math.exp(-8 * raw);
      cam.x += (me.pos.x - cam.x) * k; cam.z += (me.pos.z - cam.z) * k;
    }
    const a = (55 * Math.PI) / 180;
    camera.position.set(cam.x, Math.sin(a) * cam.zoom, cam.z + Math.cos(a) * cam.zoom);
    camera.lookAt(cam.x, 0, cam.z);
  });
  return null;
}

function Entities({ w }: { w: World }) {
  const [, setV] = useState(0);
  const last = useRef(-1);
  useFrame(() => {
    // só reconstrói a lista React quando heróis/torres/monstros mudam
    const sig = w.entities.filter((e) => e.kind === "monster").length * 1000 + w.entities.length;
    if (sig !== last.current) { last.current = sig; setV((x) => x + 1); }
  });
  return (
    <>
      {w.entities.map((e) =>
        e.kind === "hero" ? <HeroModel key={e.id} w={w} e={e} /> :
        e.kind === "tower" || e.kind === "altar" ? <TowerModel key={e.id} w={w} e={e} /> :
        e.kind === "monster" ? <MonsterModel key={e.id} w={w} e={e} /> : null,
      )}
    </>
  );
}

export function GameScene({ w, cam }: { w: World; cam: CamState }) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 42, near: 0.5, far: 200, position: [0, 30, 20] }} className="absolute inset-0">
      <color attach="background" args={["#0e1612"]} />
      <fog attach="fog" args={["#0e1612", 45, 95]} />
      <hemisphereLight args={["#d8e2ff", "#2a2418", 0.7]} />
      <directionalLight position={[25, 40, 15]} intensity={2.2} color="#ffe2b8" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={45} shadow-camera-bottom={-45} />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 6, 0]} scale={[12, 12, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={0.6} color="#8fb0d8" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <MapView />
      <Entities w={w} />
      <Minions w={w} />
      <Effects w={w} />
      <HealthBars w={w} />
      <Controller w={w} cam={cam} />
    </Canvas>
  );
}
