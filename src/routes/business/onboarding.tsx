import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowLeft, Check, Building2, Globe, Target, Megaphone, DollarSign, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/business/onboarding")({
  head: () => ({ meta: [{ title: "Business Setup — MRKT" }] }),
  component: BusinessOnboardingPage,
});

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Company", "About", "Audience", "Goals", "Budget", "Preview"];

const INDUSTRIES = [
  "Fashion & Apparel", "Beauty & Wellness", "Food & Beverage", "Technology",
  "Health & Fitness", "Travel & Hospitality", "Home & Lifestyle", "Finance",
  "Education", "Entertainment", "Sports & Outdoors", "Automotive",
  "Real Estate", "Retail", "Consumer Goods", "Media & Publishing", "Other",
];

const COMPANY_SIZES = [
  "1–10 employees", "11–50 employees", "51–200 employees",
  "201–1,000 employees", "1,000+ employees",
];

const PLATFORMS = [
  "Instagram", "TikTok", "YouTube", "X (Twitter)", "LinkedIn",
  "Pinterest", "Snapchat", "Twitch", "Facebook",
];

const CAMPAIGN_GOALS = [
  "Brand Awareness", "Sales", "UGC Creation", "Product Launch",
  "Community Growth", "Lead Generation", "App Downloads", "Event Promotion",
];

const BUDGET_RANGES = [
  "Under $1,000 / mo", "$1,000–$5,000 / mo", "$5,000–$15,000 / mo",
  "$15,000–$50,000 / mo", "$50,000+ / mo",
];

const CREATOR_CATEGORIES = [
  "Fashion", "Beauty", "Lifestyle", "Fitness & Health", "Food & Cooking",
  "Travel", "Gaming", "Tech", "Finance", "Parenting",
  "Comedy & Entertainment", "Education", "Music", "Art & Design",
  "Sports", "Automotive", "Home & Interior",
];

interface BusinessOnboardingData {
  company_name: string;
  industry: string;
  website: string;
  location: string;
  description: string;
  company_size: string;
  target_audience: string;
  geographic_market: string;
  preferred_platforms: string[];
  campaign_goals: string[];
  monthly_creator_budget: string;
  preferred_creator_categories: string[];
}

const EMPTY: BusinessOnboardingData = {
  company_name: "", industry: "", website: "", location: "",
  description: "", company_size: "",
  target_audience: "", geographic_market: "",
  preferred_platforms: [], campaign_goals: [],
  monthly_creator_budget: "", preferred_creator_categories: [],
};

type SetFn = <K extends keyof BusinessOnboardingData>(k: K, v: BusinessOnboardingData[K]) => void;

// ─────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "oklch(1 0 0 / 38%)" }}>
          {label}
        </label>
        {hint && <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 24%)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", prefix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string;
}) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      {prefix && (
        <span className="px-3.5 shrink-0 text-sm select-none" style={{ color: "oklch(1 0 0 / 28%)", borderRight: "1px solid oklch(1 0 0 / 8%)", paddingTop: "0.6875rem", paddingBottom: "0.6875rem" }}>
          {prefix}
        </span>
      )}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3.5 py-[0.6875rem] text-sm outline-none placeholder:text-foreground/20"
        style={{ color: "oklch(1 0 0 / 85%)" }}
      />
    </div>
  );
}

function Textarea({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength} rows={3}
        className="w-full bg-transparent px-3.5 py-3.5 text-sm outline-none resize-none placeholder:text-foreground/20"
        style={{ color: "oklch(1 0 0 / 85%)" }}
      />
      {maxLength && (
        <div className="px-3.5 pb-2.5 text-right text-[10px]" style={{ color: "oklch(1 0 0 / 24%)" }}>
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-2 rounded-full text-[12px] font-medium transition-all duration-150"
      style={{
        background: selected ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 3%)",
        border: `1px solid ${selected ? "oklch(0.84 0 0 / 45%)" : "oklch(1 0 0 / 8%)"}`,
        color: selected ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 40%)",
      }}
    >
      {label}
    </button>
  );
}

function RadioChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full rounded-xl px-4 py-3.5 text-left transition-all duration-150"
      style={{
        background: selected ? "oklch(1 0 0 / 5%)" : "oklch(1 0 0 / 2%)",
        border: `1px solid ${selected ? "oklch(0.84 0 0 / 40%)" : "oklch(1 0 0 / 8%)"}`,
      }}
    >
      <div
        className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center transition-all duration-150"
        style={{
          background: selected ? "oklch(0.84 0 0)" : "transparent",
          border: `1.5px solid ${selected ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 22%)"}`,
        }}
      >
        {selected && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.1 0 0)" }} />}
      </div>
      <span className="text-[13px] font-medium" style={{ color: selected ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 50%)" }}>
        {label}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Company Basics
// ─────────────────────────────────────────────────────────────

function StepCompany({ data, set }: { data: BusinessOnboardingData; set: SetFn }) {
  // "Other" is active when the user selected it (value = "Other") OR when they
  // typed a custom value that isn't one of the predefined options.
  const namedIndustries = INDUSTRIES.filter((i) => i !== "Other");
  const isOtherActive   =
    data.industry === "Other" ||
    (data.industry !== "" && !namedIndustries.includes(data.industry));
  // The text shown inside the custom input (blank while they haven't typed yet)
  const customText = isOtherActive && data.industry !== "Other" ? data.industry : "";

  return (
    <div className="space-y-5">
      <Field label="Company Name">
        <Input value={data.company_name} onChange={(v) => set("company_name", v)} placeholder="Acme Inc." />
      </Field>

      <Field label="Industry">
        <div className="flex flex-wrap gap-2 mt-1">
          {/* Named industries */}
          {namedIndustries.map((ind) => (
            <Chip
              key={ind} label={ind}
              selected={data.industry === ind}
              onClick={() => set("industry", data.industry === ind ? "" : ind)}
            />
          ))}
          {/* Other chip */}
          <Chip
            label="Other"
            selected={isOtherActive}
            onClick={() => set("industry", isOtherActive ? "" : "Other")}
          />
        </div>

        {/* Custom industry text input — only visible when Other is active */}
        {isOtherActive && (
          <div className="mt-3">
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="text"
              value={customText}
              onChange={(e) => set("industry", e.target.value || "Other")}
              placeholder="What industry are you in?"
              maxLength={80}
              className="w-full bg-transparent px-3.5 py-[0.6875rem] text-sm outline-none placeholder:text-foreground/20 rounded-xl"
              style={{
                background: "oklch(1 0 0 / 3.5%)",
                border: "1px solid oklch(0.84 0 0 / 45%)",
                color: "oklch(1 0 0 / 85%)",
              }}
            />
          </div>
        )}
      </Field>

      <Field label="Website" hint="Optional">
        <Input value={data.website} onChange={(v) => set("website", v)} prefix="https://" placeholder="yourcompany.com" />
      </Field>

      <Field label="Location" hint="Optional">
        <Input value={data.location} onChange={(v) => set("location", v)} placeholder="New York, USA" />
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 2 — About the Business
// ─────────────────────────────────────────────────────────────

function StepAbout({ data, set }: { data: BusinessOnboardingData; set: SetFn }) {
  return (
    <div className="space-y-6">
      <Field label="Business Description">
        <Textarea
          value={data.description}
          onChange={(v) => set("description", v)}
          placeholder="Briefly describe what your company does, your products or services, and what makes you different."
          maxLength={400}
        />
      </Field>

      <Field label="Company Size">
        <div className="space-y-2 mt-1">
          {COMPANY_SIZES.map((size) => (
            <RadioChip
              key={size} label={size}
              selected={data.company_size === size}
              onClick={() => set("company_size", size)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Target Audience
// ─────────────────────────────────────────────────────────────

function StepAudience({ data, set }: { data: BusinessOnboardingData; set: SetFn }) {
  function toggle(platform: string) {
    set("preferred_platforms",
      data.preferred_platforms.includes(platform)
        ? data.preferred_platforms.filter((p) => p !== platform)
        : [...data.preferred_platforms, platform]
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl px-4 py-3.5 text-[11.5px] leading-relaxed" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 40%)" }}>
        Help us match you with creators whose audiences align with your ideal customer.
      </div>

      <Field label="Target Audience">
        <Textarea
          value={data.target_audience}
          onChange={(v) => set("target_audience", v)}
          placeholder="e.g. Women aged 25–40 interested in sustainable fashion and conscious living"
          maxLength={300}
        />
      </Field>

      <Field label="Geographic Market" hint="Optional">
        <Input
          value={data.geographic_market}
          onChange={(v) => set("geographic_market", v)}
          placeholder="e.g. United States, UK & Canada, Global"
        />
      </Field>

      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Preferred Platforms
        </div>
        <div className="text-[11px] mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>Where do you want to run campaigns?</div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Chip
              key={p} label={p}
              selected={data.preferred_platforms.includes(p)}
              onClick={() => toggle(p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Campaign Goals
// ─────────────────────────────────────────────────────────────

function StepGoals({ data, set }: { data: BusinessOnboardingData; set: SetFn }) {
  function toggle(goal: string) {
    set("campaign_goals",
      data.campaign_goals.includes(goal)
        ? data.campaign_goals.filter((g) => g !== goal)
        : [...data.campaign_goals, goal]
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl px-4 py-3.5 text-[11.5px] leading-relaxed" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 40%)" }}>
        Select all that apply. MRKT will prioritize creator matches that align with your campaign objectives.
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {CAMPAIGN_GOALS.map((goal) => {
          const selected = data.campaign_goals.includes(goal);
          return (
            <button
              key={goal}
              onClick={() => toggle(goal)}
              className="flex items-center gap-3 rounded-xl px-4 py-4 text-left transition-all duration-150"
              style={{
                background: selected ? "oklch(1 0 0 / 5.5%)" : "oklch(1 0 0 / 2%)",
                border: `1px solid ${selected ? "oklch(0.84 0 0 / 42%)" : "oklch(1 0 0 / 8%)"}`,
              }}
            >
              <div
                className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center transition-all duration-150"
                style={{
                  background: selected ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 6%)",
                  border: selected ? "none" : "1px solid oklch(1 0 0 / 14%)",
                }}
              >
                {selected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
              </div>
              <span className="text-[13px] font-medium" style={{ color: selected ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 50%)" }}>
                {goal}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 5 — Budget & Categories
// ─────────────────────────────────────────────────────────────

function StepBudget({ data, set }: { data: BusinessOnboardingData; set: SetFn }) {
  function toggleCat(cat: string) {
    set("preferred_creator_categories",
      data.preferred_creator_categories.includes(cat)
        ? data.preferred_creator_categories.filter((c) => c !== cat)
        : [...data.preferred_creator_categories, cat]
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Monthly Creator Budget
        </div>
        <div className="text-[11px] mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>Approximate monthly spend on creator partnerships</div>
        <div className="space-y-2">
          {BUDGET_RANGES.map((range) => (
            <RadioChip
              key={range} label={range}
              selected={data.monthly_creator_budget === range}
              onClick={() => set("monthly_creator_budget", range)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Preferred Creator Categories <span className="normal-case tracking-normal" style={{ color: "oklch(1 0 0 / 24%)", fontSize: "10px" }}>— Optional</span>
        </div>
        <div className="text-[11px] mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>What types of creators do you want to partner with?</div>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CATEGORIES.map((cat) => (
            <Chip
              key={cat} label={cat}
              selected={data.preferred_creator_categories.includes(cat)}
              onClick={() => toggleCat(cat)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 6 — Preview
// ─────────────────────────────────────────────────────────────

function completionInfo(d: BusinessOnboardingData) {
  const checks = [
    { label: "Company name",     ok: !!d.company_name.trim() },
    { label: "Industry",         ok: !!d.industry.trim() },
    { label: "Description",      ok: !!d.description.trim() },
    { label: "Target audience",  ok: !!d.target_audience.trim() },
    { label: "Campaign goal",    ok: d.campaign_goals.length > 0 },
    { label: "Creator budget",   ok: !!d.monthly_creator_budget },
  ];
  return {
    score:   checks.filter((c) => c.ok).length,
    total:   checks.length,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

const STEP_ICONS = [Building2, Globe, Target, Megaphone, DollarSign];

function PreviewRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | string[] | undefined }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5" style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <Icon className="h-3.5 w-3.5" style={{ color: "oklch(1 0 0 / 40%)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "oklch(1 0 0 / 30%)" }}>{label}</div>
        <div className="text-[13px] mt-0.5 leading-snug" style={{ color: "oklch(1 0 0 / 75%)" }}>{display}</div>
      </div>
    </div>
  );
}

function StepPreview({ data, saving, onFinish }: {
  data: BusinessOnboardingData; saving: boolean; onFinish: () => void;
}) {
  const { score, total, missing } = completionInfo(data);
  const isComplete = score === total;
  const pct = (score / total) * 100;

  return (
    <div className="space-y-6">
      {/* Completion meter */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium" style={{ color: "oklch(1 0 0 / 55%)" }}>Profile completion</span>
          <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 38%)" }}>{score}/{total}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "oklch(0.84 0 0)" }} />
        </div>
        {missing.length > 0 && (
          <p className="text-[11px]" style={{ color: "oklch(1 0 0 / 35%)" }}>
            Still needed: {missing.join(", ")}
          </p>
        )}
      </div>

      {/* Company card preview */}
      <div>
        <div className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>
          Your business profile
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          {/* Header */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)" }}>
            <div className="flex items-start gap-4">
              <div
                className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center text-lg font-bold"
                style={{ background: "oklch(0.72 0.09 250 / 18%)", border: "1px solid oklch(0.72 0.09 250 / 25%)" }}
              >
                <Building2 className="h-5 w-5" style={{ color: "oklch(0.72 0.09 250)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold leading-tight" style={{ color: "oklch(1 0 0 / 88%)" }}>
                  {data.company_name || "Your Company"}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {data.industry && (
                    <span className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 50%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                      {data.industry}
                    </span>
                  )}
                  {data.location && (
                    <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 35%)" }}>{data.location}</span>
                  )}
                </div>
              </div>
            </div>

            {data.description && (
              <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: "oklch(1 0 0 / 50%)" }}>
                {data.description}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="px-5 py-4 space-y-3.5">
            <PreviewRow icon={Target} label="Target Audience" value={data.target_audience} />
            <PreviewRow icon={Globe} label="Geographic Market" value={data.geographic_market} />
            <PreviewRow icon={Megaphone} label="Campaign Goals" value={data.campaign_goals} />
            <PreviewRow icon={DollarSign} label="Monthly Budget" value={data.monthly_creator_budget} />
            {data.preferred_platforms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {data.preferred_platforms.map((p) => (
                  <span key={p} className="text-[10px] font-medium rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(1 0 0 / 45%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI matching note */}
      <div className="rounded-xl px-4 py-3.5" style={{ background: "oklch(0.72 0.09 250 / 6%)", border: "1px solid oklch(0.72 0.09 250 / 18%)" }}>
        <div className="text-[11px] font-medium mb-0.5" style={{ color: "oklch(0.72 0.09 250)" }}>AI-powered matching</div>
        <p className="text-[11px] leading-relaxed" style={{ color: "oklch(1 0 0 / 40%)" }}>
          MRKT uses your industry, budget, target audience, preferred categories, platforms and goals to surface the most relevant creators for your campaigns.
        </p>
      </div>

      {/* Finish button */}
      <div className="space-y-3 pt-1">
        <button
          onClick={onFinish}
          disabled={saving || !isComplete}
          className="btn-primary w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
          style={{ opacity: isComplete ? 1 : 0.35 }}
        >
          {saving ? "Finishing setup…" : "Finish Setup"}
          {!saving && <ArrowUpRight className="h-4 w-4" />}
        </button>
        {!isComplete && (
          <p className="text-center text-[11px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
            Complete the required fields above to continue.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

const STEP_TITLES = [
  {
    eyebrow: "Step 01 of 06",
    headline: "Tell us about your company.",
    sub: "This is the foundation of your MRKT business profile.",
  },
  {
    eyebrow: "Step 02 of 06",
    headline: "Describe your business.",
    sub: "Help creators understand who you are and what you stand for.",
  },
  {
    eyebrow: "Step 03 of 06",
    headline: "Who are you trying to reach?",
    sub: "Define your ideal customer so we can find the right creators.",
  },
  {
    eyebrow: "Step 04 of 06",
    headline: "What are your campaign goals?",
    sub: "Select everything you want to achieve through creator partnerships.",
  },
  {
    eyebrow: "Step 05 of 06",
    headline: "Budget and creator preferences.",
    sub: "Set your monthly spend range and the types of creators you want.",
  },
  {
    eyebrow: "Step 06 of 06",
    headline: "Ready to find creators.",
    sub: "Review your profile before entering the dashboard.",
  },
];

function BusinessOnboardingPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const [step,           setStep]           = useState(1);
  const [data,           setData]           = useState<BusinessOnboardingData>(EMPTY);
  const [saving,         setSaving]         = useState(false);
  const [checkingAuth,   setCheckingAuth]   = useState(true);

  // Redirect non-business users or unauthenticated users
  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/login" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase
      .from("profiles")
      .select("account_type, onboarding_path")
      .eq("id", user.id)
      .single()
      .then(({ data: profile, error }: { data: { account_type: string | null; onboarding_path: string | null } | null; error: unknown }) => {
        if (error) {
          // Query failed — fall through to show the form rather than infinite loading
          setCheckingAuth(false);
          return;
        }
        // Mirror the same isBizAccount() check used in _authenticated.tsx
        const isBiz =
          profile?.account_type === "brand" ||
          profile?.account_type === "business" ||
          profile?.onboarding_path === "business_creator" ||
          profile?.onboarding_path === "business_marketing";
        if (!isBiz) {
          // Creators and anonymous users should not be here
          nav({ to: "/home" });
          return;
        }
        setCheckingAuth(false);
      });
  }, [user, loading, nav]);

  function set<K extends keyof BusinessOnboardingData>(k: K, v: BusinessOnboardingData[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function canProceed(): boolean {
    if (step === 1) return (
      !!data.company_name.trim() &&
      !!data.industry.trim()
    );
    if (step === 2) return !!data.description.trim() && !!data.company_size;
    if (step === 3) return !!data.target_audience.trim();
    if (step === 4) return data.campaign_goals.length > 0;
    if (step === 5) return !!data.monthly_creator_budget;
    return true;
  }

  async function finishSetup() {
    if (!user) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("business_profiles")
        .upsert({
          user_id:                      user.id,
          company_name:                 data.company_name.trim()       || null,
          industry:                     data.industry.trim()            || null,
          website:                      data.website.trim()             || null,
          location:                     data.location.trim()            || null,
          description:                  data.description.trim()         || null,
          company_size:                 data.company_size               || null,
          target_audience:              data.target_audience.trim()     || null,
          geographic_market:            data.geographic_market.trim()   || null,
          preferred_platforms:          data.preferred_platforms,
          campaign_goals:               data.campaign_goals,
          monthly_creator_budget:       data.monthly_creator_budget     || null,
          preferred_creator_categories: data.preferred_creator_categories,
          is_complete:                  true,
          updated_at:                   new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Business profile complete. Welcome to MRKT.");
      nav({ to: "/find-creators" });
    } catch (e: unknown) {
      console.error("[business-onboarding] finishSetup error:", e);
      const msg = (e as { message?: string })?.message ??
        (e instanceof Error ? e.message : "Something went wrong.");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const progress = (step / 6) * 100;
  const current  = STEP_TITLES[step - 1];

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header
        className="px-6 h-16 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-[11px] uppercase tracking-[0.24em]" style={{ color: "oklch(1 0 0 / 28%)" }}>
            {STEP_LABELS[step - 1]}
          </span>
          {/* No "Skip for now" — business users must complete setup before
              accessing the dashboard. The _authenticated guard enforces this
              and would create a redirect loop if they tried to navigate away. */}
          <span className="hidden sm:block text-[11.5px]" style={{ color: "oklch(1 0 0 / 22%)" }}>
            Step {step} of 6
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-[2px] shrink-0" style={{ background: "oklch(1 0 0 / 5%)" }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: "oklch(1 0 0 / 55%)" }}
        />
      </div>

      {/* Step indicators */}
      <div
        className="px-6 h-10 flex items-center gap-1.5 shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 5%)" }}
      >
        {STEP_LABELS.map((label, i) => {
          const idx     = i + 1;
          const done    = idx < step;
          const current = idx === step;
          return (
            <button
              key={label}
              onClick={() => idx < step && setStep(idx)}
              disabled={idx >= step}
              className="flex items-center gap-1.5 transition-all duration-150"
              style={{ cursor: idx < step ? "pointer" : "default" }}
            >
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: current ? "20px" : "8px",
                  background: done
                    ? "oklch(0.84 0 0 / 60%)"
                    : current
                    ? "oklch(0.84 0 0)"
                    : "oklch(1 0 0 / 12%)",
                }}
              />
            </button>
          );
        })}
        <span className="ml-auto text-[10px] uppercase tracking-[0.22em]" style={{ color: "oklch(1 0 0 / 25%)" }}>
          {step} / 6
        </span>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-14">
          {/* Step header */}
          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-[0.32em] font-medium mb-4" style={{ color: "oklch(1 0 0 / 28%)" }}>
              {current.eyebrow}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-3">
              {current.headline}
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: "oklch(1 0 0 / 44%)" }}>
              {current.sub}
            </p>
          </div>

          {/* Step content */}
          {step === 1 && <StepCompany data={data} set={set} />}
          {step === 2 && <StepAbout data={data} set={set} />}
          {step === 3 && <StepAudience data={data} set={set} />}
          {step === 4 && <StepGoals data={data} set={set} />}
          {step === 5 && <StepBudget data={data} set={set} />}
          {step === 6 && <StepPreview data={data} saving={saving} onFinish={finishSetup} />}

          {/* Navigation */}
          {step < 6 && (
            <div className="mt-10 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-2 text-sm transition-colors duration-150"
                style={{ color: step === 1 ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 40%)" }}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                disabled={!canProceed()}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
                style={{ opacity: canProceed() ? 1 : 0.4 }}
              >
                Continue <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
