import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Square, X } from "lucide-react";
import { HEROES } from "@/game/data/heroes";
import { ITEMS } from "@/game/data/items";
import type { HudSnapshot } from "@/game/store";
import { tacticalStatsSchema, type TacticalStats } from "@/lib/tactical-stats";

type Props = { s: HudSnapshot; team: number; onClose: () => void };

export function TacticalCoach({ s, team, onClose }: Props) {
  const me = s.heroes.find((h) => h.defId === s.defId && h.team === team);
  const [form, setForm] = useState<TacticalStats>({
    heroId: s.defId as TacticalStats["heroId"], result: s.winner === null ? "ongoing" : s.winner === team ? "victory" : "defeat",
    minutes: Math.max(0.1, Math.round((s.time / 60) * 10) / 10), level: s.level, kills: me?.k ?? 0, deaths: me?.d ?? 0, assists: me?.a ?? 0,
    cs: me?.cs ?? 0, gold: s.gold, items: s.items.filter((x): x is TacticalStats["items"][number] => !!x), context: "",
  });
  const [advice, setAdvice] = useState(""); const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const set = <K extends keyof TacticalStats>(k: K, v: TacticalStats[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k: "minutes" | "level" | "kills" | "deaths" | "assists" | "cs" | "gold", label: string, step = 1) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">{label}
      <Input aria-label={label} type="number" min={k === "level" ? 1 : 0} step={step} value={form[k]} onChange={(e) => set(k, Number(e.target.value))}
        className="rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
    </label>);

  async function submit() {
    const parsed = tacticalStatsSchema.safeParse(form);
    if (!parsed.success) { setError("Confira os números: use valores inteiros e não negativos."); return; }
    const ac = new AbortController(); abort.current = ac;
    setAdvice(""); setError(null); setThinking(true); setLoading(true);
    try {
      const res = await fetch("/api/tactical-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: ac.signal });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => null) as { message?: string } | null; throw new Error(j?.message ?? "Não foi possível gerar dicas."); }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { type: string; text?: string; message?: string };
          if (ev.type === "text") { setThinking(false); setAdvice((a) => a + (ev.text ?? "")); }
          else if (ev.type === "error") setError(ev.message ?? "A análise falhou.");
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Não foi possível gerar dicas.");
    } finally { setThinking(false); setLoading(false); abort.current = null; }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Conselheiro tático" className="pointer-events-auto absolute left-1/2 top-1/2 z-20 max-h-[90vh] w-[min(720px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto panel-frame bg-card bg-none p-5 text-left">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h2 className="font-display text-2xl text-primary">Conselheiro Tático</h2><p className="text-xs text-muted-foreground">Arcana Rift · Análise da partida</p></div>
        <Button variant="ghost" size="icon" aria-label="Fechar conselheiro" title="Fechar conselheiro" onClick={() => { abort.current?.abort(); onClose(); }}><X /></Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Herói
          <Select value={form.heroId} onValueChange={(v) => set("heroId", v as TacticalStats["heroId"])}><SelectTrigger aria-label="Herói"><SelectValue /></SelectTrigger><SelectContent>
            {HEROES.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Resultado
          <Select value={form.result} onValueChange={(v) => set("result", v as TacticalStats["result"])}><SelectTrigger aria-label="Resultado"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="ongoing">Em andamento</SelectItem><SelectItem value="victory">Vitória</SelectItem><SelectItem value="defeat">Derrota</SelectItem></SelectContent></Select></label>
        {num("minutes", "Minutos", 0.1)}{num("level", "Nível")}{num("kills", "Abates")}{num("deaths", "Mortes")}{num("assists", "Assistências")}{num("cs", "Tropas abatidas")}{num("gold", "Ouro atual")}
      </div>
      <fieldset className="mt-3"><legend className="mb-1 text-xs text-muted-foreground">Itens (até 6)</legend>
        <div className="flex flex-wrap gap-1.5">{ITEMS.map((it) => { const on = form.items.includes(it.id as TacticalStats["items"][number]); return (
          <Button key={it.id} variant="outline" size="sm" type="button" aria-pressed={on} disabled={!on && form.items.length >= 6}
            onClick={() => set("items", on ? form.items.filter((x) => x !== it.id) : [...form.items, it.id as TacticalStats["items"][number]])}
            className={`rounded border px-2 py-1 text-xs ${on ? "border-primary text-primary" : "border-border text-muted-foreground"} disabled:opacity-40`}>{it.icon} {it.name}</Button>); })}</div>
      </fieldset>
      <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">Observações (opcional)
        <Textarea maxLength={1200} value={form.context} onChange={(e) => set("context", e.target.value)} placeholder="Ex.: morri muito na rota inferior depois dos 8 minutos"
          className="min-h-16 rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground" /></label>
      <div className="mt-4 flex gap-2">
        <Button disabled={loading} onClick={submit}><Sparkles />{loading ? "Analisando…" : "Gerar dicas"}</Button>
        {loading && <Button variant="outline" onClick={() => abort.current?.abort()}><Square />Parar</Button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {thinking && <p className="mt-3 text-sm text-muted-foreground">Estudando sua partida…</p>}
      {advice && <div aria-live="polite" className="mt-3 whitespace-pre-wrap rounded border border-border bg-secondary/60 p-3 text-sm leading-relaxed">{advice}</div>}
    </div>
  );
}