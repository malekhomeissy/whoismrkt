import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight, Sparkles, Users, Zap, PenLine } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About MRKT — AI-powered marketing for creators and brands" },
      { name: "description", content: "MRKT is an AI-powered platform for creators and businesses. We build tools that make marketing strategy, content, and brand partnerships faster and more accessible." },
      { property: "og:title", content: "About MRKT" },
      { property: "og:description", content: "The story behind MRKT — AI marketing tools for creators and brands." },
    ],
  }),
  component: About,
});

const VALUES = [
  {
    icon: Sparkles,
    title: "AI as a multiplier",
    desc: "We use AI where it genuinely makes the work better — faster strategy, smarter matching, better content. Not as a buzzword, but as the actual engine.",
  },
  {
    icon: PenLine,
    title: "Built for daily use",
    desc: "Every feature is designed to be opened, used, and trusted every single day. If it's not something you'd reach for naturally, we rebuild it.",
  },
  {
    icon: Users,
    title: "Creator respect",
    desc: "Creators are professionals running real businesses. We build tools that reflect that — not consumer apps, but a serious workspace.",
  },
  {
    icon: Zap,
    title: "Craft over complexity",
    desc: "The best product is the one people actually use. We take design, copy, and detail seriously because the experience is the product.",
  },
];

function About() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-40 pb-24 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -8%, oklch(0.17 0 0) 0%, oklch(0.04 0 0) 60%)",
          }}
        />
        <div className="mx-auto max-w-5xl">
          <div
            className="text-[9.5px] uppercase tracking-[0.35em] mb-8 font-medium"
            style={{ color: "oklch(1 0 0 / 28%)" }}
          >
            — About MRKT
          </div>
          <h1 className="font-display text-[clamp(3rem,7vw,6rem)] font-bold tracking-[-0.045em] leading-[0.96]">
            Built for the future<br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>of marketing.</span>
          </h1>
          <p
            className="mt-10 max-w-2xl text-[1.125rem] leading-[1.85] font-light"
            style={{ color: "oklch(1 0 0 / 48%)" }}
          >
            MRKT is an AI-powered platform for creators and businesses. We build tools
            that make marketing strategy, content creation, and brand partnerships faster,
            smarter, and more accessible — for the people doing the real work.
          </p>
        </div>
      </section>

      {/* ── STORY ───────────────────────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-16 items-start">
          <div>
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              The story
            </div>
            <h2 className="font-display text-4xl md:text-[3rem] font-bold tracking-[-0.04em] leading-[1.07]">
              Why we built this.
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={{ color: "oklch(1 0 0 / 50%)" }}>
              Marketing tools for creators were fragmented, generic, and far too complex for one person to run.
              Brand discovery required cold emails, spreadsheets, and luck. Strategy lived in the heads of expensive
              consultants or in chat threads that went nowhere.
            </p>
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={{ color: "oklch(1 0 0 / 50%)" }}>
              We set out to fix that. MRKT is a workspace where creators can build their brand, find partnerships,
              and create better content — and where businesses can plan campaigns, discover creators, and grow —
              all with AI working alongside them at every step.
            </p>
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={{ color: "oklch(1 0 0 / 50%)" }}>
              We believe the best marketing comes from clarity. Clear strategy, clear creative, and clear
              communication between the people doing the work. That's what MRKT is designed to create.
            </p>
          </div>
        </div>
      </section>

      {/* ── VALUES ──────────────────────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              What we believe
            </div>
            <h2 className="font-display text-4xl md:text-[3rem] font-bold tracking-[-0.04em] leading-[1.07]">
              How we build.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-7"
                style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 9%)" }}
                >
                  <Icon className="h-4.5 w-4.5 h-5 w-5" style={{ color: "oklch(1 0 0 / 52%)" }} />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight mb-3" style={{ color: "oklch(1 0 0 / 84%)" }}>
                  {title}
                </h3>
                <p className="text-[0.9375rem] leading-relaxed font-light" style={{ color: "oklch(1 0 0 / 44%)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT PILLARS ─────────────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              The platform
            </div>
            <h2 className="font-display text-4xl md:text-[3rem] font-bold tracking-[-0.04em] leading-[1.07]">
              Two workspaces.<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>Infinite possibilities.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                role: "Creators",
                desc: "An AI-powered workspace for content creators and influencers. Generate strategies, plan content, and connect with brands through MRKT Connect.",
                features: ["AI content strategy", "Brand partnerships", "Content calendar", "MRKT Connect profile"],
                cta: "For Creators",
                to: "/for-creators",
              },
              {
                role: "Businesses",
                desc: "A marketing command center for brands. Build campaigns with AI, discover creators, and manage influencer partnerships end-to-end.",
                features: ["AI campaign planning", "Creator discovery", "Campaign management", "Marketing strategy"],
                cta: "For Businesses",
                to: "/for-businesses",
              },
            ].map((p) => (
              <div
                key={p.role}
                className="rounded-2xl p-7"
                style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
              >
                <div className="text-[10px] uppercase tracking-[0.28em] mb-4 font-medium" style={{ color: "oklch(1 0 0 / 28%)" }}>
                  {p.role}
                </div>
                <p className="text-[0.9375rem] leading-relaxed font-light mb-6" style={{ color: "oklch(1 0 0 / 44%)" }}>
                  {p.desc}
                </p>
                <ul className="space-y-1.5 mb-7">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[0.8125rem]" style={{ color: "oklch(1 0 0 / 40%)" }}>
                      <span className="h-[3px] w-[3px] rounded-full flex-none" style={{ background: "oklch(1 0 0 / 28%)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.to as "/for-creators" | "/for-businesses"}
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium transition-colors duration-150"
                  style={{ color: "oklch(1 0 0 / 42%)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 72%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 42%)"; }}
                >
                  {p.cta} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="px-6 py-40 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] font-bold tracking-[-0.045em] leading-[1.04]">
            Ready to get started?
          </h2>
          <p
            className="mt-6 font-light max-w-sm mx-auto leading-relaxed"
            style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
          >
            Sign up in seconds. Choose your workspace. Start building.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
            >
              Get started free <ArrowUpRight className="h-5 w-5" />
            </Link>
            <Link
              to="/contact"
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 h-14 text-sm"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
