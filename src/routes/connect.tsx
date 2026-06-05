import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight,
  Sparkles,
  Users,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Heart,
  Eye,
  DollarSign,
  Activity,
  CheckCircle2,
  Instagram,
  Play,
} from "lucide-react";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "MRKT Connect — Where Brands Meet Creators" },
      {
        name: "description",
        content:
          "Find the right creators, launch campaigns, and track results — all in one workspace. AI-powered matching across TikTok and Instagram.",
      },
      { property: "og:title", content: "MRKT Connect — Where Brands Meet Creators" },
      {
        property: "og:description",
        content:
          "AI-powered creator marketplace. Discover, match and launch influencer campaigns across TikTok & Instagram.",
      },
    ],
  }),
  component: ConnectPage,
});

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────

const BRAND_STEPS = [
  { n: "01", t: "Create campaign",          d: "Brief, goals and brand fit in under two minutes." },
  { n: "02", t: "Define audience & budget", d: "Geos, demos, niches — and a dollar range." },
  { n: "03", t: "AI recommends creators",   d: "A ranked shortlist scored on real performance." },
  { n: "04", t: "Approve collaborations",   d: "Chat, contract and pay in one elegant flow." },
  { n: "05", t: "Track performance",        d: "Live metrics, attribution and ROI in real time." },
];

const BRAND_FEATURES = [
  { i: Users,    t: "Creator discovery",    d: "A curated index of vetted TikTok & Instagram talent." },
  { i: Target,   t: "Campaign management",  d: "Briefs, deliverables and timelines in one workspace." },
  { i: BarChart3, t: "Performance tracking", d: "Views, engagement and conversions per creator." },
  { i: Sparkles, t: "AI recommendations",   d: "Best-fit creators ranked by predicted lift." },
  { i: Activity, t: "Analytics dashboard",  d: "Real-time campaign health at a glance." },
  { i: Zap,      t: "Multi-platform",       d: "TikTok and Instagram, unified reporting." },
];

const CREATORS = [
  {
    name: "Alessia Moreau",
    handle: "@alessia.studio",
    followers: "412K",
    engagement: "6.8%",
    niche: ["Fashion", "Luxury"],
    location: "Paris",
    bg: "linear-gradient(145deg, oklch(0.42 0.08 30), oklch(0.18 0.04 350))",
  },
  {
    name: "Kenji Watari",
    handle: "@kenji.builds",
    followers: "287K",
    engagement: "9.2%",
    niche: ["Tech", "Design"],
    location: "Tokyo",
    bg: "linear-gradient(145deg, oklch(0.32 0.06 252), oklch(0.15 0.04 270))",
  },
  {
    name: "Noa Lindqvist",
    handle: "@noa.daily",
    followers: "1.2M",
    engagement: "5.1%",
    niche: ["Lifestyle", "Travel"],
    location: "Stockholm",
    bg: "linear-gradient(145deg, oklch(0.38 0.07 196), oklch(0.16 0.04 210))",
  },
];

const CAMPAIGNS = [
  { brand: "Maison Aurum",    title: "Luxury fashion launch",      compensation: "PAID", budget: "$24,000", platform: "Instagram",    requirements: "100K+ · Fashion",      deliverables: "2 Reels · 3 Stories" },
  { brand: "Osteria Volta",   title: "Restaurant opening",         compensation: "PAID", budget: "$3,500",  platform: "TikTok",       requirements: "Local · Food",         deliverables: "1 TikTok · 2 Stories" },
  { brand: "Helio Fit",       title: "Fitness app promotion",      compensation: "PAID", budget: "$12,000", platform: "TikTok + IG",  requirements: "Health & wellness",    deliverables: "3 Reels · 1 TikTok"  },
  { brand: "Noir Devices",    title: "Tech product campaign",      compensation: "PAID", budget: "$48,000", platform: "Instagram",    requirements: "200K+ · Tech reviews", deliverables: "1 Review · 2 Reels"  },
  { brand: "Méridien Beauty", title: "Beauty brand collaboration", compensation: "GIFTED", budget: null,    platform: "TikTok",       requirements: "Beauty & skincare",    deliverables: "4 TikToks · 1 GRWM"  },
  { brand: "Studio 8",        title: "Editorial drop",             compensation: "PAID", budget: "$9,500",  platform: "Instagram",    requirements: "Art direction",        deliverables: "1 Carousel · 2 Reels" },
];

