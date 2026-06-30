import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, TrendingUp, CalendarDays,
  Users, Megaphone, Zap, BarChart3, Shield, Brain,
} from "lucide-react";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "MRKT AI — Not a chatbot. A strategist." },
      { name: "description", content: "MRKT AI understands your profile, your market, your campaigns, and your goals. Strategy, not generic advice. Outcomes, not outputs." },
      { property: "og:title", content: "MRKT AI — Intelligent by design." },
      { property: "og:description", content: "MRKT AI gives you a specific plan for your specific situation — not generic content from a generic model." },
    ],
  }),
  component: AIPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const EYEBROW = "text-[9.5px] uppercase tracking-[0.35em] font-semibold";
const eyebrowStyle = { color: "oklch(1 0 0 / 28%)" };
const bodyStyle    = { color: "oklch(1 0 0 / 46%)" };
const blueStyle    = { color: "oklch(0.72 0.10 224)" };
const cardStyle    = { background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" };
const blueCardStyle = { background: "oklch(0.72 0.10 224 / 6%)", border: "1px solid oklch(0.72 0.10 224 / 16%)" };

// ─── AI chat demo ─────────────────────────────────────────────────────────────
function AIChatDemo() {
  const messages = [
    {
      role: "user",
      text: "I'm a UAE-based fashion creator with 148K followers. How do I increase my visibility score?",
    },
    {
      role: "ai",
      blocks: [
        { label: "Profile gap",   text: "Your TikTok engagement rate isn't connected yet. Adding it would unlock 18 more matched campaigns — UAE fashion brands actively filtering for this." },
        { label: "Timing",       text: "You're posting Mon–Thu. UAE fashion audiences peak Sat–Sun 8–10 PM. Shifting 2 posts per week could increase reach by 30–40%." },
        { label: "Niche signal", text: "Add 'modest fashion' and 'Ramadan styling' to your profile tags — these are the top search terms from UAE brands right now." },
        { label: "Action",       text: "3 changes. Estimated visibility score improvement: +14 points over 2 weeks." },
      ],
    },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)", boxShadow: "0 32px 80px -20px oklch(0 0 0 / 55%)" }}
    >
      {/* Topbar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <Sparkles className="h-3.5 w-3.5" style={blueStyle} />
        <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>MRKT AI</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="h-[5px] w-[5px] rounded-full animate-pulse" style={{ background: "oklch(0.62 0.12 158)" }} />
          <span className="text-[9px]" style={{ color: "oklch(1 0 0 / 32%)" }}>Context-aware</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User message */}
        <div className="flex justify-end">
          <div
            className="max-w-[82%] rounded-[14px] rounded-br-[4px] px-4 py-3 text-[12px] leading-[1.65]"
            style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 72%)" }}
          >
            {messages[0].text}
          </div>
        </div>

        {/* AI response blocks */}
        <div className="space-y-2">
          {messages[1].blocks!.map((block) => (
            <div key={block.label} className="rounded-xl px-4 py-3 text-[12px] leading-[1.65]" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <span className="text-[8.5px] uppercase tracking-[0.22em] font-semibold block mb-1" style={blueStyle}>{block.label}</span>
              <span style={{ color: "oklch(1 0 0 / 65%)" }}>{block.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Capabilities ─────────────────────────────────────────────────────────────
const CAPABILITIES = [
  {
    icon: Megaphone,
    label: "Campaign strategy",
    desc: "Full campaign briefs with objectives, channel plans, timeline, and creator recommendations — in 30 seconds.",
    role: "both",
  },
  {
    icon: TrendingUp,
    label: "Growth recommendations",
    desc: "Visibility scores, profile diagnostics, and specific actions to improve your match readiness.",
    role: "creator",
  },
  {
    icon: Zap,
    label: "Opportunity analysis",
    desc: "Match score explanations, application drafts, and campaign fit breakdowns before you apply.",
    role: "creator",
  },
  {
    icon: Users,
    label: "Creator recommendations",
    desc: "AI-ranked creator suggestions based on niche, audience quality, engagement, and campaign history.",
    role: "business",
  },
  {
    icon: CalendarDays,
    label: "Calendar intelligence",
    desc: "Optimal posting times by region, MENA event hooks, trend-aligned scheduling across platforms.",
    role: "both",
  },
  {
    icon: BarChart3,
    label: "Performance analysis",
    desc: "Campaign ROI breakdowns, what's working, and AI-suggested optimizations for your next campaign.",
    role: "business",
  },
];

// ─── Philosophy principles ────────────────────────────────────────────────────
const PHILOSOPHY = [
  {
    title: "Context-aware, not generic",
    desc: "MRKT AI knows your profile, your campaigns, your market, and your history. It gives you a specific recommendation for your specific situation — not the same answer it gives everyone.",
  },
  {
    title: "Outcomes, not outputs",
    desc: "MRKT AI doesn't just generate content. It tells you what to do, why, and what result to expect. Strategy-first, content second.",
  },
  {
    title: "MENA-native intelligence",
    desc: "Built with regional knowledge: Ramadan campaign timing, Gulf audience behavior, Arabic content patterns, and MENA platform preferences — baked into every recommendation.",
  },
  {
    title: "Not a product name. A capability.",
    desc: "MRKT AI is the intelligence layer across the entire platform — in your calendar, your pipeline, your growth hub, your outreach. Everywhere it matters, it's there.",
  },
];

// ─── How it fits in the OS ────────────────────────────────────────────────────
const OS_INTEGRATIONS = [
  { label: "AI in Opportunities",   sub: "Match scores, fit explanations, application drafts" },
  { label: "AI in Pipeline",         sub: "Stage recommendations, outreach message generation" },
  { label: "AI in Calendar",         sub: "Optimal timing, trend hooks, MENA event awareness"  },
  { label: "AI in Growth Hub",       sub: "Visibility score, profile diagnostics, action plan"  },
  { label: "AI in Find Creators",    sub: "Match scoring, niche ranking, audience analysis"     },
  { label: "AI in Studio",           sub: "Brief generation, hook writing, creative concepts"   },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function AIPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% -6%, oklch(0.12 0 0) 0%, oklch(0 0 0) 60%)" }}
        />

        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-9"
                style={{ background: "oklch(0.72 0.10 224 / 8%)", border: "1px solid oklch(0.72 0.10 224 / 20%)" }}
              >
                <Sparkles className="h-3 w-3" style={blueStyle} />
                <span className={`${EYEBROW} text-[9px]`} style={blueStyle}>MRKT AI</span>
              </div>

              <h1 className="font-display text-[clamp(2.75rem,6vw,5.25rem)] font-bold tracking-[-0.048em] leading-[0.96]">
                Not a chatbot.
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>A strategist.</span>
              </h1>

              <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-md" style={bodyStyle}>
                MRKT AI understands your profile, your market, your campaigns, and your goals.
                It doesn't give you generic advice — it gives you a specific plan for your
                specific situation.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
                >
                  {user ? "Open AI Strategist" : "Try MRKT AI — free"} <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                {["Context-aware", "MENA-native", "Outcome-focused"].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Shield className="h-3 w-3" style={{ color: "oklch(0.72 0.10 224 / 60%)" }} />
                    <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 32%)" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <AIChatDemo />
          </div>
        </div>
      </section>

      {/* ══ PHILOSOPHY ═══════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Philosophy</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Intelligence that
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>knows the context.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                Every AI product says it's intelligent. The difference is what it's intelligent
                about. MRKT AI is intelligent about <em style={{ color: "oklch(1 0 0 / 60%)", fontStyle: "normal" }}>you</em> — your niche,
                your audience, your region, your campaign history. Not the world in general.
              </p>
            </div>
            <div className="space-y-3">
              {PHILOSOPHY.map((p) => (
                <div key={p.title} className="rounded-2xl p-6" style={blueCardStyle}>
                  <div className="text-[13.5px] font-semibold mb-2" style={{ color: "oklch(1 0 0 / 82%)" }}>{p.title}</div>
                  <p className="text-[12.5px] leading-relaxed" style={bodyStyle}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CAPABILITIES ═════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>Capabilities</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              What MRKT AI does.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAPABILITIES.map(({ icon: Icon, label, desc, role }) => (
              <div key={label} className="rounded-2xl p-6" style={cardStyle}>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.72 0.10 224 / 10%)", border: "1px solid oklch(0.72 0.10 224 / 16%)" }}>
                    <Icon className="h-4 w-4" style={blueStyle} />
                  </div>
                  <span
                    className="text-[8.5px] font-semibold uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5"
                    style={{
                      color: role === "creator" ? "oklch(0.62 0.12 158)" : role === "business" ? "oklch(0.72 0.10 224)" : "oklch(1 0 0 / 36%)",
                      background: role === "creator" ? "oklch(0.62 0.12 158 / 12%)" : role === "business" ? "oklch(0.72 0.10 224 / 12%)" : "oklch(1 0 0 / 6%)",
                    }}
                  >
                    {role === "both" ? "All roles" : role === "creator" ? "Creator" : "Business"}
                  </span>
                </div>
                <div className="text-[13px] font-semibold mb-1.5" style={{ color: "oklch(1 0 0 / 82%)" }}>{label}</div>
                <p className="text-[12px] leading-relaxed" style={bodyStyle}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ INSIDE THE OS ════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Embedded intelligence</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                AI everywhere
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>it matters.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                MRKT AI isn't a chat window you open occasionally. It's the intelligence layer
                running across the entire operating system — in your pipeline, your calendar,
                your growth hub, your creator discovery, your studio. Always on. Always in context.
              </p>
            </div>

            <div className="space-y-2">
              {OS_INTEGRATIONS.map((item) => (
                <div key={item.label} className="flex items-start gap-4 rounded-xl p-4" style={cardStyle}>
                  <div className="h-[7px] w-[7px] rounded-full shrink-0 mt-1.5" style={{ background: "oklch(0.72 0.10 224 / 60%)" }} />
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "oklch(1 0 0 / 80%)" }}>{item.label}</div>
                    <div className="text-[11.5px] mt-0.5" style={bodyStyle}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ WHAT MRKT AI IS NOT ══════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.06 0 0)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className={EYEBROW} style={eyebrowStyle}>Transparency</div>
                <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                  What MRKT AI
                  <br />
                  <span style={{ color: "oklch(1 0 0 / 32%)" }}>is not.</span>
                </h2>
                <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                  We're honest about what we've built. MRKT AI is real and it works — but
                  we'd rather tell you what it is than what it isn't.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { not: "Not a general-purpose chatbot",       is: "A specialist that knows your MRKT profile and campaign history" },
                  { not: "Not autonomous",                       is: "Actions require your approval — MRKT AI recommends, you decide" },
                  { not: "Not a third-party AI product",        is: "MRKT AI is our intelligence layer — built for creator collaboration" },
                  { not: "Not a one-size answer",               is: "Every output is personalized to your niche, market, and goals" },
                ].map((item) => (
                  <div key={item.not} className="rounded-xl p-4" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                    <div className="text-[11.5px] font-semibold mb-1" style={{ color: "oklch(0.52 0.15 24 / 80%)" }}>{item.not}</div>
                    <div className="text-[11.5px]" style={bodyStyle}>{item.is}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={blueCardStyle}
          >
            <Brain className="h-3 w-3" style={blueStyle} />
            <span className={`${EYEBROW} text-[9px]`} style={blueStyle}>Context-aware intelligence</span>
          </div>
          <h2 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-bold tracking-[-0.048em] leading-[0.96]">
            Strategy.
            <br />
            <span style={{ color: "oklch(1 0 0 / 32%)" }}>Not just answers.</span>
          </h2>
          <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-sm mx-auto" style={bodyStyle}>
            Try MRKT AI during beta. Free, no credit card required. See what it knows
            about your market, your niche, and your specific growth opportunities.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-9 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-medium"
          >
            {user ? "Open AI Strategist" : "Try MRKT AI — free"} <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
