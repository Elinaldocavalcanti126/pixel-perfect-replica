import { useEffect, useState } from "react";
import type { World } from "@/game/ecs/world";
import type { CamState } from "@/components/game/GameScene";
import { useHud } from "@/game/store";
import { heroById, abilityLevel } from "@/game/data/heroes";
import { ITEMS, itemById } from "@/game/data/items";
import { cmdAbility, cmdStop } from "@/game/game";
import { buyItem, sellItem, inShopRange } from "@/game/systems/economy";
import { XP_TABLE } from "@/game/data/heroes";
import { Minimap } from "./Minimap";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Hud({ w, cam, onExit }: { w: World; cam: CamState; onExit: () => void }) {
  const s = useHud();
  const [shop, setShop] = useState(false);
  const [board, setBoard] = useState(false);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "q") cmdAbility(w, 0);
      else if (k === "w") cmdAbility(w, 1);
      else if (k === "e") cmdAbility(w, 2);
      else if (k === "r") cmdAbility(w, 3);
      else if (k === "s") cmdStop(w);
      else if (k === "p") setShop((x) => !x);
      else if (k === "tab") { e.preventDefault(); setBoard(true); }
      else if (k === " ") { e.preventDefault(); cam.locked = true; }
      else if (k === "escape") {
        if (w.input.targeting >= 0) w.input.targeting = -1;
        else setPaused((p) => { w.paused = !p; return !p; });
      }
    };
    const ku = (e: KeyboardEvent) => { if (e.key === "Tab") setBoard(false); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [w, cam]);

  if (!s) return null;
  const def = heroById(s.defId);
  const me = w.player!;
  const flash = (m: string | null) => { if (m) { setToast(m); setTimeout(() => setToast(null), 1500); } };

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-body text-foreground">
      {/* topo: placar */}
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-4 panel-frame px-5 py-1.5">
        <span className="font-display text-xl text-team-blue">{s.teamKills[0]}</span>
        <span className="font-display text-sm tracking-widest text-primary">{fmt(s.time)}</span>
        <span className="font-display text-xl text-team-red">{s.teamKills[1]}</span>
      </div>

      {/* feed de abates */}
      <div className="absolute right-3 top-3 flex w-72 flex-col gap-1">
        {s.kills.filter((k) => s.time - k.t < 10).map((k, i) => (
          <div key={i} className="panel-frame flex justify-between px-3 py-1 text-xs">
            <span className={k.killerTeam === 0 ? "text-team-blue" : k.killerTeam === 1 ? "text-team-red" : "text-primary"}>{k.killer}</span>
            <span className="text-muted-foreground">⚔</span>
            <span>{k.victim}</span>
          </div>
        ))}
      </div>

      {/* mensagens */}
      <div className="absolute left-1/2 top-16 -translate-x-1/2 text-center">
        {s.messages.map((m, i) => <p key={i} className="font-display text-lg text-primary drop-shadow">{m.text}</p>)}
        {toast && <p className="mt-2 text-sm text-destructive">{toast}</p>}
      </div>

      {!s.alive && s.winner === null && (
        <div className="absolute inset-x-0 top-1/3 text-center">
          <p className="font-display text-3xl text-destructive">Você caiu</p>
          <p className="text-muted-foreground">Renascendo em {Math.ceil(s.respawn)}s</p>
        </div>
      )}

      {/* barra inferior */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-3">
        <div className="panel-frame flex items-center gap-3 p-2.5">
          <div className="relative grid h-20 w-20 place-items-center rounded-md border border-primary/60 bg-secondary font-display text-3xl text-primary">
            {def.name[0]}
            <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-full border border-primary bg-background text-xs">{s.level}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              {def.abilities.map((a, i) => {
                const lvl = abilityLevel(s.level, i);
                const cd = s.cds[i]!;
                const ready = lvl > 0 && cd <= 0 && s.mana >= a.mana;
                return (
                  <button key={a.key} title={`${a.name}: ${a.desc}`} onClick={() => cmdAbility(w, i)}
                    className={`ability-slot pointer-events-auto ${s.targeting === i ? "ability-slot--active" : ""} ${ready ? "" : "opacity-60"}`}>
                    <span className="text-[10px] leading-tight">{a.name}</span>
                    <span className="absolute left-1 top-0.5 font-display text-xs text-primary">{a.key}</span>
                    {lvl === 0 && <span className="absolute inset-0 grid place-items-center bg-background/80 text-[10px]">Nv 6</span>}
                    {cd > 0 && <span className="absolute inset-0 grid place-items-center bg-background/70 font-display text-lg">{Math.ceil(cd)}</span>}
                    <span className="absolute bottom-0.5 right-1 text-[9px] text-mana">{a.mana}</span>
                  </button>
                );
              })}
            </div>
            <Bar v={s.hp} max={s.maxHp} cls="bg-hp" extra={s.shield} />
            <Bar v={s.mana} max={s.maxMana} cls="bg-mana" />
            <div className="h-1 w-full overflow-hidden rounded bg-secondary"><div className="h-full bg-primary" style={{ width: `${s.level >= 18 ? 100 : (s.xp / XP_TABLE[s.level - 1]!) * 100}%` }} /></div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>⚔ {Math.round(s.stats.ad)}</span><span>✦ {Math.round(s.stats.ap)}</span>
            <span>⛨ {Math.round(s.stats.armor)}</span><span>❖ {Math.round(s.stats.mr)}</span>
            <span>➶ {s.stats.speed.toFixed(1)}</span><span>⏱ {s.stats.atkSpeed.toFixed(2)}</span>
            {s.buffed && <span className="col-span-2 text-primary">Bênção do Colosso</span>}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-3 gap-1">
              {s.items.map((id, i) => (
                <button key={i} onClick={() => sellItem(w, me, i)} title={id ? `${itemById(id)?.name} (clique para vender)` : "Vazio"}
                  className="pointer-events-auto grid h-9 w-9 place-items-center rounded border border-border bg-secondary text-lg text-primary">
                  {id ? itemById(id)?.icon : ""}
                </button>
              ))}
            </div>
            <button onClick={() => setShop((x) => !x)} className="pointer-events-auto text-sm text-primary">◈ {s.gold} <span className="text-[10px] text-muted-foreground">(P)</span></button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3"><Minimap w={w} cam={cam} /></div>

      <div className="absolute bottom-3 left-3 panel-frame max-w-[220px] p-2 text-[10px] leading-relaxed text-muted-foreground">
        Botão direito: mover/atacar · Q W E R: habilidades · Clique esquerdo: confirmar · S: parar · Tab: placar · Esc: pausa
        <p className="mt-1 text-primary">{def.passive.name}: <span className="text-muted-foreground">{def.passive.desc}</span></p>
      </div>

      {shop && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[560px] -translate-x-1/2 -translate-y-1/2 panel-frame p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl text-primary">Mercado Arcano</h2>
            <span className="text-sm">◈ {s.gold}</span>
          </div>
          {!inShopRange(w, me) && <p className="mb-2 text-xs text-destructive">Você precisa estar na base para comprar.</p>}
          <div className="grid grid-cols-3 gap-2">
            {ITEMS.map((it) => (
              <button key={it.id} onClick={() => flash(buyItem(w, me, it.id))}
                className={`rounded border border-border bg-secondary/70 p-2 text-left transition hover:border-primary ${s.gold < it.cost ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2"><span className="text-xl text-primary">{it.icon}</span><span className="text-sm">{it.name}</span></div>
                <p className="text-[11px] text-muted-foreground">{it.desc}</p>
                <p className="text-xs text-primary">◈ {it.cost}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setShop(false)} className="mt-4 w-full rounded border border-border py-1.5 text-sm hover:border-primary">Fechar (P)</button>
        </div>
      )}

      {board && <Scoreboard s={s} />}

      {(paused || s.winner !== null) && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="panel-frame w-96 p-8 text-center">
            {s.winner !== null ? (
              <h2 className={`font-display text-4xl ${s.winner === 0 ? "text-primary" : "text-destructive"}`}>{s.winner === me.team ? "Vitória" : "Derrota"}</h2>
            ) : <h2 className="font-display text-3xl text-primary">Pausado</h2>}
            <div className="mt-6 flex flex-col gap-2">
              {s.winner === null && <button className="btn-rune" onClick={() => { w.paused = false; setPaused(false); }}>Continuar</button>}
              <button className="btn-rune btn-rune--ghost" onClick={onExit}>Sair para o menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ v, max, cls, extra = 0 }: { v: number; max: number; cls: string; extra?: number }) {
  return (
    <div className="relative h-4 w-[268px] overflow-hidden rounded-sm border border-border bg-background">
      <div className={`h-full ${cls}`} style={{ width: `${(v / max) * 100}%` }} />
      {extra > 0 && <div className="absolute top-0 h-full bg-foreground/70" style={{ left: `${(v / max) * 100}%`, width: `${Math.min(100, (extra / max) * 100)}%` }} />}
      <span className="absolute inset-0 grid place-items-center text-[10px]">{Math.ceil(v)} / {Math.ceil(max)}</span>
    </div>
  );
}

function Scoreboard({ s }: { s: NonNullable<ReturnType<typeof useHud>> }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[640px] -translate-x-1/2 -translate-y-1/2 panel-frame p-4">
      {[0, 1].map((t) => (
        <div key={t} className="mb-3">
          <h3 className={`font-display ${t === 0 ? "text-team-blue" : "text-team-red"}`}>{t === 0 ? "Ordem Azul" : "Legião Rubra"}</h3>
          <table className="w-full text-xs">
            <tbody>
              {s.heroes.filter((h) => h.team === t).map((h) => (
                <tr key={h.id} className={h.alive ? "" : "opacity-50"}>
                  <td className="py-0.5">{h.name} <span className="text-muted-foreground">({heroById(h.defId).role.split(" ·")[0]})</span></td>
                  <td>Nv {h.level}</td>
                  <td>{h.k}/{h.d}/{h.a}</td>
                  <td>{h.cs} cs</td>
                  <td className="text-primary">◈ {h.gold}</td>
                  <td>{h.items.filter(Boolean).map((id) => itemById(id!)?.icon).join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