const METRICS = [
  { l: "Total views",    v: "12.4M", d: "+38.2%", i: Eye         },
  { l: "Engagement",     v: "847K",  d: "+12.6%", i: Heart       },
  { l: "Conversions",    v: "31,204",d: "+22.9%", i: TrendingUp  },
  { l: "Campaign ROI",   v: "4.8×",  d: "+0.6×",  i: DollarSign  },
];

const MATCHING_BRANDS   = ["Maison Aurum", "Noir Devices", "Helio Fit"];
const MATCHING_CREATORS = CREATORS;

// ─────────────────────────────────────────────────────────────
// Shared surface card style
// ─────────────────────────────────────────────────────────────
const surface = {
  background: "oklch(1 0 0 / 3%)",
  border:     "1px solid oklch(1 0 0 / 8%)",
} as const;

const surfaceElevated = {
  background: "oklch(1 0 0 / 4.5%)",
  border:     "1px solid oklch(1 0 0 / 10%)",
} as const;

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
function ConnectPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Atmospheric depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% -5%, oklch(0.17 0 0) 0%, oklch(0.04 0 0) 58%)",
          }}
        />

        <div className="mx-auto max-w-7xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-8"
            style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 10%)" }}
          >
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.72 0.14 152)" }} />
            <span
              className="text-[9px] font-medium uppercase tracking-[0.32em]"
              style={{ color: "oklch(1 0 0 / 42%)" }}
            >
              MRKT Connect
            </span>
          </div>

          <h1 className="font-display text-[clamp(3rem,7.5vw,6.5rem)] font-bold leading-[1.12] max-w-4xl" style={{ letterSpacing: '0.02em', fontFeatureSettings: '"ss01" 1, "cv01" 1, "cv11" 1, "calt" 0' }}>
            Where brands<br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>meet creators.</span>
          </h1>

          <p
            className="mt-7 max-w-xl text-[1.0625rem] font-light leading-[1.8]"
            style={{ color: "oklch(1 0 0 / 44%)" }}
          >
            Launch influencer campaigns, discover creators, and scale content
            through AI-powered matching across TikTok and Instagram.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/campaign-create"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm"
            >
              Post a Campaign <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/creator-onboarding"
              className="btn-ghost inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm"
            >
              Create Creator Profile
            </Link>
          </div>

          {/* Metric cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <div key={m.l} className="rounded-2xl p-5" style={surface}>
                <div className="flex items-center justify-between">
                  <m.i className="h-4 w-4" style={{ color: "oklch(1 0 0 / 38%)" }} />
                  <span
                    className="text-[11px] rounded px-1.5 py-0.5 font-medium"
                    style={{
                      color: "oklch(0.72 0.14 152)",
                      background: "oklch(0.72 0.14 152 / 12%)",
                    }}
                  >
                    {m.d}
                  </span>
                </div>
                <div
                  className="mt-3 font-display text-3xl font-semibold tracking-tight"
                  style={{ color: "oklch(1 0 0 / 88%)" }}
                >
                  {m.v}
                </div>
                <div className="text-xs mt-1" style={{ color: "oklch(1 0 0 / 34%)" }}>{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR BRANDS ─────────────────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-8 mb-14">
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                For brands
              </div>
              <h2 className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Built for modern<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>brands.</span>
              </h2>
            </div>
            <div className="hidden md:flex flex-col items-end gap-4">
              <p className="max-w-sm font-light leading-relaxed text-right" style={{ color: "oklch(1 0 0 / 42%)" }}>
                From brief to billing — a single, premium workspace for every influencer campaign.
              </p>
              <Link
                to="/campaign-create"
                className="btn-primary inline-flex h-10 items-center gap-2 rounded-full px-6 text-sm"
              >
                Post a Campaign <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-5 gap-3 mb-16">
            {BRAND_STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-6" style={surface}>
                <div
                  className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-4"
                  style={{ color: "oklch(1 0 0 / 26%)" }}
                >
                  {s.n}
                </div>
                <div className="text-sm font-medium mb-2" style={{ color: "oklch(1 0 0 / 80%)" }}>
                  {s.t}
                </div>
                <div className="text-[0.8125rem] leading-relaxed" style={{ color: "oklch(1 0 0 / 40%)" }}>
                  {s.d}
                </div>
              </div>
            ))}
          </div>

          {/* Dashboard mockup */}
          <div className="rounded-3xl overflow-hidden" style={surfaceElevated}>
            <div className="grid md:grid-cols-12 gap-6 p-8">
              {/* Left: campaign list */}
              <div className="md:col-span-3 space-y-3">
                <div
                  className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-4"
                  style={{ color: "oklch(1 0 0 / 28%)" }}
                >
                  Active campaigns
                </div>
                {["Aurum SS26", "Helio Launch", "Noir Devices"].map((c, i) => (
                  <div
                    key={c}
                    className="rounded-xl p-4"
                    style={{
                      background: i === 0 ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 2%)",
                      border: `1px solid oklch(1 0 0 / ${i === 0 ? "12" : "6"}%)`,
                    }}
                  >
                    <div className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 80%)" }}>
                      {c}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "oklch(1 0 0 / 32%)" }}>
                      {8 + i * 3} creators · live
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: performance panel */}
              <div
                className="md:col-span-9 rounded-2xl p-6"
                style={{ background: "oklch(0 0 0 / 25%)", border: "1px solid oklch(1 0 0 / 7%)" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div
                      className="text-[9.5px] uppercase tracking-[0.28em] font-medium"
                      style={{ color: "oklch(1 0 0 / 28%)" }}
                    >
                      Aurum SS26 · Performance
                    </div>
                    <div className="font-display text-xl font-semibold mt-1" style={{ color: "oklch(1 0 0 / 86%)" }}>
                      Last 14 days
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-[10.5px]">
                    {["14D", "30D", "90D"].map((t, i) => (
                      <span
                        key={t}
                        className="rounded-full px-3 py-1"
                        style={{
                          background: i === 0 ? "oklch(1 0 0 / 8%)" : "transparent",
                          border: "1px solid oklch(1 0 0 / 9%)",
                          color: i === 0 ? "oklch(1 0 0 / 72%)" : "oklch(1 0 0 / 30%)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  {METRICS.map((m) => (
                    <div key={m.l}>
                      <div className="text-[9.5px] uppercase tracking-[0.2em]" style={{ color: "oklch(1 0 0 / 28%)" }}>
                        {m.l}
                      </div>
                      <div className="font-display text-xl font-semibold mt-1" style={{ color: "oklch(1 0 0 / 88%)" }}>
                        {m.v}
                      </div>
                      <div
                        className="text-[10px] mt-0.5 font-medium"
                        style={{ color: "oklch(0.72 0.14 152)" }}
                      >
                        {m.d}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sparkline chart */}
                <div
                  className="h-28 relative rounded-xl overflow-hidden"
                  style={{ border: "1px solid oklch(1 0 0 / 8%)" }}
                >
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,90 C40,80 60,60 100,55 C140,50 160,75 200,60 C240,45 260,20 300,30 C340,40 360,25 400,15 L400,120 L0,120 Z"
                      fill="url(#g1)"
                    />
                    <path
                      d="M0,90 C40,80 60,60 100,55 C140,50 160,75 200,60 C240,45 260,20 300,30 C340,40 360,25 400,15"
                      stroke="white"
                      strokeOpacity="0.7"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {BRAND_FEATURES.map((f) => (
              <div
                key={f.t}
                className="rounded-2xl p-6 transition-colors duration-200"
                style={surface}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 3%)";
                }}
              >
                <f.i className="h-5 w-5 mb-4" style={{ color: "oklch(1 0 0 / 40%)" }} />
                <div className="font-medium mb-1" style={{ color: "oklch(1 0 0 / 80%)" }}>{f.t}</div>
                <div className="text-sm leading-relaxed" style={{ color: "oklch(1 0 0 / 40%)" }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR CREATORS ───────────────────────────────────────── */}
      <section id="creators" className="relative px-6 py-28 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-8 mb-14">
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                For creators
              </div>
              <h2 className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Turn content into<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>opportunity.</span>
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {CREATORS.map((c) => (
              <div
                key={c.handle}
                className="rounded-3xl overflow-hidden"
                style={surface}
              >
                {/* Card top — atmospheric color */}
                <div className="relative h-52" style={{ background: c.bg }}>
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, oklch(0 0 0 / 70%) 0%, transparent 55%)" }} />
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    {[Instagram, Play].map((Icon, i) => (
                      <div
                        key={i}
                        className="h-7 w-7 rounded-full flex items-center justify-center"
                        style={{ background: "oklch(0 0 0 / 35%)", border: "1px solid oklch(1 0 0 / 14%)" }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: "oklch(1 0 0 / 70%)" }} />
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="font-display text-xl font-semibold" style={{ color: "oklch(1 0 0 / 90%)" }}>
                      {c.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "oklch(1 0 0 / 55%)" }}>
                      {c.handle} · {c.location}
                    </div>
                  </div>
                </div>

                {/* Card bottom — stats */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Followers",  value: c.followers },
                      { label: "Engagement", value: c.engagement },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-3"
                        style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 7%)" }}
                      >
                        <div className="text-[10px]" style={{ color: "oklch(1 0 0 / 35%)" }}>{s.label}</div>
                        <div className="font-display text-xl font-semibold mt-0.5" style={{ color: "oklch(1 0 0 / 88%)" }}>
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.niche.map((n) => (
                      <span
                        key={n}
                        className="text-xs rounded-full px-2.5 py-1"
                        style={{ border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 40%)" }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Creator features */}
          <div className="grid md:grid-cols-3 gap-3 mt-8">
            {[
              "Browse paid campaigns",
              "Apply instantly",
              "Connect TikTok & Instagram",
              "Engagement analytics",
              "Track earnings",
              "Long-term partnerships",
            ].map((f) => (
              <div
                key={f}
                className="rounded-2xl p-5 flex items-center gap-3"
                style={surface}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 35%)" }} />
                <span className="text-sm" style={{ color: "oklch(1 0 0 / 68%)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI MATCHING ────────────────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t overflow-hidden">
        {/* Subtle atmospheric depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, oklch(0.12 0 0) 0%, transparent 65%)",
          }}
        />

        <div className="mx-auto max-w-7xl text-center">
          <div
            className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-5"
            style={{ color: "oklch(1 0 0 / 28%)" }}
          >
            AI Matching Engine
          </div>
          <h2 className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07] max-w-4xl mx-auto">
            Powered by intelligent<br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>creator matching.</span>
          </h2>
          <p
            className="mt-6 max-w-2xl mx-auto font-light leading-[1.8]"
            style={{ color: "oklch(1 0 0 / 44%)", fontSize: "1.0625rem" }}
          >
            Our engine reads engagement quality, audience overlap and creative style — then predicts
            the campaigns most likely to perform before a single dollar is spent.
          </p>

          {/* Connector visual */}
          <div className="relative mt-16 rounded-3xl p-8 md:p-14 text-left" style={surfaceElevated}>
            <div className="grid md:grid-cols-3 gap-8 items-center">

              {/* Brands */}
              <div className="space-y-3">
                {MATCHING_BRANDS.map((b, i) => (
                  <div
                    key={b}
                    className="rounded-xl p-4"
                    style={{
                      background: i === 0 ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 2%)",
                      border: `1px solid oklch(1 0 0 / ${i === 0 ? "12" : "6"}%)`,
                    }}
                  >
                    <div className="text-[9.5px] uppercase tracking-[0.22em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 28%)" }}>
                      Brand
                    </div>
                    <div className="font-medium text-sm" style={{ color: "oklch(1 0 0 / 80%)" }}>{b}</div>
                  </div>
                ))}
              </div>

              {/* Central orb */}
              <div className="relative flex items-center justify-center">
                <div
                  className="relative h-36 w-36 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, oklch(0.24 0 0), oklch(0.1 0 0))",
                    border: "1px solid oklch(1 0 0 / 14%)",
                    boxShadow: "0 0 48px oklch(1 0 0 / 5%)",
                  }}
                >
                  <Sparkles className="h-7 w-7" style={{ color: "oklch(1 0 0 / 70%)" }} />
                  <div
                    className="absolute -inset-5 rounded-full"
                    style={{ border: "1px solid oklch(1 0 0 / 8%)" }}
                  />
                  <div
                    className="absolute -inset-10 rounded-full"
                    style={{ border: "1px solid oklch(1 0 0 / 5%)" }}
                  />
                </div>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 400 200"
                  preserveAspectRatio="none"
                >
                  <g stroke="white" strokeOpacity="0.08" strokeWidth="1" fill="none">
                    <path d="M0,40 C150,40 250,100 400,40" />
                    <path d="M0,100 C150,100 250,100 400,100" />
                    <path d="M0,160 C150,160 250,100 400,160" />
                  </g>
                </svg>
              </div>

              {/* Creators */}
              <div className="space-y-3">
                {MATCHING_CREATORS.map((c, i) => (
                  <div
                    key={c.handle}
                    className="rounded-xl p-4 flex items-center justify-between"
                    style={{
                      background: i === 0 ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 2%)",
                      border: `1px solid oklch(1 0 0 / ${i === 0 ? "12" : "6"}%)`,
                    }}
                  >
                    <div>
                      <div className="text-[9.5px] uppercase tracking-[0.22em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 28%)" }}>
                        Creator
                      </div>
                      <div className="font-medium text-sm" style={{ color: "oklch(1 0 0 / 80%)" }}>{c.handle}</div>
                    </div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: "oklch(0.72 0.14 152)" }}
                    >
                      {90 - i * 4}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signal labels */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10">
              {["Audience analysis", "Engagement quality", "Style compatibility", "Success prediction"].map((t) => (
                <div
                  key={t}
                  className="rounded-xl p-4 text-sm text-center"
                  style={{ border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 40%)" }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE CAMPAIGNS ─────────────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-8 mb-14">
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                Live campaigns
              </div>
              <h2 className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Open now.
              </h2>
            </div>
            <a
              href="#"
              className="text-sm flex items-center gap-1 transition-colors duration-150"
              style={{ color: "oklch(1 0 0 / 36%)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 65%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 36%)"; }}
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAMPAIGNS.map((c) => {
              const isPaid = c.compensation === "PAID";
              const isGifted = c.compensation === "GIFTED";
              return (
                <div
                  key={c.title}
                  className="rounded-2xl p-6 flex flex-col transition-colors duration-200"
                  style={surface}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 3%)"; }}
                >
                  {/* Compensation badge — always first */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.2em] rounded-full px-3 py-1 flex items-center gap-1.5"
                      style={{
                        color: isPaid ? "oklch(0.72 0.14 152)" : isGifted ? "oklch(0.78 0.12 60)" : "oklch(1 0 0 / 40%)",
                        background: isPaid ? "oklch(0.72 0.14 152 / 12%)" : isGifted ? "oklch(0.78 0.12 60 / 12%)" : "oklch(1 0 0 / 6%)",
                        border: `1px solid ${isPaid ? "oklch(0.72 0.14 152 / 28%)" : isGifted ? "oklch(0.78 0.12 60 / 28%)" : "oklch(1 0 0 / 10%)"}`,
                      }}
                    >
                      {c.compensation}
                      {isPaid && c.budget && <span className="font-normal">· {c.budget}</span>}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-[0.2em] rounded-full px-2 py-0.5 font-medium"
                      style={{ border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 36%)" }}
                    >
                      {c.platform}
                    </span>
                  </div>

                  <div className="text-[10.5px] mb-1.5" style={{ color: "oklch(1 0 0 / 36%)" }}>{c.brand}</div>
                  <div
                    className="font-display text-[1.2rem] font-semibold tracking-tight mb-4 flex-1"
                    style={{ color: "oklch(1 0 0 / 86%)" }}
                  >
                    {c.title}
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Requirements", value: c.requirements },
                      { label: "Deliverables", value: c.deliverables },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between gap-4">
                        <span style={{ color: "oklch(1 0 0 / 32%)" }}>{row.label}</span>
                        <span className="text-right" style={{ color: "oklch(1 0 0 / 68%)" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/creator-onboarding"
                    className="btn-primary mt-5 w-full h-10 rounded-full text-sm flex items-center justify-center gap-2"
                  >
                    Apply as Creator <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ANALYTICS ──────────────────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div
            className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
            style={{ color: "oklch(1 0 0 / 28%)" }}
          >
            Analytics
          </div>
          <h2 className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07] max-w-3xl mb-14">
            Every signal,<br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>in one view.</span>
          </h2>

          <div className="rounded-3xl overflow-hidden" style={surfaceElevated}>
            {/* Stat row */}
            <div
              className="grid md:grid-cols-4"
              style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
            >
              {METRICS.map((m, i) => (
                <div
                  key={m.l}
                  className="p-7"
                  style={{
                    borderRight: i < 3 ? "1px solid oklch(1 0 0 / 7%)" : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <m.i className="h-4 w-4" style={{ color: "oklch(1 0 0 / 36%)" }} />
                    <span
                      className="text-[10.5px] font-medium"
                      style={{ color: "oklch(0.72 0.14 152)" }}
                    >
                      {m.d}
                    </span>
                  </div>
                  <div
                    className="font-display text-4xl font-semibold tracking-tight"
                    style={{ color: "oklch(1 0 0 / 88%)" }}
                  >
                    {m.v}
                  </div>
                  <div className="text-sm mt-1" style={{ color: "oklch(1 0 0 / 34%)" }}>{m.l}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="p-6 grid md:grid-cols-2 gap-5">
              {/* Reach over time */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "oklch(0 0 0 / 22%)", border: "1px solid oklch(1 0 0 / 7%)" }}
              >
                <div
                  className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-4"
                  style={{ color: "oklch(1 0 0 / 28%)" }}
                >
                  Reach over time
                </div>
                <div className="h-44 relative">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,140 C50,120 80,90 130,95 C180,100 200,60 250,55 C300,50 340,30 400,20 L400,180 L0,180 Z"
                      fill="url(#g2)"
                    />
                    <path
                      d="M0,140 C50,120 80,90 130,95 C180,100 200,60 250,55 C300,50 340,30 400,20"
                      stroke="white"
                      strokeOpacity="0.65"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>

              {/* Top creators */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "oklch(0 0 0 / 22%)", border: "1px solid oklch(1 0 0 / 7%)" }}
              >
                <div
                  className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-4"
                  style={{ color: "oklch(1 0 0 / 28%)" }}
                >
                  Top creators
                </div>
                <div className="space-y-3.5">
                  {CREATORS.map((c, i) => (
                    <div key={c.handle} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full"
                          style={{ background: c.bg }}
                        />
                        <div>
                          <div className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 78%)" }}>
                            {c.handle}
                          </div>
                          <div className="text-xs" style={{ color: "oklch(1 0 0 / 32%)" }}>
                            {c.followers} · {c.engagement}
                          </div>
                        </div>
                      </div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: "oklch(1 0 0 / 60%)" }}
                      >
                        {(4.8 - i * 0.4).toFixed(1)}× ROI
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <section className="relative px-6 py-40 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-bold leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
            Marketing moves faster<br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>with creators.</span>
          </h2>
          <p
            className="mt-6 font-light max-w-sm mx-auto leading-relaxed"
            style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
          >
            Build campaigns, discover creators, and grow through AI-powered collaboration.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                to="/chat"
                className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm"
              >
                Open Workspace <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm"
              >
                Start Free <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/creator-onboarding"
              className="btn-ghost inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm"
            >
              {user ? "View Creator Profile" : "Create Creator Profile"} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
