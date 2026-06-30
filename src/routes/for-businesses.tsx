import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, CalendarDays,
  Users, BarChart3, Zap, Target,
  Layers, Search,
} from "lucide-react";

export const Route = createFileRoute("/for-businesses")({
  head: () => ({
    meta: [
      { title: "MRKT for Businesses — From campaign brief to delivered content." },
      { name: "description", content: "Plan campaigns with AI, discover creators, manage collaborations, and measure results — from one platform built for brands in MENA." },
      { property: "og:title", content: "MRKT for Businesses" },
    ],
  }),
  component: ForBusinessesPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const EYEBROW = "text-[9.5px] uppercase tracking-[0.35em] font-semibold";
const eyebrowStyle = { color: "oklch(1 0 0 / 28%)" };
const bodyStyle    = { color: "oklch(1 0 0 / 46%)" };
const cardStyle    = { background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" };

// ─── Campaign journey visualization ──────────────────────────────────────────
function CampaignJourneyMockup() {
  const stages = [
    { label: "Brief",      sub: "AI-drafted in 30s",  color: "oklch(0.72 0.10 224)", active: true  },
    { label: "Creators",   sub: "AI-matched",          color: "oklch(0.72 0.10 224)", active: true  },
    { label: "Outreach",   sub: "Personalised AI DMs", color: "oklch(0.72 0.10 224)", active: true  },
    { label: "Live",       sub: "Deliverables tracked",color: "oklch(0.62 0.12 158)", active: true  },
    { label: "Results",    sub: "Analytics + repeat",  color: "oklch(1 0 0 / 24%)",   active: false },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)", boxShadow: "0 32px 80px -20px oklch(0 0 0 / 55%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.10 224)" }} />
          <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>Campaign</span>
        </div>
        <span className="text-[9px] font-medium rounded-full px-2.5 py-0.5" style={{ background: "oklch(0.62 0.12 158 / 12%)", color: "oklch(0.62 0.12 158)" }}>Live</span>
      </div>

      {/* Campaign stages */}
      <div className="p-4">
        <div className="flex items-center gap-0 mb-4">
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-center flex-1">
              <div className="flex-1">
                <div className="text-[10px] font-medium text-center mb-1.5" style={{ color: s.active ? "oklch(1 0 0 / 72%)" : "oklch(1 0 0 / 24%)" }}>{s.label}</div>
                <div className="h-[3px] rounded-full" style={{ background: s.active ? s.color : "oklch(1 0 0 / 8%)" }} />
                <div className="text-[8.5px] text-center mt-1.5" style={{ color: "oklch(1 0 0 / 28%)" }}>{s.sub}</div>
              </div>
              {i < stages.length - 1 && <div className="w-1" />}
            </div>
          ))}
        </div>

        {/* Creator pipeline */}
        <div className="space-y-2 mt-3">
          {[
            { init: "S", name: "Sara Al-Khatib",  niche: "Fashion · UAE",  stage: "Live",       stageColor: "oklch(0.62 0.12 158)" },
            { init: "M", name: "Mohamad Fakhoury", niche: "Lifestyle · LB", stage: "Negotiating",stageColor: "oklch(0.78 0.14 60)"  },
            { init: "L", name: "Layla Mansouri",   niche: "Beauty · KSA",   stage: "Contacted",  stageColor: "oklch(0.72 0.10 224)" },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: "oklch(0.22 0 0)", color: "oklch(0.8 0 0)" }}>{c.init}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate" style={{ color: "oklch(1 0 0 / 80%)" }}>{c.name}</div>
                <div className="text-[10px]" style={{ color: "oklch(1 0 0 / 34%)" }}>{c.niche}</div>
              </div>
              <span className="text-[9px] font-medium rounded-full px-2 py-0.5 shrink-0" style={{ color: c.stageColor, background: `${c.stageColor.replace(")", " / 12%)")}` }}>{c.stage}</span>
            </div>
          ))}
        </div>

        {/* AI insight */}
        <div className="mt-3 rounded-xl p-3.5" style={{ background: "oklch(0.72 0.10 224 / 6%)", border: "1px solid oklch(0.72 0.10 224 / 14%)" }}>
          <span className="text-[11px]" style={{ color: "oklch(0.72 0.10 224)" }}>AI: </span>
          <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 50%)" }}>Add 2 more UAE fashion creators to improve your Ramadan campaign reach by an estimated 340K.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign journey steps ───────────────────────────────────────────────────
