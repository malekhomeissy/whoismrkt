import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "whoismrkt — We do the ing." },
      { name: "description", content: "An AI-native marketing studio. Strategy, content and growth for ambitious brands — decided, designed, delivered." },
      { property: "og:title", content: "whoismrkt — We do the ing." },
      { property: "og:description", content: "An AI-native marketing studio. Strategy, content and growth at machine speed." },
    ],
  }),
  component: Landing,
});

const SERVICES = [
  { k: "01", t: "Brand Strategy", d: "Positioning, voice, narrative and visual system. The why before the post." },
  { k: "02", t: "Content Production", d: "Reels, photo, copy, carousels and campaigns. Shipped weekly, in your voice." },
  { k: "03", t: "Social Management", d: "Calendar, scheduling, community and analytics — handled end-to-end." },
  { k: "04", t: "Performance Marketing", d: "Meta, TikTok and Google paid media built around what's already converting." },
  { k: "05", t: "AI Systems", d: "Custom AI workflows that turn your brand into a 24/7 content and decision engine." },
  { k: "06", t: "Web & Identity", d: "Sites, decks and brand assets that look like the company you're becoming." },
];

const LOGOS = ["Aurum", "Helio", "Noir & Co.", "Méridien", "Studio 8", "Volta", "Maison Y"];

