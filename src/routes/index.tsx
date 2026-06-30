import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, CalendarDays, Globe2,
  Zap, Users, BarChart3, ShieldCheck, Megaphone,
  TrendingUp, FileText, MapPin, Layers,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MRKT — Creator Collaboration Operating System" },
      { name: "description", content: "MRKT helps creators and businesses discover opportunities, manage collaborations, plan content, use AI strategically, and grow faster. Built for MENA." },
      { property: "og:title", content: "MRKT — Creator Collaboration Operating System" },
      { property: "og:description", content: "From first brief to final delivery. One operating system for creators and businesses in MENA." },
    ],
  }),
  component: Landing,
});

// ─── Shared design helpers ────────────────────────────────────────────────────

const EYEBROW = "text-[9.5px] uppercase tracking-[0.35em] font-semibold";
const eyebrowStyle = { color: "oklch(1 0 0 / 28%)" };
const fadeStyle    = { color: "oklch(1 0 0 / 32%)" };
const bodyStyle    = { color: "oklch(1 0 0 / 46%)" };
const cardStyle    = { background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" };
const raisedStyle  = { background: "oklch(1 0 0 / 4%)",   border: "1px solid oklch(1 0 0 / 10%)" };

// ─── Problem section — broken infrastructure tools ────────────────────────────

const CREATOR_TOOLS = ["WhatsApp", "Google Docs", "Notes", "Email threads", "Instagram DMs", "Spreadsheets"];
const BUSINESS_TOOLS = ["Excel", "Agency emails", "Random lists", "WhatsApp groups", "PDF decks", "Separate invoices"];

// ─── OS node flow ─────────────────────────────────────────────────────────────

const OS_NODES = [
  { label: "Creator",      sub: "Profile + Trust",     color: "oklch(0.72 0.10 224)" },
  { label: "Opportunity",  sub: "AI-matched briefs",   color: "oklch(0.62 0.12 158)" },
  { label: "Campaign",     sub: "Brief → contract",    color: "oklch(0.72 0.10 224)" },
  { label: "AI Strategist",sub: "Strategy + content",  color: "oklch(0.78 0.14 60)"  },
  { label: "Studio",       sub: "Assets + production", color: "oklch(0.72 0.10 224)" },
  { label: "Deliverables", sub: "Review + approval",   color: "oklch(0.62 0.12 158)" },
  { label: "Growth",       sub: "Analytics + repeat",  color: "oklch(0.72 0.10 224)" },
];

// ─── AI capabilities ──────────────────────────────────────────────────────────

const AI_CAPS = [
  { icon: Megaphone,   label: "Campaign strategy",       desc: "Full briefs, channel plans, and creator recommendations — in seconds." },
  { icon: TrendingUp,  label: "Growth recommendations",  desc: "Visibility scores, profile improvements, and audience-building actions." },
  { icon: Zap,         label: "Opportunity guidance",    desc: "Match analysis, application drafts, and fit explanations." },
  { icon: Users,       label: "Creator recommendations", desc: "AI-ranked suggestions based on niche, audience, and campaign history." },
  { icon: CalendarDays,label: "Calendar intelligence",   desc: "Optimal posting times, MENA event hooks, trend-aligned scheduling." },
  { icon: BarChart3,   label: "Business planning",       desc: "Market analysis, budget allocation, and performance forecasting." },
];

// ─── MENA countries ───────────────────────────────────────────────────────────

const MENA_MARKETS = [
  { name: "UAE",          flag: "🇦🇪" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Lebanon",      flag: "🇱🇧" },
  { name: "Qatar",        flag: "🇶🇦" },
  { name: "Kuwait",       flag: "🇰🇼" },
  { name: "Bahrain",      flag: "🇧🇭" },
  { name: "Jordan",       flag: "🇯🇴" },
  { name: "Egypt",        flag: "🇪🇬" },
];

// ─── AI chat mockup ───────────────────────────────────────────────────────────

function AIChatMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)", boxShadow: "0 32px 80px -20px oklch(0 0 0 / 60%)" }}
    >
      {/* Topbar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <Sparkles className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.10 224)" }} />
        <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>MRKT AI</span>
        <span className="ml-auto text-[9px] rounded-full px-2 py-0.5 font-medium" style={{ background: "oklch(0.72 0.10 224 / 12%)", color: "oklch(0.72 0.10 224)" }}>
          Active
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* User message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-[14px] rounded-br-[4px] px-4 py-3 text-[12px] leading-relaxed" style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 75%)" }}>
            Build a campaign strategy for our Ramadan launch in UAE — fashion brand, IG + TikTok.
          </div>
        </div>

        {/* AI response */}
        <div className="space-y-2">
          {[
            { label: "Strategy",  text: "Lead with aspirational styling content 10 days before Ramadan, transition to offer-driven reels in the final week. UAE audiences peak 8–10 PM during Ramadan evenings." },
            { label: "Creators",  text: "Target 3–5 UAE-based modest fashion creators with 50K–500K followers. Prioritise creators with >4.5% engagement and Arabic-speaking audiences." },
            { label: "Timeline",  text: "Teasers from March 18 → Product reveal March 25 → Offer push April 1 → Community UGC through April 10." },
          ].map((r) => (
            <div key={r.label} className="rounded-xl px-4 py-3 text-[12px] leading-[1.65]" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <span className="text-[8.5px] uppercase tracking-[0.24em] font-semibold block mb-1" style={{ color: "oklch(0.72 0.10 224 / 80%)" }}>{r.label}</span>
              <span style={{ color: "oklch(1 0 0 / 65%)" }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Growth hub mockup ────────────────────────────────────────────────────────

function GrowthMockup() {
  const bars = [
    { label: "Profile strength",  pct: 78, color: "oklch(0.72 0.10 224)" },
    { label: "Niche clarity",     pct: 91, color: "oklch(0.62 0.12 158)" },
    { label: "Match readiness",   pct: 65, color: "oklch(0.78 0.14 60)"  },
    { label: "Visibility score",  pct: 54, color: "oklch(0.72 0.10 224)" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" style={{ color: "oklch(0.62 0.12 158)" }} />
          <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>Growth Hub</span>
        </div>
        <span className="text-[9px] font-medium rounded-full px-2 py-0.5" style={{ background: "oklch(0.62 0.12 158 / 12%)", color: "oklch(0.62 0.12 158)" }}>
          Score: 72 / 100
        </span>
      </div>
      <div className="p-4 space-y-3.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 55%)" }}>{b.label}</span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: b.color }}>{b.pct}%</span>
            </div>
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.pct}%`, background: b.color }} />
            </div>
          </div>
        ))}
        <div className="mt-4 p-3 rounded-xl text-[11px] leading-relaxed" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <span className="font-semibold block mb-0.5" style={{ color: "oklch(0.72 0.10 224)" }}>AI recommendation</span>
          <span style={{ color: "oklch(1 0 0 / 50%)" }}>Add your TikTok engagement rate to unlock 14 more campaign matches this week.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar mockup ──────────────────────────────────────────────────────────

function CalendarMockup() {
  const days = [
    { d: "Sat", n: "1",  post: null,              time: null,         dot: null                      },
    { d: "Sun", n: "2",  post: "Instagram Reel",  time: "8:00 PM",    dot: "oklch(0.72 0.10 224)"    },
    { d: "Mon", n: "3",  post: "TikTok",          time: "9:30 PM",    dot: "oklch(0.62 0.12 158)"    },
    { d: "Tue", n: "4",  post: null,              time: null,         dot: null                      },
    { d: "Wed", n: "5",  post: "YouTube Short",   time: "7:00 PM",    dot: "oklch(0.78 0.14 60)"     },
    { d: "Thu", n: "6",  post: "Carousel",        time: "8:00 PM",    dot: "oklch(0.72 0.10 224)"    },
    { d: "Fri", n: "7",  post: null,              time: null,         dot: null                      },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" style={{ color: "oklch(0.78 0.14 60)" }} />
          <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>Content Calendar</span>
        </div>
        <span className="text-[9px] font-medium" style={{ color: "oklch(1 0 0 / 28%)" }}>Ramadan 2026</span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <div key={day.d} className="flex flex-col items-center">
              <div className="text-[8.5px] mb-1.5" style={{ color: "oklch(1 0 0 / 26%)" }}>{day.d}</div>
              <div
                className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 relative"
                style={{
                  background: day.post ? "oklch(1 0 0 / 5%)" : "oklch(1 0 0 / 2%)",
                  border: day.post ? "1px solid oklch(1 0 0 / 10%)" : "1px solid oklch(1 0 0 / 5%)",
                }}
              >
                <span className="text-[10px] font-semibold" style={{ color: day.post ? "oklch(1 0 0 / 80%)" : "oklch(1 0 0 / 28%)" }}>{day.n}</span>
                {day.dot && (
                  <span className="h-[5px] w-[5px] rounded-full absolute bottom-1.5" style={{ background: day.dot }} />
                )}
              </div>
              {day.post && (
                <div className="mt-1 text-[7.5px] text-center leading-tight px-0.5" style={{ color: "oklch(1 0 0 / 34%)" }}>{day.time}</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 p-2.5 rounded-xl text-[10.5px]" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <span style={{ color: "oklch(0.78 0.14 60)" }}>AI insight: </span>
          <span style={{ color: "oklch(1 0 0 / 46%)" }}>UAE audiences are most active 8–10 PM during Ramadan. Scheduled accordingly.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline mockup ──────────────────────────────────────────────────────────

function PipelineMockup() {
  const stages = [
    { label: "Discovered", count: 12, color: "oklch(1 0 0 / 28%)" },
    { label: "Contacted",  count: 5,  color: "oklch(0.72 0.10 224)" },
    { label: "Negotiating",count: 3,  color: "oklch(0.78 0.14 60)"  },
    { label: "Booked",     count: 2,  color: "oklch(0.62 0.12 158)" },
  ];
  const creators = [
    { init: "S", name: "Sara Al-Khatib",  niche: "Fashion · UAE",    bg: "oklch(0.72 0.09 20)",  stage: "Contacted" },
    { init: "M", name: "Mohamad Fakhoury",niche: "Lifestyle · LB",   bg: "oklch(0.62 0.08 250)", stage: "Negotiating" },
    { init: "L", name: "Layla Mansouri",  niche: "Beauty · KSA",     bg: "oklch(0.66 0.09 160)", stage: "Booked" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.10 224)" }} />
          <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>Pipeline</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-4 gap-1 mb-3">
          {stages.map((s) => (
            <div key={s.label} className="rounded-lg px-2 py-2 text-center" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
              <div className="text-[14px] font-bold tabular-nums" style={{ color: s.color }}>{s.count}</div>
              <div className="text-[8px] mt-0.5" style={{ color: "oklch(1 0 0 / 28%)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        {creators.map((c) => (
          <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
            <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold" style={{ background: c.bg, color: "oklch(0.1 0 0)" }}>{c.init}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: "oklch(1 0 0 / 80%)" }}>{c.name}</div>
              <div className="text-[10px]" style={{ color: "oklch(1 0 0 / 34%)" }}>{c.niche}</div>
            </div>
            <span className="text-[9px] font-medium rounded-full px-2 py-0.5" style={{ color: c.stage === "Booked" ? "oklch(0.62 0.12 158)" : c.stage === "Negotiating" ? "oklch(0.78 0.14 60)" : "oklch(0.72 0.10 224)", background: c.stage === "Booked" ? "oklch(0.62 0.12 158 / 12%)" : c.stage === "Negotiating" ? "oklch(0.78 0.14 60 / 12%)" : "oklch(0.72 0.10 224 / 12%)" }}>
              {c.stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OS Node ──────────────────────────────────────────────────────────────────

function OSNode({ label, sub, color, isLast }: { label: string; sub: string; color: string; isLast?: boolean }) {
  return (
    <div className="flex items-center gap-3 flex-col sm:flex-row">
      <div className="flex flex-col items-center sm:items-start">
        <div
          className="rounded-2xl px-4 py-3 min-w-[120px] text-center sm:text-left"
          style={{ background: "oklch(1 0 0 / 3.5%)", border: `1px solid ${color}33` }}
        >
          <div className="text-[13px] font-semibold" style={{ color: "oklch(1 0 0 / 85%)" }}>{label}</div>
          <div className="text-[10.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 36%)" }}>{sub}</div>
        </div>
      </div>
      {!isLast && (
        <div className="h-8 w-px sm:h-px sm:w-8 shrink-0" style={{ background: `linear-gradient(${color}55, ${color}11)` }} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/home" });
  }, [user, navigate]);

  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ══ 01 HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-28 px-6 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 70% 45% at 50% -6%, oklch(0.14 0 0) 0%, oklch(0 0 0) 62%)" }}
        />

        <div className="mx-auto max-w-5xl text-center">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 mb-10"
            style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 9%)" }}
          >
            <span className="h-[5px] w-[5px] rounded-full animate-pulse" style={{ background: "oklch(0.72 0.10 224)" }} />
            <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>
              Creator Collaboration OS · Now in Beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-[clamp(3rem,8vw,6.5rem)] font-bold tracking-[-0.048em] leading-[0.94]">
            Your Creator Business.
            <br />
            <span style={fadeStyle}>One Operating System.</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-8 mx-auto max-w-[34rem] text-[1.125rem] leading-[1.82] font-light" style={bodyStyle}>
            MRKT helps creators and businesses discover opportunities, manage collaborations,
            plan content, use AI strategically, and grow faster — all in one workspace.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-9 h-13 text-[0.9375rem] font-medium"
            >
              Get started — free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/for-creators"
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 h-13 text-sm"
            >
              For creators
            </Link>
            <Link
              to="/for-businesses"
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 h-13 text-sm"
            >
              For businesses
            </Link>
          </div>

          {/* Proof line */}
          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
            {[
              "Free during beta",
              "English + Arabic (RTL)",
              "Built for MENA",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: "oklch(0.62 0.12 158)" }} />
                <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 36%)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 02 THE PROBLEM ═══════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className={EYEBROW} style={eyebrowStyle}>The problem</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.75rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              Creator collaborations run on
              <br />
              <span style={fadeStyle}>broken infrastructure.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] font-light max-w-xl mx-auto" style={bodyStyle}>
              Today, creators use WhatsApp for deals, Google Docs for briefs, spreadsheets for tracking,
              and DMs for everything else. Businesses aren't better — agencies, email chains, and random
              lists held together by luck. Everything is fragmented.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Creator side */}
            <div className="rounded-2xl p-6 md:p-8" style={cardStyle}>
              <div className={`${EYEBROW} text-[9px] mb-5`} style={eyebrowStyle}>Creators today</div>
              <div className="grid grid-cols-2 gap-2">
                {CREATOR_TOOLS.map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
                  >
                    <span className="h-[3px] w-[3px] rounded-full shrink-0" style={{ background: "oklch(0.52 0.15 24 / 60%)" }} />
                    <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 44%)" }}>{t}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-relaxed" style={{ color: "oklch(1 0 0 / 36%)" }}>
                6 tools. No single source of truth. Deals fall through. Growth is guesswork.
              </p>
            </div>

            {/* Business side */}
            <div className="rounded-2xl p-6 md:p-8" style={cardStyle}>
              <div className={`${EYEBROW} text-[9px] mb-5`} style={eyebrowStyle}>Businesses today</div>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESS_TOOLS.map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
                  >
                    <span className="h-[3px] w-[3px] rounded-full shrink-0" style={{ background: "oklch(0.52 0.15 24 / 60%)" }} />
                    <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 44%)" }}>{t}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-relaxed" style={{ color: "oklch(1 0 0 / 36%)" }}>
                Campaigns launched by spreadsheet. Results impossible to measure. Relationships forgotten.
              </p>
            </div>
          </div>

          {/* Connector */}
          <div className="mt-8 rounded-2xl p-6 md:p-8 text-center" style={{ background: "oklch(0.72 0.10 224 / 6%)", border: "1px solid oklch(0.72 0.10 224 / 18%)" }}>
            <div className="text-[1.125rem] font-semibold mb-2" style={{ color: "oklch(1 0 0 / 88%)" }}>MRKT brings it all together.</div>
            <p className="text-[13.5px] font-light" style={{ color: "oklch(1 0 0 / 44%)" }}>
              One workspace. Every tool. Intelligent by default.
            </p>
          </div>
        </div>
      </section>

      {/* ══ 03 THE OPERATING SYSTEM ══════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>The operating system</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Everything connected.
                <br />
                <span style={fadeStyle}>From brief to growth.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                MRKT is not a feature. It's a system. Creator profiles, opportunities, campaigns,
                AI strategy, content production, deliverable approval, and growth analytics —
                all connected, all aware of each other.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Opportunities", "Pipeline", "AI Strategist", "Calendar", "Studio", "Analytics"].map((f) => (
                  <span
                    key={f}
                    className="text-[11px] font-medium rounded-full px-3 py-1"
                    style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)", color: "oklch(1 0 0 / 52%)" }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* OS flow visualization */}
            <div className="flex flex-col items-start gap-0">
              {OS_NODES.map((node, i) => (
                <OSNode key={node.label} {...node} isLast={i === OS_NODES.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 04 MRKT AI ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Intelligence</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Meet MRKT AI.
                <br />
                <span style={fadeStyle}>Not a chatbot. A strategist.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                MRKT AI understands your profile, your market, your campaigns, and your goals.
                It doesn't give generic advice — it gives you a specific plan for your specific situation.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2">
                {AI_CAPS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5" style={raisedStyle}>
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.72 0.10 224 / 70%)" }} />
                    <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 58%)" }}>{label}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/ai"
                className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-150"
                style={{ color: "oklch(0.72 0.10 224)" }}
              >
                Learn about MRKT AI <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <AIChatMockup />
          </div>
        </div>
      </section>

      {/* ══ 05 GROWTH HUB ════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <GrowthMockup />
            </div>
            <div className="order-1 md:order-2">
              <div className={EYEBROW} style={eyebrowStyle}>Growth Hub</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Know exactly what's
                <br />
                <span style={fadeStyle}>holding you back.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                The Growth Hub gives every creator a real-time score across profile strength, niche clarity,
                match readiness, and visibility — with specific AI actions to improve each one.
                Not vanity metrics. Actionable intelligence.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Visibility score updated in real time",
                  "AI-driven improvement recommendations",
                  "Profile strength diagnostics",
                  "Match quality tracking across campaigns",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[13.5px]" style={{ color: "oklch(1 0 0 / 52%)" }}>
                    <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: "oklch(0.62 0.12 158)" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 06 CALENDAR ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Content Calendar</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Not a scheduler.
                <br />
                <span style={fadeStyle}>An intelligence engine.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                The Calendar knows when your audience is active in your specific market, which
                regional events to hook content around, and what trending formats are working
                for your niche — this week, not last quarter.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "AI-generated posting schedule by region",
                  "MENA cultural events and Ramadan calendar",
                  "Trend recommendations by niche",
                  "Campaign deadline integration",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[13.5px]" style={{ color: "oklch(1 0 0 / 52%)" }}>
                    <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: "oklch(0.78 0.14 60)" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <CalendarMockup />
          </div>
        </div>
      </section>

      {/* ══ 07 STUDIO ════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.06 0 0)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6"
                    style={{ background: "oklch(0.72 0.10 224 / 10%)", border: "1px solid oklch(0.72 0.10 224 / 22%)" }}
                  >
                    <Sparkles className="h-3 w-3" style={{ color: "oklch(0.72 0.10 224)" }} />
                    <span className={`${EYEBROW} text-[8.5px]`} style={{ color: "oklch(0.72 0.10 224)" }}>Coming soon</span>
                  </div>
                  <h2 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                    MRKT Studio
                  </h2>
                  <p className="mt-5 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                    The future of content creation inside MRKT. Generate campaign assets, ad creatives,
                    content concepts, and video production — all connected to live campaigns. No file
                    transfers. No brief-to-agency lag.
                  </p>
                  <Link
                    to="/studio"
                    className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium transition-colors duration-150"
                    style={{ color: "oklch(0.72 0.10 224)" }}
                  >
                    See the Studio vision <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: FileText,  label: "Campaign briefs",    sub: "AI-drafted in seconds"  },
                    { icon: Sparkles,  label: "Content concepts",   sub: "Hooks, captions, ideas" },
                    { icon: Megaphone, label: "Ad creatives",       sub: "Ready for Meta & TikTok"},
                    { icon: Zap,       label: "Video generation",   sub: "Wave 3 — launching 2026"},
                  ].map(({ icon: Icon, label, sub }) => (
                    <div key={label} className="rounded-xl p-4" style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 9%)" }}>
                      <Icon className="h-4 w-4 mb-3" style={{ color: "oklch(1 0 0 / 36%)" }} />
                      <div className="text-[12.5px] font-semibold mb-0.5" style={{ color: "oklch(1 0 0 / 78%)" }}>{label}</div>
                      <div className="text-[10.5px]" style={{ color: "oklch(1 0 0 / 34%)" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 08 GLOBE ═════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <PipelineMockup />
            </div>
            <div className="order-1 md:order-2">
              <div className={EYEBROW} style={eyebrowStyle}>Creator Discovery</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Discover creators
                <br />
                <span style={fadeStyle}>across the region.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                The MRKT Globe shows you exactly where creators are — and where they're going.
                Find creators in Dubai who are traveling to Riyadh next month. Discover the niche
                talent your competitors haven't found yet. See the creator map in real time.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  "Live creator map across MENA",
                  "Travel plans and market availability",
                  "AI-matched by niche, audience, and location",
                  "Invite directly from the Globe",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[13.5px]" style={{ color: "oklch(1 0 0 / 52%)" }}>
                    <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.72 0.10 224 / 60%)" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 09 WHY MENA ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Why MENA</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Built here.
                <br />
                <span style={fadeStyle}>For here.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                Every tool in MRKT was built with MENA creators and brands in mind.
                Arabic RTL interface. Ramadan calendar intelligence. Regional market data.
                Creator profiles in English and Arabic. This is not an afterthought — it's the foundation.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { label: "Arabic + English",        desc: "Full RTL interface support — switch language at any time."      },
                  { label: "Regional calendar",        desc: "Ramadan, Eid, National Days, and local event hooks built in."   },
                  { label: "MENA market intelligence", desc: "Creator discovery filtered by GCC, Levant, and North Africa."  },
                  { label: "Local currency context",   desc: "Campaign budgets and creator rates in regional context."        },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="h-[5px] w-[5px] rounded-full shrink-0 mt-2" style={{ background: "oklch(0.72 0.10 224)" }} />
                    <div>
                      <div className="text-[13.5px] font-semibold" style={{ color: "oklch(1 0 0 / 80%)" }}>{item.label}</div>
                      <div className="text-[12.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 40%)" }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MENA markets grid */}
            <div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {MENA_MARKETS.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                    style={raisedStyle}
                  >
                    <span className="text-xl">{m.flag}</span>
                    <span className="text-[13.5px] font-medium" style={{ color: "oklch(1 0 0 / 72%)" }}>{m.name}</span>
                  </div>
                ))}
              </div>
              <div
                className="rounded-2xl px-5 py-4 text-[12.5px] leading-relaxed"
                style={{ background: "oklch(0.72 0.10 224 / 6%)", border: "1px solid oklch(0.72 0.10 224 / 16%)", color: "oklch(1 0 0 / 50%)" }}
              >
                MRKT is the first creator collaboration OS built specifically for the Arab world and MENA.
                Not localized. Native.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 10 FOUNDER STORY ═════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Why we built this</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.04em] leading-[1.06]">
                A real problem deserves
                <br />
                <span style={fadeStyle}>a real solution.</span>
              </h2>
            </div>
            <div className="space-y-5">
              <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
                We watched talented creators in Dubai, Beirut, and Cairo manage brand deals through
                WhatsApp voice notes and Google Sheets. We watched brands in Riyadh and Kuwait spend
                weeks searching for the right creator, then lose the deal to miscommunication.
              </p>
              <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
                The infrastructure for creator collaboration in MENA didn't exist. So we built it.
                Not a marketplace. Not an agency tool. An operating system — where everything
                from first contact to final delivery lives in one place.
              </p>
              <p className="text-[1.0625rem] leading-[1.85] font-light" style={bodyStyle}>
                We're in beta. We're building in public. And we're obsessed with getting this right.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium mt-2 transition-colors duration-150"
                style={{ color: "oklch(1 0 0 / 44%)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 72%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 44%)"; }}
              >
                Read the full story <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 11 BETA CTA ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={{ background: "oklch(0.62 0.12 158 / 10%)", border: "1px solid oklch(0.62 0.12 158 / 24%)" }}
          >
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.62 0.12 158)" }} />
            <span className={`${EYEBROW} text-[9px]`} style={{ color: "oklch(0.62 0.12 158)" }}>
              Free during beta
            </span>
          </div>

          <h2 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold tracking-[-0.048em] leading-[0.96]">
            Where collaborations
            <br />
            <span style={fadeStyle}>get done.</span>
          </h2>

          <p className="mt-8 text-[1.0625rem] leading-[1.82] font-light max-w-md mx-auto" style={bodyStyle}>
            Join MRKT during beta. Free, no credit card required. The creator collaboration
            OS for MENA — from first brief to final delivery.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-medium"
            >
              Get started — free <ArrowUpRight className="h-5 w-5" />
            </Link>
            <Link
              to="/pricing"
              className="btn-ghost inline-flex items-center gap-2 rounded-full px-8 h-14 text-sm"
            >
              See pricing
            </Link>
          </div>

          <p className="mt-8 text-[12px]" style={{ color: "oklch(1 0 0 / 24%)" }}>
            Beta access is free. Paid plans launch after the beta period.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
