import { useEffect, useRef, type PointerEvent, type CSSProperties } from "react";
import { Crosshair, Pause, ShoppingBag, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import atlas from "@/assets/ui/ability-atlas.jpg";
import { abilityLevel, heroById, type AbilityDef } from "@/game/data/heroes";
import { cmdAbility, cmdAttackNearest, cmdConfirm, cmdStop } from "@/game/game";
import { aimPoint, stickVector, type TouchInput } from "@/game/touch-input";
import type { World } from "@/game/ecs/world";
import type { HudSnapshot } from "@/game/store";

export function CombatControls({ w, s, input, onShop, onPause }: { w: World; s: HudSnapshot; input: TouchInput; onShop: () => void; onPause: () => void }) {
  const def = heroById(s.defId);
  const row = Math.max(0, ["warrior", "mage", "archer", "support"].indexOf(s.defId));
  const stick = useRef<HTMLButtonElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const pointer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const release = () => {
    pointer.current = null; input.moving = false; input.move = { x: 0, z: 0 };
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
    cmdStop(w);
  };
  useEffect(() => {
    const reset = () => { release(); input.aiming = false; input.attacking = false; w.input.targeting = -1; };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", reset);
    return () => { reset(); window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", reset); };
  }, [w, input]);
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== pointer.current) return;
    input.move = stickVector(e.clientX - origin.current.x, e.clientY - origin.current.y);
    if (knob.current) knob.current.style.transform = `translate(${input.move.x * 36}px, ${input.move.z * 36}px)`;
  };
  return <>
    <div className="combat-actions pointer-events-auto">
      <Button variant="ghost" size="icon" title="Mercado Arcano" aria-label="Abrir mercado" onClick={onShop}><ShoppingBag /></Button>
      <span className="text-sm text-primary">◈ {s.gold}</span>
      <Button variant="ghost" size="icon" title="Pausar" aria-label="Pausar partida" onClick={onPause}><Pause /></Button>
    </div>
    <div className="combat-vitals">
      <div className="mb-1 flex items-center gap-2"><span className="level-medallion">{s.level}</span><span className="font-display text-sm text-primary">{def.name}</span><span className="ml-auto text-xs text-muted-foreground">{s.heroes.find((h) => h.id === w.playerId)?.k ?? 0}/{s.heroes.find((h) => h.id === w.playerId)?.d ?? 0}/{s.heroes.find((h) => h.id === w.playerId)?.a ?? 0}</span></div>
      <VitalBar value={s.hp} max={s.maxHp} kind="hp" />
      <VitalBar value={s.mana} max={s.maxMana} kind="mana" />
    </div>
    <Button ref={stick} variant="ghost" aria-label="Mover herói" title="Mover herói" className="movement-stick pointer-events-auto touch-none" disabled={!s.alive}
      onPointerDown={(e) => {
        if (pointer.current !== null || w.paused) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); pointer.current = e.pointerId;
        origin.current = { x: e.clientX, y: e.clientY }; input.moving = true; cmdStop(w);
      }} onPointerMove={move} onPointerUp={(e) => { if (e.pointerId === pointer.current) release(); }} onPointerCancel={release} onLostPointerCapture={() => { if (pointer.current !== null) release(); }}>
      <span className="stick-axis" /><span className="stick-knob" ref={knob}><Crosshair /></span>
    </Button>
    <div className="ability-fan pointer-events-auto">
      {def.abilities.map((a, i) => <AimAbility key={a.key} a={a} index={i} row={row} s={s} w={w} input={input} />)}
      <Button variant="ghost" className="attack-orb touch-none" aria-label="Atacar inimigo próximo" title="Ataque básico"
        disabled={!s.alive} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); input.attacking = true; cmdAttackNearest(w); }}
        onPointerUp={() => { input.attacking = false; }} onPointerCancel={() => { input.attacking = false; }} onLostPointerCapture={() => { input.attacking = false; }}
        onClick={() => cmdAttackNearest(w)}><Swords /><span>ATACAR</span></Button>
      {s.targeting >= 0 && <Button variant="ghost" size="icon" className="aim-cancel" title="Cancelar mira" aria-label="Cancelar mira" onPointerDown={(e) => e.stopPropagation()} onClick={() => { input.aiming = false; w.input.targeting = -1; }}><X /></Button>}
    </div>
  </>;
}

function AimAbility({ a, index, row, s, w, input }: { a: AbilityDef; index: number; row: number; s: HudSnapshot; w: World; input: TouchInput }) {
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const level = abilityLevel(s.level, index);
  const cd = s.cds[index] ?? 0;
  const total = a.cd[Math.max(0, level - 1)] ?? 1;
  const ready = s.alive && level > 0 && cd <= 0 && s.mana >= a.mana;
  const style = { "--atlas": `url(${atlas})`, "--icon-x": `${index * 100 / 3}%`, "--icon-y": `${row * 100 / 3}%`, "--cooldown": `${Math.min(1, cd / total) * 360}deg` } as CSSProperties;
  const update = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current, me = w.player;
    if (!g || g.id !== e.pointerId || !me) return;
    w.input.mouse = aimPoint(me.pos, stickVector(e.clientX - g.x, e.clientY - g.y), a.range, me.rot);
  };
  const end = (e: PointerEvent<HTMLButtonElement>, cancel: boolean) => {
    if (gesture.current?.id !== e.pointerId) return;
    if (!cancel && a.targeted) { update(e); cmdConfirm(w); }
    if (cancel) w.input.targeting = -1;
    gesture.current = null; input.aiming = false;
  };
  return <Button variant="ghost" style={style} className={`skill-orb skill-orb-${index} touch-none ${s.targeting === index ? "skill-orb-aiming" : ""}`}
    disabled={!ready} aria-label={`${a.key}: ${a.name}`} title={`${a.name} · ${a.desc} · ${a.mana} mana`}
    onPointerDown={(e) => {
      if (!ready || w.paused || input.aiming) return;
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
      gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      if (a.targeted) { input.aiming = true; w.input.targeting = -1; cmdAbility(w, index); update(e); }
      else cmdAbility(w, index);
    }} onPointerMove={update} onPointerUp={(e) => end(e, false)} onPointerCancel={(e) => end(e, true)} onLostPointerCapture={(e) => { if (gesture.current) end(e, true); }}>
    <span className="skill-art" /><span className="cooldown-sweep" />
    <span className="skill-key">{a.key}</span>
    {cd > 0 && <span className="cooldown-value">{Math.ceil(cd)}</span>}
    {level === 0 && <span className="cooldown-value text-xs">Nv 6</span>}
    <span className="skill-mana">{a.mana}</span>
  </Button>;
}

function VitalBar({ value, max, kind }: { value: number; max: number; kind: "hp" | "mana" }) {
  return <div className={`combat-vital combat-vital-${kind}`}><div className="vital-fill" style={{ width: `${Math.max(0, Math.min(100, value / max * 100))}%` }} /><span className="vital-segments" /><span className="vital-label">{Math.ceil(value)} / {Math.ceil(max)}</span></div>;
}