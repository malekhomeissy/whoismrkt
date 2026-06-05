import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, CalendarDays,
  Users, BarChart3, TrendingUp, Zap,
  Target, Search, Megaphone, LineChart,
} from "lucide-react";

export const Route = createFileRoute("/for-businesses")({
  head: () => ({
    meta: [
      { title: "MRKT for Businesses — AI marketing for ambitious brands" },
      { name: "description", content: "Plan campaigns, discover creators, and grow your business with AI. The marketing operating system for restaurants, fashion brands, gyms, and startups." },
      { property: "og:title", content: "MRKT for Businesses — AI marketing for ambitious brands" },
      { property: "og:description", content: "AI-powered marketing strategy, content planning, and creator partnerships — all in one workspace." },
    ],
  }),
  component: ForBusinessesPage,
});

// ─────────────────────────────────────────────────────────────
// Hero mockup — business dashboard
// ─────────────────────────────────────────────────────────────
function BusinessDashboardCard() {
  const campaigns = [
    { name: "Summer Launch", status: "Live",  creators: 8,  reach: "1.4M", bg: "oklch(0.72 0.14 152)" },
    { name: "Brand Awareness", status: "Draft", creators: 0, reach: "—",    bg: "oklch(1 0 0 / 28%)"   },
    { name: "Product Drop",   status: "Live",  creators: 5,  reach: "820K", bg: "oklch(0.72 0.14 152)" },
  ];

  return (
    <div
      className="w-full max-w-sm mx-auto mt-12 rounded-2xl overflow-hidden"
      style={{
        background: "oklch(0.09 0 0)",
        border: "1px solid oklch(1 0 0 / 10%)",
        boxShadow: "0 24px 64px -16px oklch(0 0 0 / 50%)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: "oklch(0.075 0 0)", borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(1 0 0 / 30%)" }}>
          Campaigns
        </span>
        <span
          className="text-[9.5px] rounded-full px-2 py-0.5 font-medium"
          style={{ background: "oklch(0.72 0.14 152 / 12%)", color: "oklch(0.72 0.14 152)" }}
        >
          2 live
        </span>
      </div>

      {/* Campaign list */}
      <div className="p-4 space-y-2.5">
        {campaigns.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between p-3.5 rounded-xl"
            style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div>
              <div className="font-medium text-[12.5px]" style={{ color: "oklch(1 0 0 / 82%)" }}>{c.name}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "oklch(1 0 0 / 34%)" }}>
                {c.creators > 0 ? `${c.creators} creators · ${c.reach} reach` : "Set up campaign"}
              </div>
            </div>
            <span
              className="text-[9px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5 font-medium"
              style={{
                color: c.bg,
                background: `${c.bg.replace(")", " / 12%)")}`,
              }}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>

      {/* AI insight */}
      <div
        className="mx-4 mb-4 p-3.5 rounded-xl flex items-start gap-3"
        style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "oklch(0.68 0.005 250)" }} />
        <div>
          <div className="text-[11px] font-medium mb-0.5" style={{ color: "oklch(1 0 0 / 75%)" }}>
            AI Strategist
          </div>
          <div className="text-[10px] leading-relaxed" style={{ color: "oklch(1 0 0 / 38%)" }}>
            Fitness niche creators are showing 34% higher engagement this week. Consider adding 2 more for your Summer Launch.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AI strategy mockup