const JOURNEY = [
  { n: "01", icon: Sparkles, title: "Brief with AI",         desc: "Tell MRKT your goal, product, and market. The AI Strategist drafts your full campaign brief — objectives, target audience, channel plan, and timeline — in 30 seconds." },
  { n: "02", icon: Search,   title: "Discover creators",     desc: "MRKT finds creators by niche, location, engagement, and audience fit. AI ranks them by predicted campaign performance — not just follower count." },
  { n: "03", icon: Users,    title: "Invite and negotiate",  desc: "Invite creators directly. Receive applications. Negotiate rates and deliverables inside the platform — no DMs, no email chains." },
  { n: "04", icon: Target,   title: "Launch and track",      desc: "Manage deliverables, review content, and approve posts from one dashboard. The Pipeline tracks every creator's status in real time." },
  { n: "05", icon: BarChart3, title: "Measure and grow",    desc: "See reach, engagement, and campaign ROI. MRKT learns from your results and improves matching for every campaign you run." },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Sparkles,    label: "AI Strategist",       desc: "Campaign briefs, content plans, channel strategy, and outreach messages — in seconds." },
  { Icon: Search,      label: "Creator Discovery",   desc: "AI-matched by niche, location, audience, and campaign history across MENA." },
  { Icon: Layers,      label: "Pipeline",            desc: "Manage every creator from discovery to delivery. Full transparency at every stage." },
  { Icon: CalendarDays,label: "Content Calendar",    desc: "See all campaign content, posting schedules, and deadlines in one view." },
  { Icon: Target,      label: "Campaign Management", desc: "Build briefs, manage deliverables, and approve content — all in one workspace." },
  { Icon: BarChart3,   label: "Analytics",           desc: "Reach, engagement, and ROI tracking across every campaign and creator." },
  { Icon: Zap,         label: "Growth recommendations", desc: "AI tells you what's working, which creators drive results, and what to do next." },
  { Icon: Users,       label: "MRKT Globe",          desc: "Discover creators traveling to your market. Invite them before your competitors." },
];

