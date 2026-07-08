import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  Check, ArrowUpRight, Sparkles, Shield, Clock, Zap, Users, Globe2,
  CalendarDays, BarChart3, MessageSquare, CreditCard, Lock,
} from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — MRKT" },
      { name: "description", content: "MRKT is free. Creator Pro and Business Growth paid plans launching soon. Platform fees apply when payments go live." },
      { property: "og:title", content: "Pricing — MRKT" },
    ],
  }),
  component: PricingPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanFeature { text: string; icon?: React.ElementType }

interface Plan {
  name: string;
  badge: string | null;
  price: string;
  period: string | null;
  description: string;
  cta: string;
  ctaTo: string;
  features: PlanFeature[];
  highlight: boolean;
  soon: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FREE_FEATURES: PlanFeature[] = [
  { text: "Creator & business profiles",  icon: Users         },
  { text: "Opportunities & applications", icon: Zap           },
  { text: "MRKT Connect messaging",       icon: MessageSquare },
  { text: "Pipeline CRM (6 stages)",      icon: BarChart3     },
  { text: "AI Strategist (200 credits/mo)", icon: Sparkles    },
  { text: "Content Calendar",             icon: CalendarDays  },
  { text: "MRKT Globe",                   icon: Globe2        },
  { text: "Analytics & visibility score", icon: BarChart3     },
  { text: "Arabic + English (RTL)",       icon: Globe2        },
];

const CREATOR_FEATURES: PlanFeature[] = [
  { text: "Everything in Free",           icon: Check         },
  { text: "2,000 AI credits/mo",          icon: Sparkles      },
  { text: "Advanced analytics",           icon: BarChart3     },
  { text: "Priority visibility in matches", icon: Zap         },
  { text: "Enhanced verification badge",  icon: Shield        },
  { text: "Media kit tools",              icon: Users         },
  { text: "Growth Hub priority insights", icon: Sparkles      },
];

const BUSINESS_FEATURES: PlanFeature[] = [
  { text: "Everything in Free",           icon: Check         },
  { text: "Unlimited campaigns",          icon: Zap           },
  { text: "Find Creators (advanced)",     icon: Users         },
  { text: "Team pipeline access",         icon: BarChart3     },
  { text: "AI Campaign Strategist",       icon: Sparkles      },
  { text: "Escrow payments",              icon: Shield        },
  { text: "Collaboration management",     icon: MessageSquare },
  { text: "Dedicated account support",    icon: Users         },
];

const PLANS: Plan[] = [
  {
    name: "Free",
    badge: "Current",
    price: "Free",
    period: null,
    description: "Full access to MRKT. No credit card required.",
    cta: "Get started free",
    ctaTo: "/login",
    features: FREE_FEATURES,
    highlight: false,
    soon: false,
  },
  {
    name: "Creator Pro",
    badge: "Launching soon",
    price: "TBD",
    period: null,
    description: "For creators ready to grow seriously. More AI credits, advanced analytics, and priority placement.",
    cta: "Notify me",
    ctaTo: "/login",
    features: CREATOR_FEATURES,
    highlight: true,
    soon: true,
  },
  {
    name: "Business Growth",
    badge: "Launching soon",
    price: "TBD",
    period: null,
    description: "For brands running real campaigns. Full creator discovery, team pipeline, and escrow payments.",
    cta: "Notify me",
    ctaTo: "/login",
    features: BUSINESS_FEATURES,
    highlight: false,
    soon: true,
  },
];

// ─── AI Credit Cost Reference ─────────────────────────────────────────────────

const CREDIT_COSTS = [
  { action: "Quick content idea",        credits: 1,  note: "Fast generation"     },
  { action: "AI Strategist message",     credits: 2,  note: "Conversational"      },
  { action: "Calendar intelligence",     credits: 5,  note: "Weekly plan"         },
  { action: "Deep profile audit",        credits: 10, note: "Full analysis"       },
  { action: "Asset generation",          credits: 15, note: "Image / video"       },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-16 px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(ellipse 70% 45% at 50% 0%, oklch(0.15 0 0) 0%, oklch(0 0 0) 65%)",
          }}
        />

        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-7"
          style={{
            background: "oklch(0.10 0 0)",
            border: "1px solid oklch(1 0 0 / 14%)",
          }}
        >
          <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.62 0.12 158)", boxShadow: "0 0 6px oklch(0.62 0.12 158 / 60%)" }} />
          <span className="text-[9px] font-medium uppercase tracking-[0.32em]" style={{ color: "oklch(1 0 0 / 50%)" }}>
            Free to use
          </span>
        </div>

        <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.1] mb-5" style={{ letterSpacing: "-0.02em" }}>
          Simple, transparent<br />
          <span style={{ color: "oklch(1 0 0 / 32%)" }}>pricing.</span>
        </h1>
        <p className="mx-auto max-w-[30rem] text-[1.0625rem] leading-[1.75] font-light" style={{ color: "oklch(1 0 0 / 46%)" }}>
          MRKT is free. Paid plans and payments launch once payment infrastructure is live.
        </p>
      </section>

      {/* ── PLANS ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col rounded-2xl p-7"
              style={{
                background: plan.highlight ? "oklch(0.11 0 0)" : "oklch(0.09 0 0)",
                border: plan.highlight
                  ? "1px solid oklch(0.72 0.10 224 / 30%)"
                  : "1px solid oklch(1 0 0 / 10%)",
                boxShadow: plan.highlight
                  ? "inset 0 1px 0 oklch(0.72 0.10 224 / 18%), 0 8px 32px oklch(0 0 0 / 50%)"
                  : "inset 0 1px 0 oklch(1 0 0 / 8%), 0 4px 16px oklch(0 0 0 / 40%)",
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="mb-5">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-[0.22em] rounded-full px-2.5 py-1"
                    style={{
                      background: plan.soon
                        ? "oklch(1 0 0 / 6%)"
                        : plan.highlight
                          ? "oklch(0.72 0.10 224 / 18%)"
                          : "oklch(0.62 0.12 158 / 16%)",
                      color: plan.soon
                        ? "oklch(1 0 0 / 38%)"
                        : plan.highlight
                          ? "oklch(0.72 0.10 224)"
                          : "oklch(0.62 0.12 158)",
                      border: `1px solid ${plan.soon ? "oklch(1 0 0 / 10%)" : plan.highlight ? "oklch(0.72 0.10 224 / 28%)" : "oklch(0.62 0.12 158 / 28%)"}`,
                    }}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-2">
                <span className="font-display text-xl font-semibold" style={{ color: "oklch(1 0 0 / 88%)" }}>
                  {plan.name}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="font-display text-[2.25rem] font-bold leading-none" style={{ color: "oklch(1 0 0 / 90%)" }}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-[0.8125rem]" style={{ color: "oklch(1 0 0 / 36%)" }}>
                    {plan.period}
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed mb-7" style={{ color: "oklch(1 0 0 / 46%)" }}>
                {plan.description}
              </p>

              <Link
                to={plan.ctaTo as "/login"}
                className={`inline-flex items-center justify-center gap-2 rounded-xl h-10 text-sm font-medium mb-8 transition-opacity duration-200 hover:opacity-80 ${plan.soon ? "opacity-60 pointer-events-none" : ""}`}
                style={{
                  background: plan.highlight
                    ? "oklch(0.72 0.10 224)"
                    : plan.soon
                      ? "oklch(1 0 0 / 8%)"
                      : "oklch(1 0 0 / 90%)",
                  color: plan.highlight
                    ? "oklch(0.08 0 0)"
                    : plan.soon
                      ? "oklch(1 0 0 / 38%)"
                      : "oklch(0.08 0 0)",
                }}
              >
                {!plan.soon && user ? "Open workspace" : plan.cta}
                {!plan.soon && <ArrowUpRight className="h-4 w-4" />}
                {plan.soon && <Clock className="h-3.5 w-3.5" />}
              </Link>

              <div
                className="h-px w-full mb-7"
                style={{ background: "oklch(1 0 0 / 8%)" }}
              />

              <div className="flex flex-col gap-3">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: plan.highlight
                          ? "oklch(0.72 0.10 224 / 16%)"
                          : "oklch(1 0 0 / 8%)",
                      }}
                    >
                      <Check
                        className="h-2.5 w-2.5"
                        style={{
                          color: plan.highlight
                            ? "oklch(0.72 0.10 224)"
                            : "oklch(0.62 0.12 158)",
                        }}
                      />
                    </div>
                    <span className="text-[13px] leading-snug" style={{ color: "oklch(1 0 0 / 66%)" }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI CREDITS ──────────────────────────────────────────── */}
      <section className="px-6 pb-24 hairline-t">
        <div className="mx-auto max-w-3xl pt-20">
          <div className="text-center mb-12">
            <div className="text-[9.5px] uppercase tracking-[0.35em] mb-4 font-medium" style={{ color: "oklch(1 0 0 / 34%)" }}>
              AI Credits
            </div>
            <h2 className="font-display text-3xl md:text-[2.5rem] font-bold tracking-[-0.03em] leading-[1.1] mb-4">
              How AI credits work
            </h2>
            <p className="text-[1rem] leading-[1.75] font-light" style={{ color: "oklch(1 0 0 / 46%)" }}>
              Different AI actions use different credit amounts. All users get 200 credits per month, free. Credits reset monthly.
            </p>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "oklch(0.09 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ background: "oklch(0.08 0 0)", borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
            >
              <Sparkles className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.10 224)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: "oklch(1 0 0 / 38%)" }}>
                Credit Cost Reference
              </span>
            </div>
            {CREDIT_COSTS.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: i < CREDIT_COSTS.length - 1 ? "1px solid oklch(1 0 0 / 6%)" : "none" }}
              >
                <div>
                  <div className="text-[13.5px] font-medium" style={{ color: "oklch(1 0 0 / 80%)" }}>
                    {c.action}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "oklch(1 0 0 / 36%)" }}>
                    {c.note}
                  </div>
                </div>
                <div
                  className="text-[12px] font-semibold rounded-full px-3 py-1"
                  style={{
                    background: "oklch(0.72 0.10 224 / 14%)",
                    border: "1px solid oklch(0.72 0.10 224 / 24%)",
                    color: "oklch(0.72 0.10 224)",
                  }}
                >
                  {c.credits} {c.credits === 1 ? "credit" : "credits"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESCROW NOTE ─────────────────────────────────────────── */}
      <section className="px-6 pb-24 hairline-t">
        <div className="mx-auto max-w-3xl pt-20">
          <div
            className="rounded-2xl p-8 flex gap-6"
            style={{
              background: "oklch(0.09 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
            }}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.72 0.10 224 / 14%)",
                border: "1px solid oklch(0.72 0.10 224 / 24%)",
              }}
            >
              <Shield className="h-5 w-5" style={{ color: "oklch(0.72 0.10 224)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-[15px]" style={{ color: "oklch(1 0 0 / 88%)" }}>
                  Platform fees & escrow payments
                </h3>
                <span
                  className="text-[9px] font-semibold uppercase tracking-[0.18em] rounded-full px-2 py-0.5"
                  style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(1 0 0 / 36%)", border: "1px solid oklch(1 0 0 / 10%)" }}
                >
                  Launching soon
                </span>
              </div>
              <p className="text-[0.9375rem] leading-[1.75]" style={{ color: "oklch(1 0 0 / 52%)" }}>
                MRKT will take a platform fee on completed deals once payments and escrow are live. Payments will be held securely in escrow until campaign deliverables are reviewed and approved — protecting both creators and businesses. Detailed fee structure will be published before launch.
              </p>
              <div className="flex items-center gap-4 mt-5">
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "oklch(1 0 0 / 42%)" }}>
                  <Lock className="h-3 w-3" />
                  Escrow protected
                </div>
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "oklch(1 0 0 / 42%)" }}>
                  <CreditCard className="h-3 w-3" />
                  Creator payouts
                </div>
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "oklch(1 0 0 / 42%)" }}>
                  <Shield className="h-3 w-3" />
                  Dispute resolution
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.1] mb-5" style={{ letterSpacing: "-0.02em" }}>
            Free to get started.
            <br />
            <span style={{ color: "oklch(1 0 0 / 34%)" }}>No credit card.</span>
          </h2>
          <p className="font-light leading-relaxed mb-8" style={{ color: "oklch(1 0 0 / 44%)", fontSize: "1.0625rem" }}>
            Full access to MRKT. No credit card required.
          </p>
          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
          >
            Get started free <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
