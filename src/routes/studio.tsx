import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — whoismrkt" },
      { name: "description", content: "How whoismrkt operates. The AI-native studio built for ambitious brands — strategy, content and growth at machine speed." },
      { property: "og:title", content: "Studio — whoismrkt" },
    ],
  }),
  component: StudioPage,
});

const PRINCIPLES = [
  {
    n: "01",
    h: "AI is the engine. Humans are the editors.",
    b: "We don't automate marketing — we amplify it. Every strategy, post and decision is powered by AI and finished by people who understand craft.",
  },
  {
    n: "02",
    h: "Speed without sacrifice.",
    b: "Machine speed for the thinking, human judgment for the finishing. We ship weekly, iterate constantly, and never confuse volume for quality.",
  },
  {
    n: "03",
    h: "Built for the post-agency era.",
    b: "Agencies move in months. In-house teams are constrained. We fill the gap — an AI-native studio that operates like your most senior marketer, 24/7.",
  },
  {
    n: "04",
    h: "Obsessed with what actually works.",
    b: "No brand guidelines for the sake of it. We test, measure, and optimize. Growth that compounds — not vanity metrics that don't move the business.",
  },
];

const CAPABILITIES = [
  "Brand Strategy", "Content Production", "Social Management",
  "Performance Marketing", "AI Systems", "Web & Identity",
];

function StudioPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* HEADER */}
      <section className="px-6 pt-40 pb-28 hairline-b">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10">— Studio</div>
          <div className="grid md:grid-cols-[1fr_1fr] gap-16 items-end">
            <h1 className="font-display text-5xl md:text-[5.5rem] font-semibold leading-[0.9] tracking-[-0.04em]">
              The AI studio<br />behind the work.
            </h1>
            <div>
              <p className="text-muted-foreground leading-[1.85] text-[1.0625rem] max-w-sm font-light">
                whoismrkt is an AI-native marketing studio. We handle strategy, content and growth for ambitious brands — built on the belief that AI and human craft, together, produce something neither can do alone.
              </p>
              <Link
                to="/connect"
                className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                Work with us <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-14">— How we work</div>
          <div className="grid md:grid-cols-2 gap-px bg-white/[0.04] rounded-2xl overflow-hidden chrome-border">
            {PRINCIPLES.map((p) => (
              <div key={p.n} className="surface p-9 min-h-[240px] flex flex-col justify-between hover:surface-2 transition-colors duration-200">
                <span className="font-display text-xs text-muted-foreground/50 tracking-[0.22em]">{p.n}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold leading-snug mt-8 mb-3 tracking-[-0.025em]">{p.h}</h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">{p.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-[1fr_1fr] gap-16 items-start">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-10">— Capabilities</div>
              <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[0.92]">
                One studio.<br />
                <span className="text-chrome">Six disciplines.</span>
              </h2>
              <p className="mt-8 text-muted-foreground max-w-sm leading-relaxed">
                From the first brief to the post that performs — handled under one roof, powered by AI.
              </p>
              <Link
                to="/services"
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 hover:border-white/35 px-6 h-11 text-sm font-medium transition-colors"
              >
                All services <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 md:pt-14">
              {CAPABILITIES.map((c, i) => (
                <div key={c} className={`surface chrome-border rounded-xl px-5 py-4 ${i === CAPABILITIES.length - 1 ? "col-span-2" : ""}`}>
                  <div className="font-display text-xs text-muted-foreground/40 tracking-[0.2em] mb-2">0{i + 1}</div>
                  <div className="text-sm font-medium">{c}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[0.92]">
            Ready to move at<br />
            <span className="text-chrome">machine speed?</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-md mx-auto">
            Your AI marketing strategist is one click away. Strategy, content, growth — decided by AI.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm"
          >
            Start with MRKT — free <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
