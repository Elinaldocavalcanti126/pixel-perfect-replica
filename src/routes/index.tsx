import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, CircleHelp, Crosshair, Heart, Menu, Search, Shield, Sparkles, Swords, Trophy, Users, WandSparkles, X, Keyboard, MousePointer2, Gamepad2 } from "lucide-react";
import { HEROES } from "@/game/data/heroes";
import { HERO_PORTRAITS } from "@/game/data/heroPortraits";

const Match = lazy(() => import("@/components/game/Match"));
const HeroShowcase = lazy(() => import("@/components/game/HeroShowcase"));

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

const roleIcon = (role: string) => role.includes("Tanque") || role.includes("Guerreiro") ? Shield : role.includes("Mago") ? WandSparkles : role.includes("Arqueiro") ? Crosshair : Heart;
const roleLabel = (role: string) => role.split(" ·")[0];

function Index() {
  const [hero, setHero] = useState(HEROES[0]!.id);
  const [playing, setPlaying] = useState(false);
  const [matchKey, setMatchKey] = useState(0);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guided, setGuided] = useState(false);
  const sel = HEROES.find((h) => h.id === hero)!;
  const heroIndex = HEROES.findIndex((h) => h.id === hero);
  const filteredHeroes = useMemo(() => HEROES.filter((h) => `${h.name} ${h.title} ${h.role}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [query]);
  if (playing) return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#080d14] font-display text-2xl text-[#e8c989]">Abrindo a fenda…</div>}><Match key={matchKey} heroId={hero} guided={guided} onExit={() => { setGuided(false); setPlaying(false); }} onRestart={() => setMatchKey((key) => key + 1)} /></Suspense>;

  const announce = (label: string) => { setNotice(`${label} estará disponível em breve.`); window.setTimeout(() => setNotice(""), 2600); };
  const RoleIcon = roleIcon(sel.role);
  return (
    <main className="lobby-shell min-h-screen text-white">
      <div className="lobby-grain" aria-hidden="true" />
      <header className="lobby-topbar">
        <button className="brand-lockup" onClick={() => { setQuery(""); setHero(HEROES[0]!.id); }} aria-label="Arcana Rift início">
          <span className="brand-mark"><Sparkles size={21} /></span><span><b>ARCANA</b><small>R I F T</small></span>
        </button>
        <nav className="lobby-nav" aria-label="Navegação principal">
          <button className="lobby-nav-link is-current">INÍCIO</button>
          <button className="lobby-nav-link" onClick={() => document.getElementById("hero-roster")?.scrollIntoView({ behavior: "smooth" })}>HERÓIS</button>
          <button className="lobby-nav-link" onClick={() => announce("Oficina")}>OFICINA</button>
          <button className="lobby-nav-link" onClick={() => announce("Temporada")}>TEMPORADA</button>
        </nav>
        <div className="profile-chip"><div className="profile-avatar"><Users size={17} /></div><span><b>Invocador</b><small>Nível 01 · Ferro I</small></span><ChevronDown size={14} /></div>
        <button className="mobile-nav" aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? <X size={20} /> : <Menu size={20} />}</button>
        {mobileNavOpen && <nav className="mobile-nav-panel" aria-label="Navegação principal"><button onClick={() => { setMobileNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Início</button><button onClick={() => { setMobileNavOpen(false); document.getElementById("hero-roster")?.scrollIntoView({ behavior: "smooth" }); }}>Heróis</button><button onClick={() => { setMobileNavOpen(false); announce("Oficina"); }}>Oficina</button><button onClick={() => { setMobileNavOpen(false); announce("Temporada"); }}>Temporada</button></nav>}
      </header>

      <section className="lobby-hero" aria-label="Herói em destaque">
        <div className={`hero-art hero-art--${sel.id}`} key={sel.id} aria-hidden="true">
          <div className="art-rune art-rune--one" /><div className="art-rune art-rune--two" />
          <Suspense fallback={<span className="art-monogram">{sel.name.slice(0, 1)}</span>}><HeroShowcase heroId={sel.id} /></Suspense><span className="art-floor" />
        </div>
        <div className="lobby-vignette" />
        <div className="lobby-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> CAMPEÃO EM DESTAQUE <span className="eyebrow-line" /></div>
          <p className="hero-kicker">{roleLabel(sel.role)} <span>·</span> {sel.title}</p>
          <h1>{sel.name}</h1>
          <p className="hero-intro">{sel.passive.desc} Domine as rotas, reúna sua equipe e leve a batalha até o altar inimigo.</p>
          <div className="hero-tags"><span><RoleIcon size={14} /> {sel.role}</span><span><Users size={14} /> 5 contra 5</span><span><Trophy size={14} /> Arena clássica</span></div>
          <div className="lobby-actions">
            <button className="play-button" onClick={() => setPlaying(true)}><Swords size={19} /><span>JOGAR CONTRA BOTS<small>Iniciar partida 5v5</small></span><ArrowRight size={17} /></button>
            <div className="mode-button mode-static"><span>MODO DE JOGO<b>Partida local · 5v5</b></span></div>
          </div>
          <div className="lobby-status"><span className="status-dot" /> PARTIDA LOCAL <i /> 5 CONTRA 5 COM BOTS
            <button onClick={() => setHelpOpen(true)} aria-label="Ver controles"><CircleHelp size={14} /></button></div>
        </div>
        <div className="hero-caption"><span>{String(heroIndex + 1).padStart(2, "0")} / {String(HEROES.length).padStart(2, "0")}</span><i /><span>CRÔNICAS DO VÉU</span></div>
        <button className="hero-next" onClick={() => { const i = HEROES.findIndex((h) => h.id === hero); setHero(HEROES[(i + 1) % HEROES.length]!.id); }} aria-label="Próximo herói"><ArrowRight size={18} /></button>
      </section>

      <section id="hero-roster" className="roster-section">
        <div className="roster-heading"><div><p className="section-kicker">ESCOLHA SEU CAMPEÃO</p><h2>Heróis <span>da fenda</span></h2></div>
          <label className="hero-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar herói" aria-label="Buscar herói" />{query && <button onClick={() => setQuery("")} aria-label="Limpar busca"><X size={14} /></button>}</label>
          <div className="roster-count">{filteredHeroes.length.toString().padStart(2, "0")} <span>CAMPEÕES</span></div>
        </div>
        <div className="roster-grid">
          {filteredHeroes.map((h, index) => {
            return <button key={h.id} className={`roster-card ${hero === h.id ? "is-selected" : ""} hero-tone--${h.id}`} onClick={() => setHero(h.id)} aria-pressed={hero === h.id}>
              <span className="roster-card-glow" /><span className="roster-card-index">0{index + 1}</span><span className="roster-avatar"><img className="roster-portrait" src={HERO_PORTRAITS[h.id]} alt="" loading="lazy" /></span>
              <span className="roster-card-info"><b>{h.name}</b><small>{roleLabel(h.role)}</small></span><span className="roster-select"><ChevronDown size={15} /></span>
            </button>;
          })}
          {filteredHeroes.length === 0 && <p className="roster-empty">Nenhum herói encontrado para “{query}”.</p>}
        </div>
        <div className="hero-detail">
          <div className="hero-passive"><span className="detail-label">PASSIVA</span><b>{sel.passive.name}</b><p>{sel.passive.desc}</p></div>
          <div className="hero-skills"><span className="detail-label">HABILIDADES</span><div className="skill-detail-grid">{sel.abilities.map((ability) => <div className="skill-detail" key={ability.key}><span className={`skill-keycap skill-keycap--${ability.key.toLowerCase()}`}>{ability.key}</span><span><b>{ability.name}</b><small>{ability.desc}</small></span></div>)}</div></div>
        </div>
      </section>

      <footer className="lobby-footer"><span>ARCANA RIFT <i /> UMA BATALHA ENTRE MUNDOS</span><button onClick={() => setHelpOpen(true)}>CONTROLES <Keyboard size={13} /></button><button onClick={() => announce("Notas da versão")}>NOTAS DA VERSÃO <ArrowRight size={13} /></button></footer>
      {notice && <div className="lobby-toast" role="status">{notice}</div>}
      {helpOpen && <div className="lobby-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}><section className="lobby-help-modal" role="dialog" aria-modal="true" aria-labelledby="controls-title"><button className="lobby-modal-close" aria-label="Fechar controles" onClick={() => setHelpOpen(false)}><X size={18} /></button><p className="section-kicker">GUIA RÁPIDO</p><h2 id="controls-title">Como jogar</h2><p className="help-lead">Destrua o altar inimigo para vencer. Avance pela rota com seus lacaios, derrube as torres e proteja sua equipe.</p><div className="help-columns"><div><Keyboard size={18} /><b>Teclado e mouse</b><p><kbd>Botão direito</kbd> move ou seleciona um alvo. <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> ativam habilidades; clique para confirmar a mira. <kbd>P</kbd> abre o mercado, <kbd>Tab</kbd> o placar e <kbd>Esc</kbd> pausa.</p></div><div><Gamepad2 size={18} /><b>Toque</b><p>Use o direcional à esquerda para mover. Arraste uma habilidade para mirar e solte para lançar. O botão de ataque escolhe automaticamente um inimigo próximo.</p></div><div><MousePointer2 size={18} /><b>Primeiros passos</b><p>Fique perto dos aliados, recue quando sua vida estiver baixa e volte à base para comprar itens. Sua equipe vence quando destrói o altar vermelho.</p></div></div><button className="play-button help-play" onClick={() => { setHelpOpen(false); setGuided(true); setPlaying(true); }}><Swords size={18} /><span>COMEÇAR TUTORIAL<small>Dicas interativas durante a partida</small></span><ArrowRight size={16} /></button></section></div>}
    </main>
  );
}