// ─────────────────────────────────────────────────────────────
function AIStrategyMockup() {
  const outputs = [
    { type: "Strategy",   text: "Lead with a 3-day teaser series across Instagram Stories, then drop the full campaign on Tuesday at 9AM when your audience is most active." },
    { type: "Hook",       text: "We've served 10,000 lunches in 6 months. Here's what our regulars always order first." },
    { type: "Content",    text: "Behind-the-scenes kitchen prep → menu reveal → customer reactions. 3 Reels, 5 Stories, 1 YouTube Short." },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.09 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: "oklch(0.075 0 0)", borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.72 0.005 250)" }} />
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.28em]" style={{ color: "oklch(1 0 0 / 28%)" }}>
          AI Strategist
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-end">
          <div
            className="max-w-[85%] rounded-[14px] rounded-br-[4px] px-4 py-3 text-[0.8rem] leading-relaxed"
            style={{ background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 74%)" }}
          >
            Plan a campaign launch for my restaurant's new summer menu.
          </div>
        </div>
        <div className="space-y-2">
          {outputs.map((o, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 text-[0.8rem] leading-[1.65]"
              style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}
            >
              <span
                className="text-[8.5px] uppercase tracking-[0.24em] font-medium block mb-1"
                style={{ color: "oklch(1 0 0 / 26%)" }}
              >
                {o.type}
              </span>
              <span style={{ color: "oklch(1 0 0 / 66%)" }}>{o.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Creator discovery mockup
// ─────────────────────────────────────────────────────────────
function CreatorDiscoveryMockup() {
  const creators = [
    { initial: "A", name: "Alessia Moreau",  niche: "Food & lifestyle",  followers: "312K", score: 96, bg: "oklch(0.72 0.09 20)"  },
    { initial: "K", name: "Kenji Watari",    niche: "Local discovery",   followers: "158K", score: 91, bg: "oklch(0.62 0.08 250)" },
    { initial: "N", name: "Noa Lindqvist",   niche: "Dining & travel",   followers: "840K", score: 87, bg: "oklch(0.38 0.07 196)" },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.09 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: "oklch(0.075 0 0)", borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <div className="flex items-center gap-2">
          <Search className="h-3 w-3" style={{ color: "oklch(1 0 0 / 35%)" }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(1 0 0 / 30%)" }}>
            Creator Discovery
          </span>
        </div>
        <span
          className="text-[9.5px] rounded-full px-2 py-0.5 font-medium"
          style={{ background: "oklch(0.72 0.14 152 / 12%)", color: "oklch(0.72 0.14 152)" }}
        >
          AI matched
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        {creators.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div
              className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
              style={{ background: c.bg, color: "oklch(0.1 0 0)" }}
            >
              {c.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium" style={{ color: "oklch(1 0 0 / 82%)" }}>{c.name}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 35%)" }}>
                {c.niche} · {c.followers}
              </div>
            </div>
            <div
              className="shrink-0 text-[10.5px] font-semibold rounded-full px-2.5 py-0.5"
              style={{ color: "oklch(0.72 0.14 152)", background: "oklch(0.72 0.14 152 / 12%)" }}
            >
              {c.score}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { name: "Restaurants",      desc: "Launch menu reveals, events, and seasonal campaigns with creators your customers already follow." },
  { name: "Fashion brands",   desc: "Run editorial drops and product launches with the right fashion creators — matched by aesthetic, not just follower count." },
  { name: "Gyms & fitness",   desc: "Drive sign-ups and class bookings through health creators with audiences that match your location and offer." },
  { name: "Startups",         desc: "Reach early adopters fast through targeted creator campaigns across TikTok and Instagram." },
  { name: "E-commerce brands", desc: "Scale product seeding, reviews, and UGC content with a managed creator network." },
];

const FEATURES = [
  { Icon: Sparkles,    title: "AI Strategist",          desc: "Ask MRKT to build a full marketing plan, write campaign briefs, generate content ideas, and recommend channels. Briefed in seconds." },
  { Icon: CalendarDays, title: "Content Calendar",      desc: "Plan and schedule your content across owned and creator channels. See the full month in one organized view." },
  { Icon: Search,      title: "Creator Discovery",      desc: "Find creators by niche, location, follower range, engagement rate, and audience fit. Ranked by predicted campaign performance." },
  { Icon: Target,      title: "Campaign Management",    desc: "Build campaign briefs, set deliverables, and manage creator relationships — all in one workspace." },
  { Icon: BarChart3,   title: "Analytics & Reporting",  desc: "Track reach, engagement, conversions, and ROI across every campaign. Real-time dashboards, no spreadsheets." },
  { Icon: Zap,         title: "Growth Recommendations", desc: "MRKT analyzes your results and surfaces what's working — which creators, formats, and campaigns drive the most return." },
];

const WORKFLOW = [
  { n: "01", title: "Sign in — instantly",    desc: "Create your account in seconds with Apple or Google. No forms, no email confirmation." },
  { n: "02", title: "Set up your workspace",  desc: "Select Business, add your brand and goals. MRKT tailors tools and language to your team." },
  { n: "03", title: "Build with AI",          desc: "Ask the AI Strategist to draft campaign plans, content briefs, or full marketing strategies." },
  { n: "04", title: "Discover creators",      desc: "MRKT matches creators by niche, audience, and campaign fit. Browse and invite with one click." },
  { n: "05", title: "Manage and grow",        desc: "Track campaigns, manage creator relationships, and iterate on what's working — all in one place." },
];

const METRICS = [
  { label: "Launch time",         value: "< 5 min",    delta: null },
  { label: "Platforms",           value: "TikTok + IG", delta: null },
  { label: "Creator matching",    value: "AI-powered",  delta: null },
  { label: "Strategy generation", value: "Seconds",     delta: null },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
function ForBusinessesPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-0 px-6 text-center overflow-x-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% -5%, oklch(0.17 0 0) 0%, oklch(0.04 0 0) 58%)",
          }}
        />

        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-8"
          style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 10%)" }}
        >
          <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.72 0.14 152)" }} />
          <span className="text-[9px] font-medium uppercase tracking-[0.32em]" style={{ color: "oklch(1 0 0 / 42%)" }}>
            MRKT for Businesses
          </span>
        </div>

        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.12] max-w-3xl mx-auto" style={{ letterSpacing: '0.02em', fontFeatureSettings: '"ss01" 1, "cv01" 1, "cv11" 1, "calt" 0' }}>
          Market smarter.<br />
          <span style={{ color: "oklch(1 0 0 / 35%)" }}>Grow faster.</span>
        </h1>

        <p
          className="mt-6 mx-auto max-w-[30rem] text-[1.0625rem] leading-[1.75] font-light"
          style={{ color: "oklch(1 0 0 / 42%)" }}
        >
          Plan campaigns, find creators, and grow your business —
          all from one intelligent marketing workspace.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <Link
              to="/chat"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
            >
              Open Workspace <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
            >
              Start for free <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            to={user ? "/find-creators" : "/login"}
            className="btn-ghost inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm"
          >
            Find creators <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <BusinessDashboardCard />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 inset-x-0 h-40"
            style={{ background: "linear-gradient(to top, var(--color-background) 20%, transparent)" }}
          />
        </div>
      </section>

      {/* ── METRICS STRIP ─────────────────────────────── */}
      <section className="px-6 py-20 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="rounded-2xl p-6 text-center"
                style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
              >
                <div
                  className="font-display text-3xl md:text-4xl font-bold tracking-tight"
                  style={{ color: "oklch(1 0 0 / 88%)" }}
                >
                  {m.value}
                </div>
                {m.delta && (
                  <div
                    className="text-[11px] font-medium mt-1"
                    style={{ color: "oklch(0.72 0.14 152)" }}
                  >
                    {m.delta}
                  </div>
                )}
                <div className="text-[11px] mt-2" style={{ color: "oklch(1 0 0 / 36%)" }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI STRATEGIST ─────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                AI Strategist
              </div>
              <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Your marketing team,<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>on demand.</span>
              </h2>
              <p
                className="mt-6 text-[1.0625rem] leading-[1.8] font-light"
                style={{ color: "oklch(1 0 0 / 44%)" }}
              >
                Ask MRKT to build campaign plans, write content briefs, generate hooks,
                and recommend the best channels for your goals. Structured, actionable
                strategy — in seconds.
              </p>
              <Link
                to={user ? "/chat" : "/login"}
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
              >
                {user ? "Open AI Strategist" : "Try the AI Strategist"} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <AIStrategyMockup />
          </div>
        </div>
      </section>

      {/* ── CREATOR DISCOVERY ─────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <CreatorDiscoveryMockup />
            </div>
            <div className="order-1 md:order-2">
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                MRKT Connect
              </div>
              <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Find creators<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>who fit perfectly.</span>
              </h2>
              <p
                className="mt-6 text-[1.0625rem] leading-[1.8] font-light"
                style={{ color: "oklch(1 0 0 / 44%)" }}
              >
                Search by niche, location, audience size, and engagement. MRKT's AI
                ranks creators by predicted campaign performance — not just follower count.
                Invite with one click.
              </p>
              <Link
                to={user ? "/find-creators" : "/login"}
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
              >
                Browse creators <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILT FOR YOUR BUSINESS ───────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              Every type of business
            </div>
            <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
              Built for how<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>you actually market.</span>
            </h2>
          </div>

          <div className="space-y-3">
            {BUSINESS_TYPES.map((b, i) => (
              <div
                key={b.name}
                className="flex items-start gap-6 rounded-2xl p-6"
                style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
              >
                <div
                  className="text-[9.5px] uppercase tracking-[0.22em] font-medium shrink-0 w-8 mt-0.5"
                  style={{ color: "oklch(1 0 0 / 26%)" }}
                >
                  0{i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1.5" style={{ color: "oklch(1 0 0 / 82%)" }}>
                    {b.name}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "oklch(1 0 0 / 42%)" }}>
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ─────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              Everything you need
            </div>
            <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
              One workspace.<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>Full control.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 9%)" }}
                >
                  <Icon className="h-4 w-4" style={{ color: "oklch(1 0 0 / 48%)" }} />
                </div>
                <div className="font-semibold mb-2 tracking-tight" style={{ color: "oklch(1 0 0 / 84%)" }}>
                  {title}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(1 0 0 / 42%)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              How it works
            </div>
            <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
              From brief<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>to results.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {WORKFLOW.map((step) => (
              <div
                key={step.n}
                className="rounded-2xl p-5"
                style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
              >
                <div
                  className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-4"
                  style={{ color: "oklch(1 0 0 / 26%)" }}
                >
                  {step.n}
                </div>
                <div className="font-semibold text-sm mb-2" style={{ color: "oklch(1 0 0 / 82%)" }}>
                  {step.title}
                </div>
                <p className="text-[0.8125rem] leading-relaxed" style={{ color: "oklch(1 0 0 / 40%)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section className="px-6 py-40 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          {user ? (
            <>
              <h2 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
                Your workspace<br />
                <span style={{ color: "oklch(1 0 0 / 34%)" }}>is ready.</span>
              </h2>
              <p
                className="mt-6 font-light max-w-xs mx-auto leading-relaxed"
                style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
              >
                Your strategies, campaigns, and creator relationships are waiting inside.
              </p>
              <Link
                to="/chat"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
              >
                Open Workspace <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
                Marketing that<br />
                <span style={{ color: "oklch(1 0 0 / 34%)" }}>actually performs.</span>
              </h2>
              <p
                className="mt-6 font-light max-w-xs mx-auto leading-relaxed"
                style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
              >
                Join businesses growing smarter with AI-powered marketing.
              </p>
              <Link
                to="/login"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
              >
                Start for free <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
