import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import {
  ArrowUpRight,
  Sparkles,
  Globe2,
  CalendarDays,
  Brain,
  Users,
  Briefcase,
  MessageSquare,
  MapPin,
  Zap,
  CheckCircle2,
  X,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "MRKT Connect — The AI Marketing Operating System" },
      {
        name: "description",
        content:
          "One platform for creators and businesses. AI-powered matching, global creator discovery, content planning, and campaign management — all in one workspace.",
      },
      {
        property: "og:title",
        content: "MRKT Connect — The AI Marketing Operating System",
      },
      {
        property: "og:description",
        content:
          "MRKT is the AI Marketing OS for creators and businesses. Launch campaigns, discover talent, plan content — all in one place.",
      },
    ],
  }),
  component: ConnectPage,
});

// ─────────────────────────────────────────────────────────────
// Shared surface card styles
// ─────────────────────────────────────────────────────────────
const surface = {
  background: "oklch(1 0 0 / 3%)",
  border: "1px solid oklch(1 0 0 / 8%)",
} as const;

const surfaceElevated = {
  background: "oklch(1 0 0 / 4.5%)",
  border: "1px solid oklch(1 0 0 / 10%)",
} as const;

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  {
    n: "01",
    business: { t: "Create a campaign",     d: "Set your brief, budget, and audience in under two minutes." },
    creator:  { t: "Build your profile",    d: "Connect TikTok & Instagram. Set your niche and rate." },
  },
  {
    n: "02",
    business: { t: "AI matches creators",   d: "A ranked shortlist scored on real engagement data." },
    creator:  { t: "Discover campaigns",    d: "Browse open campaigns that fit your niche and audience." },
  },
  {
    n: "03",
    business: { t: "Review applications",  d: "See who's interested. Compare profiles side by side." },
    creator:  { t: "Apply in seconds",      d: "One tap. No friction. Your profile speaks for itself." },
  },
  {
    n: "04",
    business: { t: "Workspace messaging",  d: "Chat, agree terms, and confirm deliverables in one thread." },
    creator:  { t: "Chat with the brand",  d: "Direct messaging workspace — no email chains." },
  },
  {
    n: "05",
    business: { t: "Track performance",    d: "Live analytics, attribution, and ROI in real time." },
    creator:  { t: "Deliver & track results", d: "Ship content, track performance, build your partnership portfolio." },
  },
];

const GLOBE_MARKERS = [
  { label: "@kenji.builds",    sub: "Tokyo",       x: "74%",  y: "33%", bright: true  },
  { label: "@alessia.studio",  sub: "Paris",       x: "49%",  y: "27%", bright: false },
  { label: "@noa.daily",       sub: "Stockholm",   x: "52%",  y: "20%", bright: false },
  { label: "@maya.creates",    sub: "New York",    x: "24%",  y: "34%", bright: true  },
  { label: "@lucas.art",       sub: "São Paulo",   x: "29%",  y: "61%", bright: false },
  { label: "@seo.studio",      sub: "Seoul",       x: "78%",  y: "28%", bright: false },
  { label: "@amara.life",      sub: "Lagos",       x: "49%",  y: "53%", bright: false },
  { label: "@zara.digital",    sub: "London",      x: "46%",  y: "23%", bright: false },
];

const PLANNER_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLANNER_CONTENT = [
  { day: 0, type: "Reel",     brand: "Maison Aurum",  color: "oklch(0.65 0.12 30)"  },
  { day: 1, type: "Story",    brand: "Open slot",     color: "oklch(1 0 0 / 12%)"    },
  { day: 2, type: "TikTok",   brand: "Helio Fit",     color: "oklch(0.62 0.14 252)" },
  { day: 3, type: "Reel",     brand: "AI Idea",       color: "oklch(0.68 0.14 152)" },
  { day: 4, type: "Story",    brand: "Noir Devices",  color: "oklch(1 0 0 / 18%)"   },
  { day: 5, type: "TikTok",   brand: "Open slot",     color: "oklch(1 0 0 / 12%)"   },
  { day: 6, type: "Carousel", brand: "Studio 8",      color: "oklch(0.65 0.12 30)"  },
];

