import { useEffect, useState } from "react";
import type { World } from "@/game/ecs/world";
import type { CamState } from "@/components/game/GameScene";
import { useHud } from "@/game/store";
import { heroById } from "@/game/data/heroes";
import { ITEMS, itemById } from "@/game/data/items";
import { cmdAbility, cmdStop } from "@/game/game";
import { buyItem, sellItem, inShopRange } from "@/game/systems/economy";
import { Minimap } from "./Minimap";
import { TacticalCoach } from "./TacticalCoach";
import { CombatControls } from "./CombatControls";
import type { TouchInput } from "@/game/touch-input";
import { Button } from "@/components/ui/button";

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

export function Hud({ w, cam, input, onExit }: { w: World; cam: CamState; input: TouchInput; onExit: () => void }) {
  const s = useHud();
  const [shop, setShop] = useState(false);
  const [board, setBoard] = useState(false);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [coach, setCoach] = useState(false);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (coach) return;
      if (e.target instanceof HTMLElement && e.target.closest("input,textarea,select")) return;
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
  }, [w, cam, coach]);

  if (!s) return null;
  const def = heroById(s.defId);
  const me = w.player;
  if (!me) return null;
  const flash = (m: string | null) => { if (m) { setToast(m); setTimeout(() => setToast(null), 1500); } };

  // Painel do alvo focado (topo central), como nos MOBAs modernos.
  const tgt = me.attackTarget != null ? w.byId.get(me.attackTarget) : undefined;
  const showTgt = !!tgt && tgt.alive && tgt.visible && tgt.team !== me.team;
  const tgtName = tgt?.hero?.name ?? (tgt?.kind === "tower" ? "Torre" : tgt?.kind === "altar" ? "Altar" : tgt?.kind === "monster" ? (tgt.monster?.big ? "Colosso Ancestral" : "Monstro da Selva") : "Lacaio");

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-body text-foreground">
      {/* topo: placar */}
      <div className="absolute combat-score absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-4 panel-frame px-5 py-1.5">
        <span className="font-display text-xl text-team-blue">{s.teamKills[0]}</span>
        <span className="font-display text-sm tracking-widest text-primary">{fmt(s.time)}</span>
        <span className="font-display text-xl text-team-red">{s.teamKills[1]}</span>
      </div>

      {/* painel do alvo focado */}
      {showTgt && tgt && (
        <div className="combat-target absolute left-1/2 top-14 w-64 -translate-x-1/2 panel-frame px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-display ${tgt.team === 1 ? "text-team-red" : "text-primary"}`}>{tgtName}</span>
            {tgt.hero && <span className="text-muted-foreground">Nv {tgt.hero.level}</span>}
          </div>
          <div className="relative mt-1 h-2.5 overflow-hidden rounded-sm border border-border bg-background">
            <div className={`h-full ${tgt.team === 1 ? "bg-team-red" : "bg-hp"}`} style={{ width: `${(tgt.hp / tgt.stats.maxHp) * 100}%` }} />
          </div>
        </div>
      )}

      {/* feed de abates */}
      <div className="combat-feed absolute right-3 top-16 flex w-72 flex-col gap-1">
        {s.kills.filter((k) => s.time - k.t < 10).map((k, i) => (
          <div key={i} className="panel-frame flex justify-between px-3 py-1 text-xs">
            <span className={k.killerTeam === 0 ? "text-team-blue" : k.killerTeam === 1 ? "text-team-red" : "text-primary"}>{k.killer}</span>
            <span className="text-muted-foreground">⚔</span>
            <span>{k.victim}</span>
          </div>
        ))}
      </div>

      {/* mensagens */}
      <div className="absolute left-1/2 top-28 -translate-x-1/2 text-center">
        {s.messages.map((m, i) => <p key={i} className="font-display text-lg text-primary drop-shadow">{m.text}</p>)}
        {toast && <p className="mt-2 text-sm text-destructive">{toast}</p>}
      </div>

      {!s.alive && s.winner === null && (
        <div className="absolute inset-x-0 top-1/3 text-center">
          <p className="font-display text-3xl text-destructive">Você caiu</p>
          <p className="text-muted-foreground">Renascendo em {Math.ceil(s.respawn)}s</p>
        </div>
      )}

      <CombatControls w={w} s={s} input={input} onShop={() => setShop((x) => !x)} onPause={() => { input.moving = false; input.attacking = false; input.aiming = false; cmdStop(w); w.input.targeting = -1; w.paused = true; setPaused(true); }} />
      <div className="combat-minimap"><Minimap w={w} cam={cam} /></div>

      {shop && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(560px,calc(100vw-24px))] max-h-[85dvh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 panel-frame p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl text-primary">Mercado Arcano</h2>
            <span className="text-sm">◈ {s.gold}</span>
          </div>
          {!inShopRange(w, me) && <p className="mb-2 text-xs text-destructive">Você precisa estar na base para comprar.</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ITEMS.map((it) => (
              <Button variant="ghost" key={it.id} onClick={() => flash(buyItem(w, me, it.id))}
                className={`rounded border border-border bg-secondary/70 p-2 text-left transition hover:border-primary ${s.gold < it.cost ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2"><span className="text-xl text-primary">{it.icon}</span><span className="text-sm">{it.name}</span></div>
                <p className="text-[11px] text-muted-foreground">{it.desc}</p>
                <p className="text-xs text-primary">◈ {it.cost}</p>
              </Button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">{s.items.map((id, i) => <Button variant="outline" size="icon" key={i} disabled={!id} title={id ? `${itemById(id)?.name} · Vender` : "Vazio"} onClick={() => flash(sellItem(w, me, i))}>{id ? itemById(id)?.icon : "·"}</Button>)}</div>
          <Button variant="ghost" onClick={() => setShop(false)} className="mt-4 w-full rounded border border-border py-1.5 text-sm hover:border-primary">Fechar (P)</Button>
        </div>
      )}

      {board && <Scoreboard s={s} />}

      {(paused || s.winner !== null) && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className={`panel-frame w-[min(384px,calc(100vw-24px))] p-8 text-center ${coach ? "invisible" : ""}`}>
            {s.winner !== null ? (
              <h2 className={`font-display text-4xl ${s.winner === 0 ? "text-primary" : "text-destructive"}`}>{s.winner === me.team ? "Vitória" : "Derrota"}</h2>
            ) : <h2 className="font-display text-3xl text-primary">Pausado</h2>}
            <div className="mt-6 flex flex-col gap-2">
              {s.winner === null && <Button variant="ghost" className="btn-rune" onClick={() => { w.paused = false; setPaused(false); }}>Continuar</Button>}
              <Button variant="ghost" className="btn-rune btn-rune--ghost" onClick={() => setCoach(true)}>Dicas táticas com IA</Button>
              <Button variant="ghost" className="btn-rune btn-rune--ghost" onClick={onExit}>Sair para o menu</Button>
            </div>
          </div>
          {coach && <TacticalCoach s={s} team={me.team} onClose={() => setCoach(false)} />}
        </div>
      )}
    </div>
  );
}

function Scoreboard({ s }: { s: NonNullable<ReturnType<typeof useHud>> }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[min(640px,calc(100vw-24px))] overflow-x-auto -translate-x-1/2 -translate-y-1/2 panel-frame p-4">
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
                  <td>{h.items.filter(Boolean).map((id) => (id ? itemById(id)?.icon : "")).join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
