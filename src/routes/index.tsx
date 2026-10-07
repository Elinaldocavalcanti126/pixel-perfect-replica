import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { HEROES } from "@/game/data/heroes";

const Match = lazy(() => import("@/components/game/Match"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Arcana Rift — MOBA 3D no navegador" },
      { name: "description", content: "Arcana Rift: MOBA 5x5 original em 3D low-poly, jogue contra bots direto no navegador." },
      { property: "og:title", content: "Arcana Rift — MOBA 3D no navegador" },
      { property: "og:description", content: "Escolha seu herói e destrua o altar inimigo em partidas 5x5 contra bots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [hero, setHero] = useState(HEROES[0]!.id);
  const [playing, setPlaying] = useState(false);
  if (playing)
    return (
      <Suspense fallback={<div className="grid min-h-screen place-items-center font-display text-2xl text-primary">Abrindo a fenda…</div>}>
        <Match heroId={hero} onExit={() => setPlaying(false)} />
      </Suspense>
    );
  const sel = HEROES.find((h) => h.id === hero)!;
  return (
    <main className="menu-bg min-h-screen px-6 py-12 font-body">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Batalha 5 contra 5</p>
        <h1 className="font-display text-6xl text-primary md:text-7xl">Arcana Rift</h1>
        <p className="mt-2 text-muted-foreground">Escolha seu campeão e destrua o altar inimigo.</p>
      </header>
      <section className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-4">
        {HEROES.map((h) => (
          <button key={h.id} onClick={() => setHero(h.id)} className={`hero-card ${hero === h.id ? "hero-card--active" : ""}`}>
            <span className="font-display text-5xl text-primary">{h.name[0]}</span>
            <span className="mt-3 font-display text-xl">{h.name}</span>
            <span className="text-xs text-muted-foreground">{h.title}</span>
            <span className="mt-2 text-xs text-primary">{h.role}</span>
          </button>
        ))}
      </section>
      <section className="panel-frame mx-auto mt-6 max-w-5xl p-5">
        <p className="text-sm"><span className="text-primary">Passiva — {sel.passive.name}:</span> {sel.passive.desc}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {sel.abilities.map((a) => (
            <div key={a.key} className="text-sm">
              <p className="font-display text-primary">{a.key} · {a.name}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-8 text-center">
        <button className="btn-rune text-lg" onClick={() => setPlaying(true)}>Jogar contra bots</button>
      </div>
    </main>
  );
}
