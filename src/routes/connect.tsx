import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
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
      { title: "MRKT Connect — Where Brands Meet Influence" },
      {
        name: "description",
        content:
          "Launch influencer campaigns, discover creators, and scale content through AI-powered matching on TikTok and Instagram.",
      },
      { property: "og:title", content: "MRKT Connect — Where Brands Meet Influence" },
      {
        property: "og:description",
        content:
          "Premium AI-powered creator collaboration. Discover, match and launch influencer campaigns across TikTok & Instagram.",
      },
    ],
  }),
  component: ConnectPage,
});

const BRAND_STEPS = [
  { n: "01", t: "Create campaign", d: "Brief, goals and brand fit in under two minutes." },
  { n: "02", t: "Define audience & budget", d: "Geos, demos, niches — and a dollar range." },
  { n: "03", t: "AI recommends creators", d: "A ranked shortlist scored on real performance." },
  { n: "04", t: "Approve collaborations", d: "Chat, contract and pay in one elegant flow." },
  { n: "05", t: "Track performance", d: "Live metrics, attribution and ROI in real time." },
];

const BRAND_FEATURES = [
  { i: Users, t: "Creator discovery", d: "A curated index of vetted TikTok & Instagram talent." },
  { i: Target, t: "Campaign management", d: "Briefs, deliverables and timelines in one workspace." },
  { i: BarChart3, t: "Performance tracking", d: "Views, engagement and conversions per creator." },
  { i: Sparkles, t: "AI recommendations", d: "Best-fit creators ranked by predicted lift." },
  { i: Activity, t: "Analytics dashboard", d: "Real-time campaign health at a glance." },
  { i: Zap, t: "Multi-platform", d: "TikTok and Instagram, unified reporting." },
];

const CREATORS = [
  {
    name: "Alessia Moreau",
    handle: "@alessia.studio",
    followers: "412K",
    engagement: "6.8%",
    niche: ["Fashion", "Luxury"],
    location: "Paris",
    avatar: "from-rose-200 to-amber-200",
  },
  {
    name: "Kenji Watari",
    handle: "@kenji.builds",
    followers: "287K",
    engagement: "9.2%",
    niche: ["Tech", "Design"],
    location: "Tokyo",
    avatar: "from-zinc-200 to-blue-200",
  },
  {
    name: "Noa Lindqvist",
    handle: "@noa.daily",
    followers: "1.2M",
    engagement: "5.1%",
    niche: ["Lifestyle", "Travel"],
    location: "Stockholm",
    avatar: "from-emerald-100 to-cyan-200",
  },
];

const CAMPAIGNS = [
  {
    brand: "Maison Aurum",
    title: "Luxury fashion launch",
    budget: "$24,000",
    platform: "Instagram",
    requirements: "100K+ • Fashion niche",
    deliverables: "2 Reels · 3 Stories",
  },
  {
    brand: "Osteria Volta",
    title: "Restaurant opening",
    budget: "$3,500",
    platform: "TikTok",
    requirements: "Local · Food creators",
    deliverables: "1 TikTok · 2 Stories",
  },
  {
    brand: "Helio Fit",
    title: "Fitness app promotion",
    budget: "$12,000",
    platform: "TikTok + IG",
    requirements: "Health & wellness",
    deliverables: "3 Reels · 1 TikTok",
  },
  {
    brand: "Noir Devices",
    title: "Tech product campaign",
    budget: "$48,000",
    platform: "Instagram",
    requirements: "200K+ • Tech reviews",
    deliverables: "1 Review · 2 Reels",
  },
  {
    brand: "Méridien Beauty",
    title: "Beauty brand collaboration",
    budget: "$18,000",
    platform: "TikTok",
    requirements: "Beauty & skincare",
    deliverables: "4 TikToks · 1 GRWM",
  },
  {
    brand: "Studio 8",
    title: "Editorial drop",
    budget: "$9,500",
    platform: "Instagram",
    requirements: "Art direction",
    deliverables: "1 Carousel · 2 Reels",
  },
];