const PROOF = [
  ["+312%", "avg. reach lift"],
  ["4.7×", "more content shipped"],
  ["18 days", "from kickoff to launch"],
  ["100%", "in-house team"],
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative isolate min-h-[100svh] flex flex-col items-center justify-center pt-16 px-6 pb-24 overflow-hidden">

        {/* Orbital ring system */}
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">

          {/* 840×840 ring stage — flex centering keeps it at exact viewport midpoint */}
          <div className="relative flex-none" style={{ width: 840, height: 840 }}>

            {/* Ambient glow */}
            <div className="absolute rounded-full" style={{ inset: 70, background: "radial-gradient(ellipse, oklch(0.88 0 0 / 10%) 0%, transparent 62%)" }} />

            {/* Ring 4 — outermost, barely perceptible */}
            <div className="ring-spinner absolute rounded-full" style={{ inset: 0, border: "1px solid oklch(1 0 0 / 3%)", animation: "ring-spin-r 145s linear infinite" }} />

            {/* Ring 3 */}
            <div className="ring-spinner absolute rounded-full" style={{ inset: 110, border: "1px solid oklch(1 0 0 / 6%)", animation: "ring-spin 95s linear infinite" }} />

            {/* Ring 2 */}
            <div className="ring-spinner absolute rounded-full" style={{ inset: 205, border: "1px solid oklch(1 0 0 / 11%)", animation: "ring-spin-r 68s linear infinite" }}>
              <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, borderRadius: "50%", background: "oklch(0.72 0 0)", boxShadow: "0 0 8px 2px oklch(1 0 0 / 28%)" }} />
            </div>

            {/* Ring 1 — innermost, most visible */}
            <div className="ring-spinner absolute rounded-full" style={{ inset: 290, border: "1px solid oklch(1 0 0 / 20%)", animation: "ring-spin 42s linear infinite" }}>
              {/* Orbiting bright dot */}
              <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "oklch(0.96 0 0)", boxShadow: "0 0 14px 4px oklch(1 0 0 / 55%)" }} />
              {/* Cardinal ticks at 180°, 90° left, 90° right */}
              <div style={{ position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)", width: 6, height: 3, borderRadius: 2, background: "oklch(1 0 0 / 25%)" }} />
              <div style={{ position: "absolute", top: "50%", left: -3, transform: "translateY(-50%)", width: 3, height: 6, borderRadius: 2, background: "oklch(1 0 0 / 18%)" }} />
              <div style={{ position: "absolute", top: "50%", right: -3, transform: "translateY(-50%)", width: 3, height: 6, borderRadius: 2, background: "oklch(1 0 0 / 18%)" }} />
            </div>

            {/* Central luminous orb */}
            <div className="absolute rounded-full" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 8, height: 8, background: "oklch(0.95 0 0)", boxShadow: "0 0 18px 5px oklch(1 0 0 / 35%), 0 0 60px 20px oklch(1 0 0 / 10%)" }} />
          </div>

          {/* Edge fades — kept outside ring stage so they span the full section */}
          <div className="absolute bottom-0 inset-x-0 h-72 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-background/70 to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-4xl w-full text-center">

          {/* Eyebrow badge */}
          <div className="hero-animate hero-d1 mb-10 inline-flex items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm">
            <span className="h-[5px] w-[5px] rounded-full bg-white/40 animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground/60">
              AI-native marketing studio
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-animate hero-d2 font-display">
            <span className="block text-[clamp(1.25rem,3vw,2.5rem)] font-light italic text-foreground/30 leading-[1.15] mb-3 tracking-[-0.02em]">
              Strategy. Content. Growth.
            </span>
            <span className="block text-[clamp(3rem,10.5vw,9rem)] font-semibold text-chrome leading-[0.88] tracking-[-0.055em]">
              All at machine<br className="hidden sm:block" /> speed.
            </span>
          </h1>

          {/* Divider */}
          <div className="hero-animate hero-d3 mt-11 flex items-center justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>

          {/* Subheading */}
          <p className="hero-animate hero-d3 mt-7 mx-auto max-w-[32rem] text-[1.0625rem] leading-[1.8] text-muted-foreground/55 font-light">
            Your AI marketing team. Strategy, content and distribution — decided by AI, delivered by humans who care.
          </p>

          {/* CTA row */}
          <div className="hero-animate hero-d4 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/onboarding"
              className="btn-primary group inline-flex items-center gap-2.5 rounded-full px-8 h-[3.125rem] text-sm"
            >
              Start free
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              to="/work"
              className="btn-ghost inline-flex items-center gap-2.5 rounded-full px-8 h-[3.125rem] text-sm"
            >
              See the work
            </Link>
          </div>
        </div>

      </section>

      {/* PROOF STATS */}
      <section className="px-6 py-20 hairline-b">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 md:gap-0">
          {PROOF.map(([n, l]) => (
            <div key={l} className="text-center md:px-6">
              <div className="font-display text-4xl md:text-[2.75rem] text-chrome leading-none tracking-[-0.04em]">{n}</div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.28em] text-muted-foreground/50">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <section className="hairline-t hairline-b py-6 overflow-hidden">
        <div className="flex gap-16 marquee-track whitespace-nowrap font-display text-sm uppercase tracking-[0.4em] text-muted-foreground">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-16 shrink-0">
              {LOGOS.map((w) => (
                <span key={w} className="flex items-center gap-16">
                  {w} <span className="text-foreground/30">/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* STUDIO TEASER */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10">— The Studio</div>
          <h2 className="font-display text-5xl md:text-7xl font-semibold leading-[0.92] tracking-[-0.04em] max-w-5xl">
            AI is the engine.<br />
            <span className="text-muted-foreground/50">Humans are the editors.</span>
          </h2>
          <p className="mt-10 max-w-lg text-muted-foreground/60 font-light leading-[1.85] text-[1.0625rem]">
            We built whoismrkt on a simple belief: the best marketing comes from AI and human craft working together — not one replacing the other.
          </p>
          <div className="mt-10">
            <Link to="/studio" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Inside the studio <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">— Services</div>
              <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight">One studio.<br/>Six disciplines.</h2>
            </div>
            <p className="md:max-w-sm text-muted-foreground">From the first idea to the post that actually performs — handled under one roof.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 hairline rounded-2xl overflow-hidden chrome-border">
            {SERVICES.map((f) => (
              <div key={f.k} className="surface p-8 group hover:surface-2 transition relative min-h-[260px] flex flex-col">
                <div className="flex items-start justify-between">
                  <span className="font-display text-xs text-muted-foreground tracking-[0.2em]">{f.k}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
                </div>
                <h3 className="font-display text-2xl mt-12">{f.t}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/services" className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 h-12 text-sm">
              All services <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CASE TEASER */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">— Featured</div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mb-12">Recent work.</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { c: "Aurum Atelier", t: "Luxury jewelry brand launch", n: "+418% reach in 60 days" },
              { c: "Méridien", t: "Hospitality rebrand & social", n: "1.2M views, first month" },
            ].map((p) => (
              <Link to="/work" key={p.c} className="group surface chrome-border rounded-2xl p-8 min-h-[280px] flex flex-col justify-between hover:surface-2 transition">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{p.c}</div>
                <div>
                  <div className="font-display text-2xl md:text-3xl mt-8">{p.t}</div>
                  <div className="mt-4 text-chrome text-sm">{p.n}</div>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition">
                    Open case <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-5xl md:text-8xl font-semibold tracking-[-0.04em] leading-[0.9]">
            Stop guess<span className="text-muted-foreground">ing.</span><br/>
            <span className="text-chrome">Start ship<span className="text-foreground/40">ping.</span></span>
          </h2>
          <p className="mt-8 text-muted-foreground max-w-xl mx-auto">Your AI marketing strategist is one click away. Plan, write and schedule content in minutes.</p>
          <Link to="/onboarding" className="btn-primary mt-12 inline-flex items-center gap-2 rounded-full px-8 h-14 text-base">
            Start with MRKT — free <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