// ─── Business types ───────────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { name: "Fashion brands",      desc: "Editorial drops and product launches with fashion creators matched by aesthetic and audience — not just reach." },
  { name: "Restaurants & F&B",   desc: "Launch seasonal menus, opening campaigns, and Ramadan activations with creators your customers already trust." },
  { name: "E-commerce brands",   desc: "Scale product seeding, reviews, and UGC with a managed creator network across the region." },
  { name: "Gyms & fitness",      desc: "Drive sign-ups through health creators with audiences in your city — matching by location and offer." },
  { name: "Startups",            desc: "Reach early adopters fast. TikTok and Instagram campaigns built for MENA's fastest-growing categories." },
  { name: "Hospitality",         desc: "Hotels, resorts, and tourism brands — connect with travel creators across UAE, Jordan, and Egypt." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function ForBusinessesPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -6%, oklch(0.15 0 0) 0%, oklch(0 0 0) 60%)" }}
        />

        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-9"
                style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 9%)" }}
              >
                <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.72 0.10 224)" }} />
                <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>For Businesses</span>
              </div>

              <h1 className="font-display text-[clamp(2.75rem,6vw,5.25rem)] font-bold tracking-[-0.048em] leading-[0.96]">
                From brief
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>to final delivery.</span>
              </h1>

              <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-md" style={bodyStyle}>
                Plan campaigns with AI, discover the right creators, manage collaborations,
                and measure results — all in one platform built for brands in MENA.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
                >
                  {user ? "Open workspace" : "Start for free"} <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to={user ? "/find-creators" : "/for-creators"}
                  className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 h-12 text-sm"
                >
                  {user ? "Find creators" : "For creators"}
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                {["Free during beta", "English + Arabic", "MENA creator network"].map((t) => (
                  <span key={t} className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 30%)" }}>{t}</span>
                ))}
              </div>
            </div>
            <CampaignJourneyMockup />
          </div>
        </div>
      </section>

      {/* ══ CAMPAIGN JOURNEY ═════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>The campaign journey</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              One platform.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Every stage.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light max-w-lg mx-auto" style={bodyStyle}>
              MRKT takes your campaign from an idea to a measurable result — with AI handling
              the strategy and your team managing the relationships.
            </p>
          </div>

          <div className="space-y-3">
            {JOURNEY.map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="flex items-start gap-6 rounded-2xl p-6" style={cardStyle}>
                <div className={`${EYEBROW} text-[8.5px] shrink-0 w-6 mt-0.5`} style={eyebrowStyle}>{n}</div>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 9%)" }}>
                  <Icon className="h-4 w-4" style={{ color: "oklch(1 0 0 / 44%)" }} />
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold mb-1.5" style={{ color: "oklch(1 0 0 / 82%)" }}>{title}</div>
                  <p className="text-[13px] leading-relaxed" style={bodyStyle}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ AI STRATEGIST ════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.06 0 0)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className={EYEBROW} style={eyebrowStyle}>AI Strategist</div>
                <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                  Your marketing team.
                  <br />
                  <span style={{ color: "oklch(1 0 0 / 32%)" }}>On demand.</span>
                </h2>
                <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                  Ask MRKT to build campaign plans, write briefs, generate outreach messages,
                  and recommend creators — all based on your specific brand, market, and goals.
                  Structured, actionable strategy in seconds.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Campaign brief in 30 seconds",
                    "Creator outreach messages — personalized per creator",
                    "Channel strategy with timing recommendations",
                    "Ramadan, Eid, and MENA event hooks built in",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[13px]" style={{ color: "oklch(1 0 0 / 50%)" }}>
                      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: "oklch(0.72 0.10 224)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI chat mockup */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.10 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}>
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.07 0 0)" }}>
                  <Sparkles className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.10 224)" }} />
                  <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>AI Strategist</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-[14px] rounded-br-[4px] px-3.5 py-2.5 text-[11.5px] leading-relaxed" style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 70%)" }}>
                      Draft a Ramadan campaign brief for our fashion line targeting UAE women.
                    </div>
                  </div>
                  {[
                    { label: "Objective", text: "Drive awareness and conversions for the Ramadan 2026 collection among UAE women 18–35." },
                    { label: "Creators",  text: "4–6 UAE-based modest fashion creators with 30K–300K followers. Arabic-speaking audience preferred." },
                    { label: "Timeline",  text: "Teaser March 18 → Collection reveal March 24 → Offer push April 1 → UGC phase through April 10." },
                  ].map((r) => (
                    <div key={r.label} className="rounded-xl px-3.5 py-3 text-[11.5px] leading-[1.65]" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                      <span className="text-[8px] uppercase tracking-[0.22em] font-semibold block mb-1" style={{ color: "oklch(0.72 0.10 224 / 70%)" }}>{r.label}</span>
                      <span style={{ color: "oklch(1 0 0 / 62%)" }}>{r.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ BUILT FOR YOUR BUSINESS ══════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-16 items-start">
          <div>
            <div className={EYEBROW} style={eyebrowStyle}>Every type of brand</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              Built for how
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>you actually market.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
              MRKT is not an enterprise tool. It's a platform for brands that need to move
              fast, work directly with creators, and get real results in MENA.
            </p>
          </div>
          <div className="space-y-2.5">
            {BUSINESS_TYPES.map((b) => (
              <div key={b.name} className="rounded-2xl p-5" style={cardStyle}>
                <div className="text-[13.5px] font-semibold mb-1" style={{ color: "oklch(1 0 0 / 80%)" }}>{b.name}</div>
                <div className="text-[12px] leading-relaxed" style={bodyStyle}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURE GRID ═════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>Everything you need</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              One workspace.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Full control.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map(({ Icon, label, desc }) => (
              <div key={label} className="rounded-2xl p-5" style={cardStyle}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-4" style={{ background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                  <Icon className="h-4 w-4" style={{ color: "oklch(1 0 0 / 48%)" }} />
                </div>
                <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: "oklch(1 0 0 / 82%)" }}>{label}</div>
                <p className="text-[11.5px] leading-relaxed" style={bodyStyle}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-bold tracking-[-0.048em] leading-[0.96]">
            {user ? "Your workspace is ready." : "Marketing that actually performs."}
          </h2>
          <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-sm mx-auto" style={bodyStyle}>
            {user
              ? "Campaigns, creators, and analytics are waiting inside."
              : "Join brands running smarter creator campaigns in MENA. Free during beta."}
          </p>
          <Link
            to={user ? "/chat" : "/login"}
            className="btn-primary mt-9 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-medium"
          >
            {user ? "Open workspace" : "Start for free"} <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