const REPLACES = [
  { old: "Cold DMs and email chains",   next: "Structured workspace messaging" },
  { old: "Spreadsheets to track deals", next: "Live campaign dashboard"         },
  { old: "Google Docs for briefs",      next: "AI-generated campaign briefs"   },
  { old: "Manual content scheduling",   next: "AI Content Planner"              },
  { old: "Guessing who fits your brand",next: "AI matching on real data"        },
  { old: "5+ disconnected tools",       next: "One unified workspace"           },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
function ConnectPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Logged-in users get their workspace instead of the info page
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/messages" });
    }
  }, [user, loading, navigate]);

  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-28 px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 50% -5%, oklch(0.17 0 0) 0%, oklch(0 0 0) 58%)",
          }}
        />

        <div className="mx-auto max-w-7xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-8"
            style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 10%)" }}
          >
            <Sparkles className="h-3 w-3" style={{ color: "oklch(1 0 0 / 45%)" }} />
            <span
              className="text-[9px] font-medium uppercase tracking-[0.32em]"
              style={{ color: "oklch(1 0 0 / 42%)" }}
            >
              MRKT Connect
            </span>
          </div>

          <h1
            className="font-display text-[clamp(3rem,7.5vw,6.5rem)] font-bold leading-[1.1] max-w-5xl"
            style={{ letterSpacing: "-0.01em" }}
          >
            The AI marketing<br />
            <span style={{ color: "oklch(1 0 0 / 32%)" }}>operating system.</span>
          </h1>

          <p
            className="mt-7 max-w-xl text-[1.0625rem] font-light leading-[1.8]"
            style={{ color: "oklch(1 0 0 / 44%)" }}
          >
            One platform where businesses launch campaigns, creators find partnerships,
            and content gets made. AI that remembers your brand — so you never start
            from scratch.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm"
            >
              Start as a Business <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/creator-onboarding"
              className="btn-ghost inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm"
            >
              Join as a Creator
            </Link>
          </div>

          {/* Pillars */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Brain,        label: "AI Memory",          sub: "Context-aware AI that learns your brand over time" },
              { icon: Users,        label: "Creator Discovery",  sub: "A global index of vetted TikTok & Instagram creators" },
              { icon: Globe2,       label: "MRKT Globe",         sub: "Search creators by location, city, and country" },
              { icon: CalendarDays, label: "Content Planner",    sub: "Plan and schedule content with AI-generated ideas" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="rounded-2xl p-6" style={surface}>
                <Icon className="h-5 w-5 mb-4" style={{ color: "oklch(1 0 0 / 40%)" }} />
                <div
                  className="font-medium text-sm mb-1.5"
                  style={{ color: "oklch(1 0 0 / 80%)" }}
                >
                  {label}
                </div>
                <div
                  className="text-[0.8rem] leading-relaxed"
                  style={{ color: "oklch(1 0 0 / 38%)" }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 1 — HOW IT WORKS ────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              How it works
            </div>
            <h2
              className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]"
            >
              Two sides.<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>One workflow.</span>
            </h2>
            <p
              className="mt-5 max-w-lg font-light leading-[1.8]"
              style={{ color: "oklch(1 0 0 / 42%)", fontSize: "1.0625rem" }}
            >
              Businesses and creators meet in the middle. Every step — from brief to
              delivery — lives in one connected workspace.
            </p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_56px_1fr] md:grid-cols-[1fr_80px_1fr] gap-x-4 mb-6">
            <div
              className="flex items-center gap-2.5 rounded-2xl px-5 py-3"
              style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <Briefcase className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 38%)" }} />
              <span className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 68%)" }}>
                Business
              </span>
            </div>
            <div />
            <div
              className="flex items-center gap-2.5 rounded-2xl px-5 py-3"
              style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <Users className="h-4 w-4 shrink-0" style={{ color: "oklch(1 0 0 / 38%)" }} />
              <span className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 68%)" }}>
                Creator
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                key={step.n}
                className="grid grid-cols-[1fr_56px_1fr] md:grid-cols-[1fr_80px_1fr] gap-x-4 items-center"
              >
                {/* Business side */}
                <div className="rounded-2xl p-5" style={surface}>
                  <div className="text-sm font-medium mb-1" style={{ color: "oklch(1 0 0 / 78%)" }}>
                    {step.business.t}
                  </div>
                  <div className="text-[0.8rem] leading-relaxed" style={{ color: "oklch(1 0 0 / 40%)" }}>
                    {step.business.d}
                  </div>
                </div>

                {/* Center step number */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: i === 2 ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 3%)",
                      border: `1px solid oklch(1 0 0 / ${i === 2 ? "18" : "9"}%)`,
                      color: i === 2 ? "oklch(1 0 0 / 80%)" : "oklch(1 0 0 / 30%)",
                    }}
                  >
                    {step.n}
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="w-px flex-1"
                      style={{
                        height: "100%",
                        minHeight: "12px",
                        background: "oklch(1 0 0 / 8%)",
                      }}
                    />
                  )}
                </div>

                {/* Creator side */}
                <div className="rounded-2xl p-5" style={surface}>
                  <div className="text-sm font-medium mb-1" style={{ color: "oklch(1 0 0 / 78%)" }}>
                    {step.creator.t}
                  </div>
                  <div className="text-[0.8rem] leading-relaxed" style={{ color: "oklch(1 0 0 / 40%)" }}>
                    {step.creator.d}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Step 3 highlight — "they meet here" */}
          <div
            className="mt-6 rounded-2xl p-5 text-center"
            style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)" }}
          >
            <MessageSquare className="h-4 w-4 mx-auto mb-2" style={{ color: "oklch(1 0 0 / 35%)" }} />
            <p className="text-sm" style={{ color: "oklch(1 0 0 / 45%)" }}>
              Business and creator connect in step 3 — applications, messages, and agreements all in one thread.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 2 — MRKT GLOBE ──────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, oklch(0.12 0.01 240 / 40%) 0%, transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left — text */}
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                MRKT Globe
              </div>
              <h2
                className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]"
              >
                Find creators<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>everywhere.</span>
              </h2>
              <p
                className="mt-6 font-light leading-[1.8]"
                style={{ color: "oklch(1 0 0 / 42%)", fontSize: "1.0625rem" }}
              >
                MRKT Globe is a live, interactive world map of creators. Search by city,
                filter by niche, and build local or international campaigns with precision.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: MapPin,  t: "Search by city or country",      d: "Find creators near a specific location" },
                  { icon: Users,   t: "Filter by niche and audience",   d: "Tech, fashion, food, lifestyle, and more" },
                  { icon: Globe2,  t: "Local and global campaigns",     d: "Run regional or cross-border activations" },
                  { icon: Zap,     t: "Real-time creator profiles",     d: "Live follower counts, engagement rates" },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="flex items-start gap-3.5">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "oklch(1 0 0 / 40%)" }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 75%)" }}>{t}</div>
                      <div className="text-[0.8rem] mt-0.5" style={{ color: "oklch(1 0 0 / 38%)" }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/login"
                className="btn-ghost inline-flex mt-8 h-10 items-center gap-2 rounded-full px-6 text-sm"
              >
                Explore the Globe <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right — Globe mockup */}
            <div className="relative">
              <div
                className="relative rounded-3xl overflow-hidden aspect-square max-w-md mx-auto"
                style={surfaceElevated}
              >
                {/* Globe atmosphere */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 40% 35%, oklch(0.18 0.04 220 / 60%) 0%, oklch(0.08 0.02 240 / 30%) 45%, transparent 70%)",
                  }}
                />
                {/* Globe circle */}
                <div className="absolute inset-8">
                  <svg viewBox="0 0 400 400" className="w-full h-full" style={{ opacity: 0.18 }}>
                    <circle cx="200" cy="200" r="190" stroke="white" strokeWidth="0.8" fill="none" />
                    {/* Latitude lines */}
                    {[60, 100, 140, 200, 260, 300, 340].map((cy) => (
                      <ellipse key={cy} cx="200" cy={cy} rx={Math.sqrt(190 * 190 - Math.pow(cy - 200, 2))} ry="12" stroke="white" strokeWidth="0.5" fill="none" />
                    ))}
                    {/* Longitude lines */}
                    {[0, 40, 80, 120, 160].map((rot) => (
                      <ellipse key={rot} cx="200" cy="200" rx="24" ry="190" stroke="white" strokeWidth="0.5" fill="none" transform={`rotate(${rot} 200 200)`} />
                    ))}
                  </svg>
                </div>

                {/* Location markers */}
                {GLOBE_MARKERS.map((m) => (
                  <div
                    key={m.label}
                    className="absolute"
                    style={{ left: m.x, top: m.y, transform: "translate(-50%, -50%)" }}
                  >
                    {m.bright ? (
                      <div className="relative">
                        <div
                          className="absolute -inset-3 rounded-full"
                          style={{ background: "oklch(0.72 0.14 152 / 15%)" }}
                        />
                        <div
                          className="relative h-2 w-2 rounded-full"
                          style={{ background: "oklch(0.72 0.14 152)" }}
                        />
                        {/* Label */}
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg px-2 py-1"
                          style={{ background: "oklch(0.1 0 0 / 80%)", border: "1px solid oklch(1 0 0 / 12%)" }}
                        >
                          <div className="text-[9px] font-medium" style={{ color: "oklch(1 0 0 / 78%)" }}>{m.label}</div>
                          <div className="text-[8px]" style={{ color: "oklch(1 0 0 / 38%)" }}>{m.sub}</div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "oklch(1 0 0 / 35%)" }}
                      />
                    )}
                  </div>
                ))}

                {/* Bottom overlay label */}
                <div
                  className="absolute bottom-5 left-5 right-5 rounded-xl p-3.5"
                  style={{ background: "oklch(0.07 0 0 / 80%)", border: "1px solid oklch(1 0 0 / 10%)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="text-[9px] uppercase tracking-[0.24em] font-medium"
                        style={{ color: "oklch(1 0 0 / 30%)" }}
                      >
                        Creators on the Globe
                      </div>
                      <div
                        className="font-display text-xl font-semibold mt-0.5"
                        style={{ color: "oklch(1 0 0 / 88%)" }}
                      >
                        124 cities
                      </div>
                    </div>
                    <Globe2 className="h-5 w-5" style={{ color: "oklch(1 0 0 / 28%)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — CONTENT PLANNER ─────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left — Planner mockup */}
            <div className="order-2 md:order-1">
              <div className="rounded-3xl overflow-hidden" style={surfaceElevated}>
                {/* Header */}
                <div
                  className="px-6 py-5 flex items-center justify-between"
                  style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
                >
                  <div>
                    <div
                      className="text-[9.5px] uppercase tracking-[0.28em] font-medium"
                      style={{ color: "oklch(1 0 0 / 28%)" }}
                    >
                      Content Planner
                    </div>
                    <div
                      className="font-display text-lg font-semibold mt-0.5"
                      style={{ color: "oklch(1 0 0 / 86%)" }}
                    >
                      June 2026
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {["Month", "Week"].map((v, i) => (
                      <span
                        key={v}
                        className="text-[10.5px] rounded-full px-3 py-1"
                        style={{
                          background: i === 1 ? "oklch(1 0 0 / 8%)" : "transparent",
                          border: "1px solid oklch(1 0 0 / 8%)",
                          color: i === 1 ? "oklch(1 0 0 / 72%)" : "oklch(1 0 0 / 30%)",
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 px-4 pt-4">
                  {PLANNER_DAYS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[9.5px] uppercase tracking-[0.18em] pb-3"
                      style={{ color: "oklch(1 0 0 / 28%)" }}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Content slots */}
                <div className="grid grid-cols-7 gap-2 px-4 pb-6">
                  {PLANNER_CONTENT.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-2.5 min-h-[72px] flex flex-col justify-between"
                      style={{ background: item.color + (item.brand === "Open slot" ? "" : " / 14%"), border: `1px solid ${item.color}${item.brand === "Open slot" ? "" : " / 22%"}` }}
                    >
                      <div
                        className="text-[8.5px] font-semibold uppercase tracking-[0.16em]"
                        style={{ color: item.brand === "Open slot" ? "oklch(1 0 0 / 20%)" : "oklch(1 0 0 / 65%)" }}
                      >
                        {item.type}
                      </div>
                      <div
                        className="text-[8px] leading-snug mt-1"
                        style={{ color: item.brand === "Open slot" ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 48%)" }}
                      >
                        {item.brand}
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI suggestion row */}
                <div
                  className="mx-4 mb-4 rounded-xl p-4 flex items-center gap-3"
                  style={{ background: "oklch(0.68 0.14 152 / 8%)", border: "1px solid oklch(0.68 0.14 152 / 20%)" }}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.72 0.14 152)" }} />
                  <p className="text-[0.8rem]" style={{ color: "oklch(1 0 0 / 55%)" }}>
                    <span style={{ color: "oklch(0.72 0.14 152)" }}>AI suggestion:</span>{" "}
                    You have 2 open slots this week — post a behind-the-scenes Story on Tuesday.
                  </p>
                </div>
              </div>
            </div>

            {/* Right — text */}
            <div className="order-1 md:order-2">
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                Content Planner
              </div>
              <h2
                className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]"
              >
                Plan content<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>that performs.</span>
              </h2>
              <p
                className="mt-6 font-light leading-[1.8]"
                style={{ color: "oklch(1 0 0 / 42%)", fontSize: "1.0625rem" }}
              >
                The Content Planner gives creators and businesses a shared calendar for
                campaigns, deliverables, and original content — with AI filling in the
                gaps with ideas.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: CalendarDays, t: "Monthly, weekly, and daily views",   d: "Switch between timeframes to plan at every scale" },
                  { icon: Sparkles,     t: "AI-generated content ideas",          d: "Never stare at a blank calendar again" },
                  { icon: Briefcase,    t: "Campaign deliverables built in",      d: "Brand deadlines appear automatically in your calendar" },
                  { icon: BarChart3,    t: "Performance-linked scheduling",       d: "Schedule on your best-performing days and times" },
                ].map(({ icon: Icon, t, d }) => (
                  <div key={t} className="flex items-start gap-3.5">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: "oklch(1 0 0 / 40%)" }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 75%)" }}>{t}</div>
                      <div className="text-[0.8rem] mt-0.5" style={{ color: "oklch(1 0 0 / 38%)" }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/login"
                className="btn-ghost inline-flex mt-8 h-10 items-center gap-2 rounded-full px-6 text-sm"
              >
                Open Content Planner <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — WHY MRKT ────────────────────────────────── */}
      <section className="relative px-6 py-28 hairline-t">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 50% 50%, oklch(0.10 0 0) 0%, transparent 65%)",
          }}
        />
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] font-medium mb-4"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              Why MRKT
            </div>
            <h2
              className="font-display text-4xl md:text-[3.5rem] font-bold tracking-[-0.04em] leading-[1.07]"
            >
              Replace the chaos.<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>Own the workflow.</span>
            </h2>
            <p
              className="mt-5 max-w-lg mx-auto font-light leading-[1.8]"
              style={{ color: "oklch(1 0 0 / 42%)", fontSize: "1.0625rem" }}
            >
              Most brands and creators are still managing influencer marketing through
              DMs, spreadsheets, and five different tools. MRKT replaces all of it.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden" style={surfaceElevated}>
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_1fr] px-6 py-4"
              style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}
            >
              <div className="flex items-center gap-2">
                <X className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.15 20)" }} />
                <span
                  className="text-[10px] uppercase tracking-[0.25em] font-medium"
                  style={{ color: "oklch(1 0 0 / 30%)" }}
                >
                  Without MRKT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.14 152)" }} />
                <span
                  className="text-[10px] uppercase tracking-[0.25em] font-medium"
                  style={{ color: "oklch(1 0 0 / 30%)" }}
                >
                  With MRKT
                </span>
              </div>
            </div>

            {/* Rows */}
            {REPLACES.map((r, i) => (
              <div
                key={r.old}
                className="grid grid-cols-[1fr_1fr] px-6 py-4"
                style={{
                  borderBottom: i < REPLACES.length - 1 ? "1px solid oklch(1 0 0 / 5%)" : "none",
                  background: i % 2 === 0 ? "transparent" : "oklch(1 0 0 / 1.5%)",
                }}
              >
                <div className="flex items-center gap-2.5 pr-4">
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: "oklch(0.65 0.15 20 / 50%)" }}
                  />
                  <span className="text-sm" style={{ color: "oklch(1 0 0 / 38%)" }}>
                    {r.old}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: "oklch(0.72 0.14 152 / 60%)" }}
                  />
                  <span className="text-sm font-medium" style={{ color: "oklch(1 0 0 / 72%)" }}>
                    {r.next}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="relative px-6 py-40 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-bold leading-[1.1]"
            style={{ letterSpacing: "-0.02em" }}
          >
            The operating system<br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>for modern marketing.</span>
          </h2>
          <p
            className="mt-6 font-light max-w-sm mx-auto leading-relaxed"
            style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
          >
            Businesses and creators on one platform. AI that works for both sides.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm"
            >
              Get started free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/creator-onboarding"
              className="btn-ghost inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm"
            >
              Create Creator Profile
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
