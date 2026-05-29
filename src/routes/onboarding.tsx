import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import {
  type IntentPath,
  type BusinessStage,
  type OnboardingIntent,
  storeIntent,
  intentToAccountType,
} from "@/lib/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started — whoismrkt" }] }),
  component: OnboardingPage,
});

const INTENTS: {
  path: IntentPath;
  num: string;
  label: string;
  tag: string | null;
  description: string;
  features: string[];
}[] = [
  {
    path: "creator",
    num: "01",
    label: "Creator",
    tag: null,
    description:
      "Marketing strategy, content ideas, growth, and brand collaboration opportunities for your personal brand.",
    features: [
      "AI marketing strategist",
      "TikTok / Instagram growth",
      "MRKT Connect creator profile",
      "Brand collaboration",
    ],
  },
  {
    path: "business_creator",
    num: "02",
    label: "Business",
    tag: "Looking for creators",
    description:
      "Marketing help and creator discovery — find TikTok and Instagram talent for your brand campaigns.",
    features: [
      "AI marketing strategist",
      "Creator discovery",
      "Campaign planning",
      "Influencer management",
    ],
  },
  {
    path: "business_marketing",
    num: "03",
    label: "Business",
    tag: "Marketing only",
    description:
      "Strategy, content, ads and growth guidance for your business — no creator side needed.",
    features: [
      "AI marketing strategist",
      "Content calendar",
      "Ad campaign ideas",
      "Analytics support",
    ],
  },
];

const STAGES: { value: BusinessStage; label: string; sub: string }[] = [
  {
    value: "startup",
    label: "Startup / just launching",
    sub: "Early stage — building from scratch.",
  },
  {
    value: "growing",
    label: "Already operating",
    sub: "We have traction and want to scale.",
  },
  {
    value: "established",
    label: "Established business",
    sub: "We need better marketing systems.",
  },
];

function OnboardingPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [path, setPath] = useState<IntentPath | null>(null);
  const [stage, setStage] = useState<BusinessStage | null>(null);
  const [saving, setSaving] = useState(false);

  function selectPath(p: IntentPath) {
    setPath(p);
    if (p !== "business_marketing") setStage(null);
  }

  const showStage = path === "business_marketing";
  const canContinue =
    path !== null && (path !== "business_marketing" || stage !== null);

  async function handleContinue() {
    if (!path || !canContinue || saving) return;
    setSaving(true);

    const intent: OnboardingIntent = {
      path,
      ...(stage ? { business_stage: stage } : {}),
    };

    if (user) {
      // User already authenticated (redirected here from _authenticated guard)
      const { error } = await supabase
        .from("profiles")
        .update({
          account_type: intentToAccountType(path),
          onboarding_path: path,
          business_stage: stage ?? null,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      setSaving(false);
      if (error) {
        toast.error("Something went wrong — please try again.");
        return;
      }
      nav({ to: "/chat" });
    } else {
      // Not yet authenticated — persist to localStorage; auth callback will commit it
      storeIntent(intent);
      setSaving(false);
      nav({ to: "/login" });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <Link to="/"><Logo /></Link>
        <Link to="/" className="text-sm text-muted-foreground/50 hover:text-foreground/75 transition-colors duration-200">
          ← Back
        </Link>
      </header>

      {/* Body */}
      <main className="flex-1 flex items-start justify-center px-6 py-16 md:py-24">
        <div className="w-full max-w-5xl">

          {/* Eyebrow */}
          <div className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground/50 mb-6">
            — MRKT
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[0.92]">
            What are you using<br />
            <span className="text-chrome">MRKT for?</span>
          </h1>
          <p className="mt-5 text-[1rem] text-muted-foreground/55 font-light max-w-lg leading-relaxed">
            Pick your path. MRKT will tailor your strategy, tools and experience to match.
          </p>

          {/* Intent cards */}
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {INTENTS.map((intent) => {
              const selected = path === intent.path;
              return (
                <button
                  key={intent.path}
                  onClick={() => selectPath(intent.path)}
                  className="group relative text-left rounded-2xl p-6 transition-all duration-200 flex flex-col min-h-[280px] md:min-h-[320px]"
                  style={{
                    background: selected
                      ? "oklch(1 0 0 / 5.5%)"
                      : "oklch(1 0 0 / 2%)",
                    border: selected
                      ? "1px solid oklch(0.84 0 0 / 52%)"
                      : "1px solid oklch(1 0 0 / 10%)",
                    boxShadow: selected
                      ? "0 0 0 1px oklch(0.84 0 0 / 14%), 0 8px 40px oklch(0 0 0 / 35%)"
                      : "none",
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-auto">
                    <span
                      className="font-display text-[10px] tracking-[0.25em]"
                      style={{ color: selected ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 28%)" }}
                    >
                      {intent.num}
                    </span>
                    {/* Checkmark */}
                    <span
                      className="h-5 w-5 rounded-full flex items-center justify-center transition-all duration-200 flex-none"
                      style={{
                        background: selected ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 6%)",
                        border: selected ? "none" : "1px solid oklch(1 0 0 / 12%)",
                        opacity: selected ? 1 : 0.6,
                      }}
                    >
                      {selected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                    </span>
                  </div>

                  {/* Label + tag */}
                  <div className="mt-8">
                    <div className="font-display text-2xl font-semibold tracking-tight">
                      {intent.label}
                    </div>
                    {intent.tag && (
                      <div
                        className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em]"
                        style={{
                          background: selected ? "oklch(0.84 0 0 / 15%)" : "oklch(1 0 0 / 6%)",
                          color: selected ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 40%)",
                        }}
                      >
                        {intent.tag}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-4 text-[0.8125rem] text-muted-foreground/55 leading-relaxed">
                    {intent.description}
                  </p>

                  {/* Features */}
                  <ul className="mt-5 space-y-1.5">
                    {intent.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[0.75rem]" style={{ color: "oklch(1 0 0 / 35%)" }}>
                        <span
                          className="h-[3px] w-[3px] rounded-full flex-none"
                          style={{ background: selected ? "oklch(0.84 0 0 / 70%)" : "oklch(1 0 0 / 25%)" }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Step 2 — business stage (only for business_marketing) */}
          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{ maxHeight: showStage ? 400 : 0, opacity: showStage ? 1 : 0 }}
          >
            <div className="pt-10">
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/45 mb-4">
                — One more thing
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-[-0.03em]">
                Where is your business today?
              </h2>
              <div className="mt-6 grid sm:grid-cols-3 gap-3">
                {STAGES.map((s) => {
                  const active = stage === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStage(s.value)}
                      className="text-left rounded-xl p-4 transition-all duration-150"
                      style={{
                        background: active ? "oklch(1 0 0 / 5.5%)" : "oklch(1 0 0 / 2%)",
                        border: active
                          ? "1px solid oklch(0.84 0 0 / 48%)"
                          : "1px solid oklch(1 0 0 / 10%)",
                        boxShadow: active ? "0 0 0 1px oklch(0.84 0 0 / 12%)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.8125rem] font-medium text-foreground/85 leading-snug">
                          {s.label}
                        </span>
                        {active && (
                          <span
                            className="h-4 w-4 rounded-full flex-none flex items-center justify-center"
                            style={{ background: "oklch(0.84 0 0)" }}
                          >
                            <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[0.75rem] text-muted-foreground/40 leading-snug">
                        {s.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Continue */}
          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={handleContinue}
              disabled={!canContinue || saving}
              className="btn-primary inline-flex items-center gap-2.5 rounded-full px-8 h-[3.125rem] text-sm"
            >
              {saving ? "Saving…" : "Continue"}
              {!saving && <ArrowUpRight className="h-4 w-4" />}
            </button>
            {!user && (
              <Link
                to="/login"
                className="text-sm text-muted-foreground/40 hover:text-foreground/60 transition-colors duration-200"
              >
                Already have an account? Sign in →
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
