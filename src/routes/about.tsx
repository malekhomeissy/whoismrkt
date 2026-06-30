import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight, Sparkles, Users, Zap, PenLine, Globe2, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About MRKT — Why we built the creator collaboration OS for MENA" },
      { name: "description", content: "MRKT is the creator collaboration operating system for MENA. Built because the infrastructure for creator partnerships in the Arab world didn't exist — so we built it." },
      { property: "og:title", content: "About MRKT" },
      { property: "og:description", content: "Why we built MRKT — the creator collaboration OS for MENA." },
    ],
  }),
  component: About,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const EYEBROW = "text-[9.5px] uppercase tracking-[0.35em] font-semibold";
const eyebrowStyle = { color: "oklch(1 0 0 / 28%)" };
const bodyStyle    = { color: "oklch(1 0 0 / 46%)" };
const cardStyle    = { background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" };

// ─── Values ───────────────────────────────────────────────────────────────────
const VALUES = [
  {
    icon: Sparkles,
    title: "AI as a multiplier",
    desc: "We use AI where it genuinely improves outcomes — faster strategy, smarter matching, better content. Not as a brand promise. As the actual product.",
  },
  {
    icon: PenLine,
    title: "Built for daily use",
    desc: "Every feature is designed to be opened, used, and trusted every day. If it isn't something creators and businesses reach for naturally, we rebuild it.",
  },
  {
    icon: Users,
    title: "Creators are professionals",
    desc: "Creators run real businesses. We build tools that reflect that — not consumer apps, but a serious workspace worthy of serious work.",
  },
  {
    icon: Globe2,
    title: "MENA first, not MENA after",
    desc: "Arabic RTL, Ramadan intelligence, regional market data, and Gulf pricing context are not localization add-ons. They are the foundation.",
  },
  {
    icon: Zap,
    title: "Craft over complexity",
    desc: "The best product is the one people actually use. We take design, detail, and copy seriously — because the experience is the product.",
  },
  {
    icon: Heart,
    title: "Building in public",
    desc: "We're in beta. We tell creators and businesses what's live, what's coming, and why. No vaporware. No overpromising. Just honest progress.",
  },
];

// ─── Why MENA facts ───────────────────────────────────────────────────────────
const WHY_MENA = [
  {
    title: "The tools didn't exist",
    desc: "Creator collaboration tools were built for the US and Western Europe. MENA creators and brands were using workarounds — WhatsApp, Excel, PDF decks — to run campaigns that deserved real infrastructure.",
  },
  {
    title: "The market is massive",
    desc: "UAE, Saudi Arabia, Lebanon, Qatar, Kuwait, Bahrain, Jordan, Egypt — hundreds of millions of social media users, one of the world's fastest-growing creator economies, and almost no dedicated tooling.",
  },
  {
    title: "Arabic needs to be native",
    desc: "RTL layout, Arabic language support, and regional cultural intelligence aren't features you can bolt on. They need to be designed in from day one — or they feel broken forever.",
  },
  {
    title: "We know this market",
    desc: "MRKT was built by people from this region, for this region. We understand Ramadan campaign timing, GCC brand relationships, Levant creator culture, and what MENA consumers actually respond to.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function About() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative px-6 pt-40 pb-24 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -8%, oklch(0.16 0 0) 0%, oklch(0 0 0) 60%)" }}
        />
        <div className="mx-auto max-w-5xl">
          <div className={`${EYEBROW} text-[9px] mb-8`} style={eyebrowStyle}>About MRKT</div>
          <h1 className="font-display text-[clamp(3rem,7vw,6.5rem)] font-bold tracking-[-0.048em] leading-[0.94]">
            Built here.
            <br />
            <span style={{ color: "oklch(1 0 0 / 32%)" }}>For here.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-[1.125rem] leading-[1.85] font-light" style={bodyStyle}>
            MRKT is the creator collaboration operating system for MENA. One platform where creators
            and businesses discover opportunities, manage campaigns, plan content, use AI strategically,
            and grow — from first brief to final delivery.
          </p>
        </div>
      </section>

      {/* ══ FOUNDER STORY ════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-16 items-start">
          <div>
            <div className={EYEBROW} style={eyebrowStyle}>Why we built this</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              A real problem deserved
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>a real solution.</span>
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
              We watched talented creators in Dubai, Beirut, and Cairo manage brand deals through
              WhatsApp voice notes and Google Sheets. We watched brands in Riyadh and Kuwait spend
              weeks searching for the right creator — then lose the deal to miscommunication in
              an email thread.
            </p>
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
              The infrastructure for creator collaboration in MENA didn't exist. Not really.
              There were global platforms that didn't understand the region, and fragmented tools
              that only solved one piece of the problem. We built MRKT to fill that gap.
            </p>
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
              Not a marketplace. Not an agency tool. An operating system — where everything
              from first brief to final delivery lives in one place, connected, intelligent, and
              built specifically for the Arab world.
            </p>
            <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
              We're in beta. We're building in public. And we're obsessed with getting this right.
            </p>
          </div>
        </div>
      </section>

      {/* ══ WHY MENA ═════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>Why MENA</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              Not localized.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Native.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light max-w-2xl" style={bodyStyle}>
              Every decision we make — from the RTL interface to the Ramadan calendar to the
              Gulf-specific creator categories — is made with MENA creators and brands as the
              primary audience. Not an afterthought. The foundation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {WHY_MENA.map((item) => (
              <div key={item.title} className="rounded-2xl p-7" style={cardStyle}>
                <h3 className="font-display text-[1.125rem] font-semibold tracking-tight mb-3" style={{ color: "oklch(1 0 0 / 84%)" }}>
                  {item.title}
                </h3>
                <p className="text-[0.9375rem] leading-[1.78] font-light" style={bodyStyle}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* MENA markets */}
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { name: "UAE",          flag: "🇦🇪" },
              { name: "Saudi Arabia", flag: "🇸🇦" },
              { name: "Lebanon",      flag: "🇱🇧" },
              { name: "Qatar",        flag: "🇶🇦" },
              { name: "Kuwait",       flag: "🇰🇼" },
              { name: "Bahrain",      flag: "🇧🇭" },
              { name: "Jordan",       flag: "🇯🇴" },
              { name: "Egypt",        flag: "🇪🇬" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-2 rounded-full px-3 py-1.5" style={cardStyle}>
                <span className="text-base">{m.flag}</span>
                <span className="text-[12px] font-medium" style={{ color: "oklch(1 0 0 / 58%)" }}>{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW WE BUILD ═════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>What we believe</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              How we build.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl p-7" style={cardStyle}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-5" style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                  <Icon className="h-5 w-5" style={{ color: "oklch(1 0 0 / 52%)" }} />
                </div>
                <h3 className="font-display text-[1.125rem] font-semibold tracking-tight mb-3" style={{ color: "oklch(1 0 0 / 84%)" }}>
                  {title}
                </h3>
                <p className="text-[0.9375rem] leading-[1.78] font-light" style={bodyStyle}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ THE PLATFORM ═════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>The platform</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              One OS.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Two workspaces.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                role: "Creators",
                desc: "A professional workspace for creators running a real business — opportunities, AI strategy, content calendar, growth analytics, and the Globe.",
                features: ["AI-matched opportunities", "AI Strategist", "Content Calendar", "Growth Hub", "MRKT Globe", "Creator profile"],
                cta: "For Creators", to: "/for-creators",
                color: "oklch(0.62 0.12 158)",
              },
              {
                role: "Businesses",
                desc: "A campaign management OS for brands — brief with AI, find creators, manage the pipeline, track deliverables, and measure results.",
                features: ["AI campaign briefs", "Creator Discovery", "Pipeline management", "Deliverable tracking", "Campaign analytics", "MRKT Globe"],
                cta: "For Businesses", to: "/for-businesses",
                color: "oklch(0.72 0.10 224)",
              },
            ].map((p) => (
              <div key={p.role} className="rounded-2xl p-7" style={cardStyle}>
                <div className="text-[10px] uppercase tracking-[0.28em] mb-4 font-semibold" style={{ color: p.color }}>{p.role}</div>
                <p className="text-[0.9375rem] leading-[1.78] font-light mb-6" style={bodyStyle}>{p.desc}</p>
                <ul className="space-y-1.5 mb-7">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12.5px]" style={{ color: "oklch(1 0 0 / 40%)" }}>
                      <span className="h-[3.5px] w-[3.5px] rounded-full shrink-0" style={{ background: p.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.to as "/for-creators" | "/for-businesses"}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
                  style={{ color: "oklch(1 0 0 / 40%)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 70%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 40%)"; }}
                >
                  {p.cta} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-bold tracking-[-0.048em] leading-[0.96]">
            The infrastructure
            <br />
            <span style={{ color: "oklch(1 0 0 / 32%)" }}>MENA deserves.</span>
          </h2>
          <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-sm mx-auto" style={bodyStyle}>
            Sign up in seconds. Choose your workspace. Start building.
            Free during beta.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-medium"
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
