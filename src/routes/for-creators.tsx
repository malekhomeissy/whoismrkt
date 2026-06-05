import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, CalendarDays,
  Users, BarChart3, TrendingUp, Zap, Star,
} from "lucide-react";

export const Route = createFileRoute("/for-creators")({
  head: () => ({
    meta: [
      { title: "MRKT for Creators — Turn your audience into opportunities" },
      { name: "description", content: "Discover brand partnerships, plan content, and grow your creator business from one intelligent workspace." },
    ],
  }),
  component: ForCreatorsPage,
});

// ─────────────────────────────────────────────────────────────
// Hero visual — creator profile + incoming invitations
// ─────────────────────────────────────────────────────────────
function CreatorProfileCard() {
  return (
    <div
      className="w-full max-w-sm mx-auto mt-12 rounded-2xl overflow-hidden"
      style={{
        background: "oklch(0.09 0 0)",
        border: "1px solid oklch(1 0 0 / 10%)",
        boxShadow: "0 24px 64px -16px oklch(0 0 0 / 50%)",
      }}
    >
      {/* Profile header */}
      <div className="p-5 flex items-center gap-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
        <div
          className="h-12 w-12 rounded-full shrink-0 flex items-center justify-center text-base font-bold"
          style={{ background: "oklch(0.72 0.09 20)", color: "oklch(0.1 0 0)" }}
        >
          S
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px]" style={{ color: "oklch(1 0 0 / 88%)" }}>Sofia Marlowe</div>
          <div className="text-[11px] mt-0.5" style={{ color: "oklch(1 0 0 / 38%)" }}>Sustainable fashion · Paris</div>
        </div>
        <span
          className="text-[9px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5 font-medium"
          style={{ background: "oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 36%)" }}
        >
          Creator
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 p-5 gap-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
        {[
          { value: "280K",  label: "Followers"  },
          { value: "6.8%",  label: "Engagement" },
          { value: "24",    label: "Campaigns"  },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-xl font-semibold" style={{ color: "oklch(1 0 0 / 88%)" }}>{s.value}</div>
            <div className="text-[9.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 34%)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Incoming invitations */}
      <div className="p-4 space-y-2">
        <div
          className="text-[9px] uppercase tracking-[0.28em] font-medium mb-3"
          style={{ color: "oklch(1 0 0 / 25%)" }}
        >
          New matches
        </div>
        {[
          { brand: "Lumière Studio", note: "Sent a collaboration invite", score: "94%" },
          { brand: "Maison Aurum",   note: "New campaign match",          score: "88%" },
        ].map((m) => (
          <div
            key={m.brand}
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div>
              <div className="text-[12px] font-medium" style={{ color: "oklch(1 0 0 / 80%)" }}>{m.brand}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "oklch(1 0 0 / 34%)" }}>{m.note}</div>
            </div>
            <div
              className="text-[10.5px] font-semibold rounded-full px-2.5 py-0.5"
              style={{ color: "oklch(0.72 0.14 152)", background: "oklch(0.72 0.14 152 / 12%)" }}
            >
              {m.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaign browser mockup
// ─────────────────────────────────────────────────────────────
function CampaignBrowserMockup() {
  const campaigns = [
    { brand: "Lumière Studio", platform: "Instagram", budget: "$12,000", req: "Micro creators",  score: 94 },
    { brand: "Helio Fit",      platform: "TikTok",    budget: "$8,500",  req: "Wellness niche",  score: 88 },
    { brand: "Maison Aurum",   platform: "Instagram", budget: "$24,000", req: "Fashion & luxury", score: 82 },
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
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(1 0 0 / 30%)" }}>
          Open Campaigns
        </span>
        <span
          className="text-[9.5px] rounded-full px-2 py-0.5 font-medium"
          style={{ background: "oklch(0.72 0.14 152 / 12%)", color: "oklch(0.72 0.14 152)" }}
        >
          12 matched
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        {campaigns.map((c) => (
          <div
            key={c.brand}
            className="p-3.5 rounded-xl"
            style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-[12.5px]" style={{ color: "oklch(1 0 0 / 82%)" }}>{c.brand}</div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[9px] uppercase tracking-[0.18em] rounded-full px-2 py-0.5"
                  style={{ background: "oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 36%)" }}
                >
                  {c.platform}
                </span>
                <span
                  className="text-[10.5px] font-semibold rounded-full px-2 py-0.5"
                  style={{ color: "oklch(0.72 0.14 152)", background: "oklch(0.72 0.14 152 / 12%)" }}
                >
                  {c.score}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10.5px]">
              <span style={{ color: "oklch(1 0 0 / 55%)" }}>{c.budget}</span>
              <span style={{ color: "oklch(1 0 0 / 30%)" }}>{c.req}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AI content output mockup
// ─────────────────────────────────────────────────────────────
function AICreatorMockup() {
  const outputs = [
    { type: "Hook",    text: "I've refused to buy new clothes for 6 months. Here's what happened." },
    { type: "Hook",    text: "Fast fashion is destroying the planet. Here's what I wear instead." },
    { type: "Caption", text: "Sustainable doesn't mean boring. This look took 20 minutes and $0 — thrifted, swapped, and styled." },
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
            Write hooks and a caption for my sustainable fashion post.
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
// Data
// ─────────────────────────────────────────────────────────────

const FEATURES = [
  { Icon: Users,       title: "Creator Profile",       desc: "One professional profile that surfaces you to brands automatically. Set your rates, niches, and portfolio once." },
  { Icon: Zap,         title: "Paid Campaigns",         desc: "Browse live brand opportunities and apply in one click. Receive direct invitations from brands that match your niche." },
  { Icon: Sparkles,    title: "AI Strategist",          desc: "Generate hooks, captions, campaign concepts, and content strategies on demand. Briefed in seconds." },
  { Icon: CalendarDays, title: "Content Calendar",      desc: "Plan and schedule content across TikTok, Instagram and YouTube. See everything in one organized view." },
  { Icon: Star,        title: "Partnership Tracking",   desc: "Manage deliverables, deadlines and brand communications from one place. Nothing falls through the cracks." },
  { Icon: BarChart3,   title: "Performance Analytics",  desc: "Track reach, engagement and follower growth across all content. See what's working and double down." },
];

const WORKFLOW = [
  { n: "01", title: "Sign in — instantly",     desc: "Create your account in seconds with Apple or Google. No forms, no email confirmation." },
  { n: "02", title: "Set up your workspace",   desc: "Select Creator, add your niche and platforms. MRKT personalizes to you in one step." },
  { n: "03", title: "Browse brand campaigns",  desc: "See live opportunities matched to your profile, niche, and audience size." },
  { n: "04", title: "Apply or get invited",    desc: "Apply directly or accept invitations from brands that discover you through MRKT Connect." },
  { n: "05", title: "Deliver and grow",        desc: "Manage briefs, deadlines, and brand communications. Track partnerships over time." },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
function ForCreatorsPage() {
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
            MRKT for Creators
          </span>
        </div>

        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.12] max-w-3xl mx-auto" style={{ letterSpacing: '0.02em', fontFeatureSettings: '"ss01" 1, "cv01" 1, "cv11" 1, "calt" 0' }}>
          Turn your audience<br />
          <span style={{ color: "oklch(1 0 0 / 35%)" }}>into opportunities.</span>
        </h1>

        <p
          className="mt-6 mx-auto max-w-[30rem] text-[1.0625rem] leading-[1.75] font-light"
          style={{ color: "oklch(1 0 0 / 42%)" }}
        >
          Discover brand partnerships, plan content, and grow your creator
          business — from one intelligent workspace.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <Link
              to="/opportunities"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
            >
              Explore Opportunities <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
            >
              Join as a Creator <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            to="/connect"
            className="btn-ghost inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm"
          >
            Explore campaigns
          </Link>
        </div>

        <div className="relative">
          <CreatorProfileCard />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 inset-x-0 h-40"
            style={{ background: "linear-gradient(to top, var(--color-background) 20%, transparent)" }}
          />
        </div>
      </section>

      {/* ── PARTNERSHIPS ─────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                MRKT Connect
              </div>
              <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Get discovered.<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>Get paid.</span>
              </h2>
              <p
                className="mt-6 text-[1.0625rem] leading-[1.8] font-light"
                style={{ color: "oklch(1 0 0 / 44%)" }}
              >
                Build your creator profile once. MRKT matches you with brands
                looking for exactly your niche, audience, and style —
                no cold outreach required.
              </p>
              <Link
                to="/connect"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
              >
                Browse open campaigns <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <CampaignBrowserMockup />
          </div>
        </div>
      </section>

      {/* ── AI TOOLS ─────────────────────────────────── */}
      <section className="px-6 py-28 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <AICreatorMockup />
            </div>
            <div className="order-1 md:order-2">
              <div
                className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                AI Strategist
              </div>
              <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Create better content,<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>faster.</span>
              </h2>
              <p
                className="mt-6 text-[1.0625rem] leading-[1.8] font-light"
                style={{ color: "oklch(1 0 0 / 44%)" }}
              >
                Hooks, captions, campaign concepts, and content strategies —
                generated in seconds. Built for the way creators actually work.
              </p>
              <Link
                to={user ? "/chat" : "/login"}
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
              >
                {user ? "Open AI Strategist" : "Try the AI Strategist"} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
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
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>Every tool.</span>
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
              From profile<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>to paid partnership.</span>
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
                Your opportunities<br />
                <span style={{ color: "oklch(1 0 0 / 34%)" }}>are waiting.</span>
              </h2>
              <p
                className="mt-6 font-light max-w-xs mx-auto leading-relaxed"
                style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
              >
                Brands are looking for creators like you. Browse live campaigns now.
              </p>
              <Link
                to="/opportunities"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
              >
                Explore Opportunities <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
                More partnerships.<br />
                <span style={{ color: "oklch(1 0 0 / 34%)" }}>Faster growth.</span>
              </h2>
              <p
                className="mt-6 font-light max-w-xs mx-auto leading-relaxed"
                style={{ color: "oklch(1 0 0 / 38%)", fontSize: "1.0625rem" }}
              >
                Join creators building their brand and business with MRKT.
              </p>
              <Link
                to="/login"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
              >
                Join as a Creator — free <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
