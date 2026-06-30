import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, CalendarDays,
  Users, BarChart3, TrendingUp, Zap, MapPin,
} from "lucide-react";

export const Route = createFileRoute("/for-creators")({
  head: () => ({
    meta: [
      { title: "MRKT for Creators — Your creator business. One operating system." },
      { name: "description", content: "Discover brand partnerships, plan content with AI, track your growth, and manage collaborations — from one intelligent workspace built for MENA creators." },
      { property: "og:title", content: "MRKT for Creators" },
    ],
  }),
  component: ForCreatorsPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const EYEBROW = "text-[9.5px] uppercase tracking-[0.35em] font-semibold";
const eyebrowStyle = { color: "oklch(1 0 0 / 28%)" };
const bodyStyle    = { color: "oklch(1 0 0 / 46%)" };
const cardStyle    = { background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" };

// ─── Profile mockup ───────────────────────────────────────────────────────────
function CreatorProfileMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full"
      style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)", boxShadow: "0 32px 80px -20px oklch(0 0 0 / 55%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "oklch(0.72 0.09 20)", color: "oklch(0.1 0 0)" }}>S</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold" style={{ color: "oklch(1 0 0 / 85%)" }}>Sara Al-Khatib</div>
          <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "oklch(1 0 0 / 36%)" }}>
            <MapPin className="h-2.5 w-2.5" /> Fashion · Dubai, UAE
          </div>
        </div>
        <span className="text-[9px] font-medium rounded-full px-2.5 py-0.5 uppercase tracking-wider" style={{ background: "oklch(0.62 0.12 158 / 14%)", color: "oklch(0.62 0.12 158)" }}>Active</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", borderColor: "oklch(1 0 0 / 7%)" }}>
        {[
          { v: "148K",  l: "Followers"  },
          { v: "7.2%",  l: "Engagement" },
          { v: "Score 81", l: "Visibility"  },
        ].map((s) => (
          <div key={s.l} className="text-center py-3.5" style={{ borderColor: "oklch(1 0 0 / 7%)" }}>
            <div className="text-[15px] font-bold" style={{ color: "oklch(1 0 0 / 85%)" }}>{s.v}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "oklch(1 0 0 / 30%)" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* AI Strategist result */}
      <div className="p-4">
        <div className={`${EYEBROW} text-[8.5px] mb-3`} style={eyebrowStyle}>AI Strategist</div>
        <div className="rounded-xl p-3.5 text-[11.5px] leading-relaxed mb-3" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <span className="font-semibold" style={{ color: "oklch(0.72 0.10 224)" }}>Growth insight: </span>
          <span style={{ color: "oklch(1 0 0 / 55%)" }}>Your engagement is 2.1× the UAE fashion average. Add your TikTok handle to unlock 18 more matched campaigns this week.</span>
        </div>

        {/* Campaign matches */}
        <div className={`${EYEBROW} text-[8.5px] mb-2`} style={eyebrowStyle}>Matched campaigns</div>
        {[
          { brand: "Hayas Collective", match: "96%", platform: "IG + TikTok" },
          { brand: "Noon Fashion",     match: "89%", platform: "Instagram"   },
        ].map((c) => (
          <div key={c.brand} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)" }}>
            <div>
              <div className="text-[12px] font-medium" style={{ color: "oklch(1 0 0 / 78%)" }}>{c.brand}</div>
              <div className="text-[9.5px]" style={{ color: "oklch(1 0 0 / 32%)" }}>{c.platform}</div>
            </div>
            <span className="text-[10.5px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "oklch(0.62 0.12 158)", background: "oklch(0.62 0.12 158 / 12%)" }}>{c.match}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Workflow steps ───────────────────────────────────────────────────────────
const WORKFLOW = [
  { n: "01", title: "Build your profile",       desc: "Set your niche, platforms, and rates once. MRKT surfaces you to brands automatically — no cold pitching." },
  { n: "02", title: "Get matched",              desc: "Browse campaigns matched to your exact audience, niche, and region. Receive direct invitations from brands." },
  { n: "03", title: "Plan with AI",             desc: "The AI Strategist writes hooks, captions, posting schedules, and campaign concepts — tailored to your voice." },
  { n: "04", title: "Deliver and track results", desc: "Manage briefs, deadlines, and brand communications from one dashboard. Nothing falls through the cracks." },
  { n: "05", title: "Grow your visibility",     desc: "The Growth Hub tracks your score across profile strength, match readiness, and visibility — with specific actions to improve." },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Users,       label: "Creator profile",     desc: "One professional profile. Set rates, niches, and portfolio once. Brands discover you — not the other way around." },
  { Icon: Zap,         label: "Campaign matching",   desc: "AI matches you to live brand opportunities by niche, audience, platform, and location." },
  { Icon: Sparkles,    label: "AI Strategist",       desc: "Hooks, captions, content plans, and outreach messages — generated in your voice, in seconds." },
  { Icon: CalendarDays,label: "Content Calendar",    desc: "Plan and schedule posts across Instagram and TikTok. AI suggests optimal times for your MENA audience." },
  { Icon: TrendingUp,  label: "Growth Hub",          desc: "Real-time visibility score, profile diagnostics, and AI-driven improvement actions." },
  { Icon: BarChart3,   label: "Analytics",           desc: "Track engagement, follower growth, and campaign performance across all content." },
  { Icon: MapPin,      label: "Globe — Travel plans",desc: "Show brands where you're going. Unlock campaigns in cities you're visiting across MENA." },
];

// ─── Creator types ────────────────────────────────────────────────────────────
const CREATOR_TYPES = [
  { type: "Fashion & lifestyle", desc: "Build a professional profile brands trust. Get matched to fashion campaigns across UAE, KSA, and Kuwait." },
  { type: "Food & dining",       desc: "Connect with restaurants launching in your city, seasonal menus, and MENA food brands." },
  { type: "Fitness & wellness",  desc: "Gyms, supplements, and sportswear brands are looking for creators your size. Not just mega-influencers." },
  { type: "Tech & gaming",       desc: "MENA's fastest-growing niche. Connect with regional tech launches, apps, and gaming campaigns." },
  { type: "Travel & lifestyle",  desc: "Hotels, airlines, and destinations across the region. Your travel plans become business opportunities." },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function ForCreatorsPage() {
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
                <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.62 0.12 158)" }} />
                <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>For Creators</span>
              </div>

              <h1 className="font-display text-[clamp(2.75rem,6vw,5.25rem)] font-bold tracking-[-0.048em] leading-[0.96]">
                Your creator business.
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>One operating system.</span>
              </h1>

              <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-md" style={bodyStyle}>
                Discover brand partnerships, plan content, track your growth, and manage
                collaborations — from a single intelligent workspace built for MENA creators.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
                >
                  {user ? "Open MRKT" : "Join as a creator"} <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to={user ? "/opportunities" : "/for-businesses"}
                  className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 h-12 text-sm"
                >
                  {user ? "Browse campaigns" : "For businesses"}
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                {["Free during beta", "English + Arabic", "MENA-first"].map((t) => (
                  <span key={t} className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 30%)" }}>{t}</span>
                ))}
              </div>
            </div>
            <CreatorProfileMockup />
          </div>
        </div>
      </section>

      {/* ══ THE OS FOR CREATORS ══════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>How it works</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              From brief to paid.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Everything in one place.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light max-w-xl mx-auto" style={bodyStyle}>
              MRKT replaces the 6 apps you currently use to run your creator business.
              Profile, opportunities, AI strategy, calendar, analytics — all connected.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-3">
            {WORKFLOW.map((step) => (
              <div key={step.n} className="rounded-2xl p-5" style={cardStyle}>
                <div className={`${EYEBROW} text-[8.5px] mb-4`} style={eyebrowStyle}>{step.n}</div>
                <div className="text-[13px] font-semibold mb-2" style={{ color: "oklch(1 0 0 / 82%)" }}>{step.title}</div>
                <p className="text-[11.5px] leading-relaxed" style={bodyStyle}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DISCOVER OPPORTUNITIES ═══════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.06 0 0)", border: "1px solid oklch(1 0 0 / 8%)" }}>
            <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className={EYEBROW} style={eyebrowStyle}>Opportunities</div>
                <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                  Stop cold-pitching.
                  <br />
                  <span style={{ color: "oklch(1 0 0 / 32%)" }}>Get discovered.</span>
                </h2>
                <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                  Build your creator profile once. MRKT matches you to live campaigns by niche,
                  audience size, engagement rate, and location. Brands in UAE, KSA, Lebanon,
                  and Qatar can find you directly — and invite you to campaigns.
                </p>
                <ul className="mt-7 space-y-3">
                  {[
                    "AI-matched to campaigns by niche + location",
                    "Receive direct invitations from brands",
                    "Apply with one click — AI drafts your pitch",
                    "See your match score before you apply",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[13px]" style={{ color: "oklch(1 0 0 / 50%)" }}>
                      <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: "oklch(0.62 0.12 158)" }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to={user ? "/opportunities" : "/login"}
                  className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium transition-colors"
                  style={{ color: "oklch(0.62 0.12 158)" }}
                >
                  Browse campaigns <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Campaign card preview */}
              <div className="space-y-2.5">
                {[
                  { brand: "Hayas Collective", niche: "Fashion · UAE + KSA", budget: "AED 8,000", match: "96%", c: "oklch(0.62 0.12 158)" },
                  { brand: "Noon Fashion",     niche: "E-commerce · MENA",   budget: "AED 5,500", match: "89%", c: "oklch(0.62 0.12 158)" },
                  { brand: "Ubuy Arabia",      niche: "Lifestyle · Gulf",     budget: "AED 4,200", match: "81%", c: "oklch(0.78 0.14 60)"  },
                ].map((c) => (
                  <div key={c.brand} className="flex items-center gap-4 rounded-xl p-4" style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold" style={{ color: "oklch(1 0 0 / 82%)" }}>{c.brand}</div>
                      <div className="text-[10.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 34%)" }}>{c.niche}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-medium" style={{ color: "oklch(1 0 0 / 60%)" }}>{c.budget}</div>
                      <div className="text-[10.5px] font-semibold mt-0.5" style={{ color: c.c }}>{c.match} match</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ AI STRATEGIST ════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-16 items-center">
          {/* AI chat preview */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.10 224)" }} />
              <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>AI Strategist</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-[14px] rounded-br-[4px] px-4 py-3 text-[12px] leading-relaxed" style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 72%)" }}>
                  Write 3 Reel hooks for my Dubai streetwear haul this week.
                </div>
              </div>
              {[
                "I wore Dubai streetwear for 7 days straight. Here's the breakdown.",
                "The hidden streetwear spots in Dubai no one talks about — thread.",
                "POV: you find the cleanest fits in Al Quoz at 11 PM.",
              ].map((hook, i) => (
                <div key={i} className="rounded-xl px-4 py-3 text-[12px] leading-[1.65]" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                  <span className="text-[8.5px] uppercase tracking-[0.22em] font-semibold block mb-1" style={{ color: "oklch(0.72 0.10 224 / 70%)" }}>Hook {i + 1}</span>
                  <span style={{ color: "oklch(1 0 0 / 65%)" }}>{hook}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={EYEBROW} style={eyebrowStyle}>AI Strategist</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              Create better content.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>In seconds.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
              The AI Strategist knows your niche, your audience, your region. It doesn't give
              you generic hooks — it gives you content built for your specific creator voice
              and the MENA market.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-2">
              {[
                { label: "Hook writing",        sub: "Viral-optimized for your niche"     },
                { label: "Caption drafting",    sub: "Platform-specific, Arabic + English" },
                { label: "Campaign concepts",   sub: "Brief-to-concept in seconds"         },
                { label: "Outreach messages",   sub: "Personalized to each brand"          },
              ].map((f) => (
                <div key={f.label} className="rounded-xl p-3.5" style={cardStyle}>
                  <div className="text-[12.5px] font-semibold" style={{ color: "oklch(1 0 0 / 80%)" }}>{f.label}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 36%)" }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ EVERY CREATOR TYPE ═══════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Every niche</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Built for your
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>specific niche.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                Whether you're a fashion creator in Dubai, a food blogger in Beirut, or a fitness
                creator in Riyadh — MRKT matches you to brands in your exact space.
              </p>
            </div>
            <div className="space-y-2">
              {CREATOR_TYPES.map((t) => (
                <div key={t.type} className="flex gap-4 rounded-2xl p-5" style={cardStyle}>
                  <div className="h-[5px] w-[5px] rounded-full shrink-0 mt-2" style={{ background: "oklch(0.72 0.10 224 / 60%)" }} />
                  <div>
                    <div className="text-[13.5px] font-semibold" style={{ color: "oklch(1 0 0 / 80%)" }}>{t.type}</div>
                    <div className="text-[12px] mt-0.5 leading-relaxed" style={bodyStyle}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
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
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Every tool.</span>
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
            {user ? "Your opportunities are waiting." : "More partnerships. Faster growth."}
          </h2>
          <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-sm mx-auto" style={bodyStyle}>
            {user
              ? "Brands are looking for creators like you. Browse live campaigns now."
              : "Join creators building their brand and business with MRKT. Free during beta."}
          </p>
          <Link
            to={user ? "/opportunities" : "/login"}
            className="btn-primary mt-9 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-medium"
          >
            {user ? "Browse campaigns" : "Join as a creator — free"} <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