const METRICS = [
  { l: "Total views", v: "12.4M", d: "+38.2%", i: Eye },
  { l: "Engagement", v: "847K", d: "+12.6%", i: Heart },
  { l: "Conversions", v: "31,204", d: "+22.9%", i: TrendingUp },
  { l: "Campaign ROI", v: "4.8×", d: "+0.6×", i: DollarSign },
];

function ConnectPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative pt-32 pb-32 px-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-30 blur-3xl"
               style={{ background: "var(--gradient-chrome)" }} />
          <div className="absolute inset-0 grain" />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full hairline border px-3">
              <Sparkles className="h-3 w-3" /> MRKT Connect
            </span>
            <span>Creator collaboration, reimagined.</span>
          </div>

          <h1 className="font-display text-[clamp(3rem,9vw,8rem)] leading-[0.92] tracking-tight">
            <span className="text-chrome-h">Where Brands</span>
            <br />
            <span className="text-foreground/90">Meet Influence.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Launch influencer campaigns, discover creators, and scale content through
            AI-powered matching across TikTok and Instagram.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm"
            >
              Launch Campaign <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a
              href="#creators"
              className="inline-flex h-12 items-center gap-2 rounded-full hairline border px-7 text-sm text-foreground/90 transition hover:bg-white/5"
            >
              Explore Creators
            </a>
          </div>

          {/* Floating analytics chips */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICS.map((m, i) => (
              <div
                key={m.l}
                className="relative chrome-border rounded-2xl surface p-5 float-slow"
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <div className="flex items-center justify-between">
                  <m.i className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-emerald-400/80">{m.d}</span>
                </div>
                <div className="mt-3 font-display text-3xl tracking-tight">{m.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR BRANDS */}
      <section className="relative px-6 py-32 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-8 mb-16">
            <div>
              <div className="text-xs text-muted-foreground mb-3">For brands</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tight">
                Built for modern brands.
              </h2>
            </div>
            <p className="hidden md:block max-w-sm text-muted-foreground">
              From brief to billing — a single, premium workspace for every influencer campaign.
            </p>
          </div>

          {/* Workflow */}
          <div className="grid md:grid-cols-5 gap-3 mb-20">
            {BRAND_STEPS.map((s) => (
              <div
                key={s.n}
                className="relative chrome-border rounded-2xl surface p-6 transition hover:surface-2"
              >
                <div className="text-xs text-muted-foreground">{s.n}</div>
                <div className="mt-4 font-medium">{s.t}</div>
                <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>

          {/* Dashboard mockup */}
          <div className="relative chrome-border rounded-3xl surface overflow-hidden">
            <div className="absolute inset-0 opacity-40"
                 style={{ background: "radial-gradient(800px 400px at 80% 0%, oklch(0.78 0.005 250 / 18%), transparent)" }} />
            <div className="relative grid md:grid-cols-12 gap-6 p-8">
              <div className="md:col-span-3 space-y-3">
                <div className="text-xs text-muted-foreground">Active campaigns</div>
                {["Aurum SS26", "Helio Launch", "Noir Devices"].map((c, i) => (
                  <div key={c} className={`rounded-xl hairline border p-4 ${i === 0 ? "bg-white/[0.04]" : ""}`}>
                    <div className="text-sm">{c}</div>
                    <div className="text-xs text-muted-foreground mt-1">{8 + i * 3} creators · live</div>
                  </div>
                ))}
              </div>
              <div className="md:col-span-9 rounded-2xl hairline border p-6 bg-black/30">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Aurum SS26 · Performance</div>
                    <div className="font-display text-2xl mt-1">Last 14 days</div>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full hairline border px-3 py-1">14D</span>
                    <span className="rounded-full hairline border px-3 py-1 bg-white/5">30D</span>
                    <span className="rounded-full hairline border px-3 py-1">90D</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {METRICS.map((m) => (
                    <div key={m.l}>
                      <div className="text-xs text-muted-foreground">{m.l}</div>
                      <div className="font-display text-2xl mt-1">{m.v}</div>
                      <div className="text-xs text-emerald-400/80">{m.d}</div>
                    </div>
                  ))}
                </div>
                {/* Sparkline */}
                <div className="h-32 relative rounded-xl hairline border overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,90 C40,80 60,60 100,55 C140,50 160,75 200,60 C240,45 260,20 300,30 C340,40 360,25 400,15 L400,120 L0,120 Z" fill="url(#g1)" />
                    <path d="M0,90 C40,80 60,60 100,55 C140,50 160,75 200,60 C240,45 260,20 300,30 C340,40 360,25 400,15" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-3 mt-6">
            {BRAND_FEATURES.map((f) => (
              <div key={f.t} className="rounded-2xl hairline border surface p-6 transition hover:bg-white/[0.03]">
                <f.i className="h-5 w-5 text-muted-foreground" />
                <div className="mt-4 font-medium">{f.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR CREATORS */}
      <section id="creators" className="relative px-6 py-32 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-8 mb-16">
            <div>
              <div className="text-xs text-muted-foreground mb-3">For creators</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tight">
                Turn content into <br className="hidden md:inline" />opportunity.
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {CREATORS.map((c) => (
              <div key={c.handle} className="relative chrome-border rounded-3xl surface overflow-hidden group">
                <div className={`relative h-56 bg-gradient-to-br ${c.avatar}`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <span className="h-7 w-7 rounded-full glass hairline border flex items-center justify-center">
                      <Instagram className="h-3.5 w-3.5" />
                    </span>
                    <span className="h-7 w-7 rounded-full glass hairline border flex items-center justify-center">
                      <Play className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="font-display text-2xl">{c.name}</div>
                    <div className="text-xs text-white/70">{c.handle} · {c.location}</div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl hairline border p-3">
                      <div className="text-xs text-muted-foreground">Followers</div>
                      <div className="font-display text-xl mt-0.5">{c.followers}</div>
                    </div>
                    <div className="rounded-xl hairline border p-3">
                      <div className="text-xs text-muted-foreground">Engagement</div>
                      <div className="font-display text-xl mt-0.5">{c.engagement}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.niche.map((n) => (
                      <span key={n} className="text-xs rounded-full hairline border px-2.5 py-1 text-muted-foreground">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-10">
            {[
              "Browse paid campaigns",
              "Apply instantly",
              "Connect TikTok & Instagram",
              "Engagement analytics",
              "Track earnings",
              "Long-term partnerships",
            ].map((f) => (
              <div key={f} className="rounded-2xl hairline border surface p-5 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI MATCHING */}
      <section className="relative px-6 py-32 hairline-t overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] opacity-30 blur-3xl"
               style={{ background: "var(--gradient-chrome-h)" }} />
        </div>
        <div className="mx-auto max-w-7xl text-center">
          <div className="text-xs text-muted-foreground mb-3">AI Matching Engine</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight max-w-4xl mx-auto">
            <span className="text-chrome-h">Powered by intelligent</span><br />
            creator matching.
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-muted-foreground">
            Our engine reads engagement quality, audience overlap and creative style — then predicts
            the campaigns most likely to perform before a single dollar is spent.
          </p>

          {/* Visual connector */}
          <div className="relative mt-20 chrome-border rounded-3xl surface p-10 md:p-16 text-left">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="space-y-3">
                {["Maison Aurum", "Noir Devices", "Helio Fit"].map((b, i) => (
                  <div key={b} className={`rounded-xl hairline border p-4 ${i === 0 ? "bg-white/[0.05]" : ""}`}>
                    <div className="text-xs text-muted-foreground">Brand</div>
                    <div className="font-medium mt-1">{b}</div>
                  </div>
                ))}
              </div>

              <div className="relative flex items-center justify-center">
                <div className="relative h-40 w-40 rounded-full bg-white/10 border border-white/15 flex items-center justify-center" style={{ boxShadow: "0 0 60px oklch(1 0 0 / 8%)" }}>
                  <Sparkles className="h-8 w-8 text-black" />
                  <div className="absolute -inset-4 rounded-full hairline border animate-pulse" />
                  <div className="absolute -inset-10 rounded-full hairline border opacity-50" />
                </div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <g stroke="white" strokeOpacity="0.15" strokeWidth="1" fill="none">
                    <path d="M0,40 C150,40 250,100 400,40" />
                    <path d="M0,100 C150,100 250,100 400,100" />
                    <path d="M0,160 C150,160 250,100 400,160" />
                  </g>
                </svg>
              </div>

              <div className="space-y-3">
                {CREATORS.map((c, i) => (
                  <div key={c.handle} className={`rounded-xl hairline border p-4 ${i === 0 ? "bg-white/[0.05]" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Creator</div>
                        <div className="font-medium mt-1">{c.handle}</div>
                      </div>
                      <div className="text-xs text-emerald-400/80">{90 - i * 4}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
              {[
                "Audience analysis",
                "Engagement quality",
                "Style compatibility",
                "Success prediction",
              ].map((t) => (
                <div key={t} className="rounded-xl hairline border p-4 text-sm text-center text-muted-foreground">
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LIVE CAMPAIGNS */}
      <section className="relative px-6 py-32 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-8 mb-16">
            <div>
              <div className="text-xs text-muted-foreground mb-3">Live campaigns</div>
              <h2 className="font-display text-5xl md:text-7xl tracking-tight">
                Open now.
              </h2>
            </div>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAMPAIGNS.map((c) => (
              <div key={c.title} className="group relative chrome-border rounded-2xl surface p-6 transition hover:surface-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">{c.brand}</div>
                  <span className="text-[10px] uppercase tracking-wider rounded-full hairline border px-2 py-0.5 text-muted-foreground">
                    {c.platform}
                  </span>
                </div>
                <div className="mt-4 font-display text-2xl tracking-tight">{c.title}</div>
                <div className="mt-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget</span>
                    <span>{c.budget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requirements</span>
                    <span className="text-right">{c.requirements}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deliverables</span>
                    <span className="text-right">{c.deliverables}</span>
                  </div>
                </div>
                <button className="btn-primary mt-6 w-full h-10 rounded-full text-sm">
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS PREVIEW */}
      <section className="relative px-6 py-32 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="text-xs text-muted-foreground mb-3">Analytics</div>
          <h2 className="font-display text-5xl md:text-7xl tracking-tight max-w-3xl">
            Every signal, in one view.
          </h2>

          <div className="relative mt-16 chrome-border rounded-3xl surface overflow-hidden">
            <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
              {METRICS.map((m) => (
                <div key={m.l} className="surface p-8">
                  <div className="flex items-center justify-between">
                    <m.i className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-emerald-400/80">{m.d}</span>
                  </div>
                  <div className="mt-6 font-display text-4xl tracking-tight">{m.v}</div>
                  <div className="text-sm text-muted-foreground mt-1">{m.l}</div>
                </div>
              ))}
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl hairline border p-6 bg-black/30">
                <div className="text-xs text-muted-foreground mb-4">Reach over time</div>
                <div className="h-48 relative">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,140 C50,120 80,90 130,95 C180,100 200,60 250,55 C300,50 340,30 400,20 L400,180 L0,180 Z" fill="url(#g2)" />
                    <path d="M0,140 C50,120 80,90 130,95 C180,100 200,60 250,55 C300,50 340,30 400,20" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              </div>
              <div className="rounded-2xl hairline border p-6 bg-black/30">
                <div className="text-xs text-muted-foreground mb-4">Top creators</div>
                <div className="space-y-3">
                  {CREATORS.map((c, i) => (
                    <div key={c.handle} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${c.avatar}`} />
                        <div>
                          <div className="text-sm">{c.handle}</div>
                          <div className="text-xs text-muted-foreground">{c.followers} · {c.engagement}</div>
                        </div>
                      </div>
                      <div className="text-sm">{(4.8 - i * 0.4).toFixed(1)}× ROI</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative px-6 py-40 hairline-t overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-40"
               style={{ background: "radial-gradient(900px 500px at 50% 50%, oklch(0.78 0.005 250 / 25%), transparent)" }} />
          <div className="absolute inset-0 grain" />
        </div>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-5xl md:text-8xl tracking-tight">
            <span className="text-chrome-h">Marketing moves faster</span><br />
            with creators.
          </h2>
          <p className="mt-8 max-w-2xl mx-auto text-lg text-muted-foreground">
            Build campaigns, discover creators, and grow through AI-powered collaboration.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm"
            >
              Start Free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-full hairline border px-7 text-sm text-foreground/90 transition hover:bg-white/5"
            >
              Join as Creator
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
