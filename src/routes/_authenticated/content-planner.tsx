// ─────────────────────────────────────────────────────────────────────────────
// MRKT Content Planner — AI-powered content calendar
//
// Available to both Creators and Businesses.
// Monthly / Weekly / Daily calendar views.
// AI generates weekly/monthly plans based on role, platforms, niche.
// Items stored in content_planner_items Supabase table.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth.tsx";
import { toast } from "sonner";
import {
  CalendarDays, ChevronLeft, ChevronRight, Sparkles, Plus, X,
  Instagram, Youtube, Linkedin, Twitter, Facebook,
  Clock, CheckCircle2, FileEdit, Trash2, Loader2, Zap,
  RefreshCw, AlignLeft, Lightbulb, Target, MessageSquare,
  ArrowRight, TrendingUp, Users, ShoppingBag, Eye,
  ImageIcon, Video, Wand2, ExternalLink, ChevronDown, ChevronUp,
  AlertCircle, Brain, Globe2, RotateCcw as RefreshIcon, MapPin, BarChart2,
  Calendar, Copy, Download,
} from "lucide-react";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/content-planner")({
  head: () => ({ meta: [{ title: "Calendar — MRKT" }] }),
  component: ContentPlannerPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type CalendarView = "monthly" | "weekly" | "daily";

type ContentStatus = "planned" | "drafted" | "posted";

type ContentItem = {
  id: string;
  user_id: string;
  title: string;
  platform: string;
  content_type: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null;
  status: ContentStatus;
  hook: string | null;
  content_idea: string | null;
  caption: string | null;
  cta: string | null;
  creative_direction: string | null;
  why_it_works: string | null;
  post_goal: string | null;
  notes: string | null;
  ai_generated: boolean;
  session_id: string | null;
  created_at?: string;
};

type UserProfile = {
  name: string | null;
  account_type: string | null;
  onboarding_path: string | null;
  niche: string | null;
  platforms: string[] | null;
  // Rich creator profile fields
  display_name: string | null;
  bio: string | null;
  location: string | null;
  categories: string[] | null;
  audience_location: string | null;
  audience_age_range: string | null;
  audience_gender_split: string | null;
  follower_count: number | null;
  rate_range: string | null;
  preferred_content_types: string[] | null;
};

type GeneratedAsset = {
  id: string;
  user_id: string;
  content_planner_item_id: string | null;
  prompt: string;
  provider: string;
  asset_type: "image" | "video";
  aspect_ratio: string | null;
  status: "generating" | "completed" | "failed";
  output_url: string | null;
  higgsfield_request_id: string | null;
  error_message: string | null;
  created_at: string;
};

// ── Design tokens ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "Instagram",  label: "Instagram",  icon: Instagram,   color: "oklch(0.84 0 0)" },
  { id: "TikTok",     label: "TikTok",     icon: null,        color: "#69C9D0" },
  { id: "YouTube",    label: "YouTube",    icon: Youtube,     color: "#FF0000" },
  { id: "LinkedIn",   label: "LinkedIn",   icon: Linkedin,    color: "#0A66C2" },
  { id: "X",          label: "X",          icon: Twitter,     color: "#FFFFFF" },
  { id: "Facebook",   label: "Facebook",   icon: Facebook,    color: "#1877F2" },
];

const CONTENT_TYPES_CREATOR = [
  "Reel", "TikTok", "Story", "Post", "Short", "Educational", "Trend", "GRWM", "Vlog", "Review",
];
const CONTENT_TYPES_BUSINESS = [
  "Product Post", "Brand Story", "Promo", "Campaign", "Announcement", "Seasonal", "Collaboration", "Ad",
];

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; icon: React.ElementType }> = {
  planned:  { label: "Planned",  color: "oklch(0.70 0.08 68)",  icon: Clock         },
  drafted:  { label: "Drafted",  color: "oklch(0.72 0.10 224)", icon: FileEdit      },
  posted:   { label: "Posted",   color: "oklch(0.62 0.12 158)", icon: CheckCircle2  },
};

// ── Platform icon ─────────────────────────────────────────────────────────────

function PlatformIcon({ platform, size = 12 }: { platform: string; size?: number }) {
  const cfg = PLATFORMS.find((p) => p.id === platform);
  if (!cfg) return <span style={{ fontSize: size - 2, fontWeight: 700, color: C.textMuted }}>●</span>;
  if (cfg.icon) {
    const Icon = cfg.icon;
    return <Icon style={{ height: size, width: size, color: cfg.color, flexShrink: 0 }} />;
  }
  // TikTok has no lucide icon — use text
  return <span style={{ fontSize: size - 2, fontWeight: 900, color: cfg.color, fontFamily: "monospace" }}>TK</span>;
}

// ── Generate Plan Modal ───────────────────────────────────────────────────────

const GOALS = [
  { id: "engagement",      label: "Boost Engagement",  desc: "Likes, comments, saves",       icon: TrendingUp  },
  { id: "followers",       label: "Grow Followers",    desc: "Reach new audiences",           icon: Users       },
  { id: "brand_awareness", label: "Brand Awareness",   desc: "Visibility & reach",            icon: Eye         },
  { id: "leads",           label: "Generate Leads",    desc: "DMs, link clicks, signups",     icon: Target      },
  { id: "sales",           label: "Drive Sales",       desc: "Product & service conversions", icon: ShoppingBag },
] as const;

const FREQUENCIES = [
  { value: 3, label: "3×",  desc: "per week" },
  { value: 5, label: "5×",  desc: "per week" },
  { value: 7, label: "7×",  desc: "per week" },
];

function GeneratePlanModal({
  onClose,
  onGenerate,
}: {
  onClose:    () => void;
  onGenerate: (goal: string, frequency: number, weeks: 1 | 4) => void;
}) {
  const [goal,      setGoal]      = useState("engagement");
  const [frequency, setFrequency] = useState(5);
  const [weeks,     setWeeks]     = useState<1 | 4>(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 80%)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden modal-in flex flex-col"
        style={{ background: "oklch(0.09 0 0)", border: `1px solid oklch(1 0 0 / 14%)`, boxShadow: C.shadowPanel, maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between shrink-0" style={{ borderBottom: `1px solid oklch(1 0 0 / 8%)` }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: C.accent }} />
              <span className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>Generate Content Plan</span>
            </div>
            <p className="text-[11.5px]" style={{ color: C.textMuted }}>Claude AI will craft a personalized strategy for you.</p>
          </div>
          <button onClick={onClose} className="mt-0.5 p-1" style={{ color: C.textMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto">
          {/* Goal */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] mb-2.5 font-semibold" style={{ color: C.textQuaternary }}>Primary Goal</div>
            <div className="grid grid-cols-1 gap-1.5">
              {GOALS.map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setGoal(id)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-100"
                  style={{
                    background: goal === id ? "oklch(1 0 0 / 8%)"  : "oklch(1 0 0 / 3%)",
                    border:     goal === id ? `1px solid oklch(1 0 0 / 22%)` : `1px solid oklch(1 0 0 / 8%)`,
                  }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: goal === id ? C.accent : C.textMuted }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium" style={{ color: goal === id ? C.textPrimary : C.textSecondary }}>{label}</div>
                    <div className="text-[10.5px]" style={{ color: C.textMuted }}>{desc}</div>
                  </div>
                  {goal === id && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: C.accent }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] mb-2.5 font-semibold" style={{ color: C.textQuaternary }}>Posting Frequency</div>
            <div className="flex gap-2">
              {FREQUENCIES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setFrequency(value)}
                  className="flex-1 rounded-xl py-2.5 text-center transition-all duration-100"
                  style={{
                    background: frequency === value ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                    border:     frequency === value ? `1px solid oklch(1 0 0 / 25%)` : `1px solid oklch(1 0 0 / 8%)`,
                  }}
                >
                  <div className="text-[15px] font-bold" style={{ color: frequency === value ? C.textPrimary : C.textSecondary }}>{label}</div>
                  <div className="text-[9.5px]" style={{ color: C.textMuted }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] mb-2.5 font-semibold" style={{ color: C.textQuaternary }}>Plan Duration</div>
            <div className="flex gap-2">
              {([1, 4] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className="flex-1 rounded-xl py-2.5 text-center transition-all duration-100"
                  style={{
                    background: weeks === w ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                    border:     weeks === w ? `1px solid oklch(1 0 0 / 25%)` : `1px solid oklch(1 0 0 / 8%)`,
                  }}
                >
                  <div className="text-[13px] font-semibold" style={{ color: weeks === w ? C.textPrimary : C.textSecondary }}>{w === 1 ? "1 Week" : "4 Weeks"}</div>
                  <div className="text-[9.5px]" style={{ color: C.textMuted }}>{w === 1 ? `${Math.min(frequency, 7)} posts` : `${Math.min(frequency * 4, 24)} posts`}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={() => onGenerate(goal, frequency, weeks)}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-150"
            style={{ background: "oklch(1 0 0 / 10%)", border: `1px solid oklch(1 0 0 / 25%)`, color: C.textPrimary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 16%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: C.accent }} />
            Generate with Claude AI
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generation Progress Overlay ────────────────────────────────────────────────

function GenerationOverlay({
  step,
  niche,
  postCount,
}: {
  step:      number;
  niche:     string;
  postCount: number;
}) {
  const steps = [
    "Reading your creator profile",
    `Building strategy for ${niche || "your niche"}`,
    `Crafting ${postCount} posts with Claude AI`,
    "Saving to your calendar",
  ];

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: "oklch(0.06 0 0 / 92%)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="rounded-2xl px-8 py-7 flex flex-col items-center text-center"
        style={{ background: "oklch(0.10 0 0)", border: `1px solid oklch(1 0 0 / 12%)`, maxWidth: 320 }}
      >
        <div className="relative mb-5">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid oklch(1 0 0 / 12%)` }}
          >
            <Sparkles className="h-6 w-6 animate-pulse" style={{ color: C.accent }} />
          </div>
        </div>
        <div className="text-[14px] font-semibold mb-1" style={{ color: C.textPrimary }}>Generating your plan…</div>
        <div className="text-[11.5px] mb-5" style={{ color: C.textMuted }}>This takes 10–20 seconds</div>

        <div className="w-full space-y-2.5">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="shrink-0">
                {i < step ? (
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "oklch(0.62 0.12 158)" }} />
                ) : i === step ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: C.accent }} />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full" style={{ border: `1.5px solid oklch(1 0 0 / 15%)` }} />
                )}
              </div>
              <span
                className="text-[11.5px] text-left"
                style={{ color: i <= step ? C.textSecondary : C.textMuted }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Generate Visual Section ───────────────────────────────────────────────────
// Embedded inside the DetailPanel — lets users generate a content visual or
// short video via Higgsfield AI. Polls status every 3s until complete.

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16  Vertical"  },
  { value: "1:1",  label: "1:1   Square"    },
  { value: "16:9", label: "16:9  Landscape" },
  { value: "4:3",  label: "4:3   Standard"  },
];

// Platform → sensible default aspect ratio
function platformAspect(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "tiktok")    return "9:16";
  if (p === "youtube")   return "16:9";
  if (p === "linkedin")  return "16:9";
  if (p === "instagram") return "1:1";
  return "9:16";
}

function GenerateVisualSection({
  item,
}: {
  item: ContentItem;
}) {
  const { user } = useAuth();
  const [open,        setOpen]        = useState(false);
  const [prompt,      setPrompt]      = useState("");
  const [assetType,   setAssetType]   = useState<"image" | "video">("image");
  const [aspectRatio, setAspectRatio] = useState(() => platformAspect(item.platform));
  const [asset,       setAsset]       = useState<GeneratedAsset | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [usage,       setUsage]       = useState<{ used: number; limit: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pre-fill prompt from item context
  useEffect(() => {
    const parts = [item.hook, item.creative_direction].filter(Boolean);
    setPrompt(parts.length > 0 ? parts.join(". ") : item.title);
    setAspectRatio(platformAspect(item.platform));
  }, [item.id, item.platform, item.hook, item.creative_direction, item.title]);

  // Load most recent asset for this item
  useEffect(() => {
    if (!user || !item.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase
      .from("generated_assets")
      .select("*")
      .eq("user_id", user.id)
      .eq("content_planner_item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAsset(data[0] as GeneratedAsset);
          if (data[0].status === "generating") {
            setOpen(true);
            startPolling(data[0].id);
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, item.id]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function startPolling(assetId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase.functions.invoke("higgsfield-status", {
        body: { asset_id: assetId },
      });
      if (error || !data?.asset) return;
      setAsset(data.asset as GeneratedAsset);
      if (data.asset.status === "completed" || data.asset.status === "failed") {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        if (data.asset.status === "completed") toast.success("Visual generated.");
        if (data.asset.status === "failed")    toast.error("Generation failed.");
      }
    }, 3000);
  }

  async function generate() {
    if (!user || !prompt.trim() || submitting) return;
    setSubmitting(true);
    setAsset(null);

    try {
      const { data, error } = await supabase.functions.invoke("higgsfield-generate", {
        body: {
          prompt:                   prompt.trim(),
          asset_type:               assetType,
          aspect_ratio:             aspectRatio,
          platform:                 item.platform,
          content_planner_item_id:  item.id,
        },
      });

      if (error) throw new Error(error.message ?? "Request failed");

      if (data?.error) {
        if (data.error.includes("limit")) {
          toast.error(`Generation limit reached (${data.limit}/month). Resets next month.`);
        } else {
          toast.error(data.error);
        }
        return;
      }

      const newAsset = data.asset as GeneratedAsset;
      setAsset(newAsset);
      if (data.usage) setUsage(data.usage);

      if (newAsset.status === "completed") {
        toast.success("Visual ready.");
      } else {
        toast("Generating visual — this takes 20–60 seconds.");
        startPolling(newAsset.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const isGenerating = submitting || asset?.status === "generating";
  const isCompleted  = asset?.status === "completed";
  const isFailed     = asset?.status === "failed";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${C.borderSubtle}` }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 transition-all duration-100"
        style={{ background: open ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 3%)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 3%)"; }}
      >
        <Wand2 className="h-3 w-3 shrink-0" style={{ color: C.accent }} />
        <span className="flex-1 text-[11px] font-semibold text-left" style={{ color: C.textSecondary }}>
          Generate Visual
        </span>

        {/* Status indicator */}
        {isGenerating && (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: C.accent }} />
        )}
        {isCompleted && !open && (
          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "oklch(0.62 0.12 158)" }} />
        )}
        {isFailed && !open && (
          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "oklch(0.52 0.15 24)" }} />
        )}

        {open
          ? <ChevronUp  className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
          : <ChevronDown className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
        }
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>

          {/* Type selector */}
          <div className="flex gap-1.5 pt-1">
            {(["image", "video"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAssetType(t)}
                className="flex items-center gap-1.5 flex-1 justify-center h-7 rounded-lg text-[11px] font-medium transition-all duration-100"
                style={{
                  background: assetType === t ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                  border:     `1px solid ${assetType === t ? C.borderStrong : C.borderSubtle}`,
                  color:      assetType === t ? C.textPrimary : C.textMuted,
                }}
              >
                {t === "image"
                  ? <ImageIcon className="h-2.5 w-2.5" />
                  : <Video     className="h-2.5 w-2.5" />
                }
                {t === "image" ? "Image" : "Video"}
              </button>
            ))}
          </div>

          {/* Aspect ratio */}
          <div>
            <label className="text-[9.5px] uppercase tracking-[0.24em] mb-1 block" style={{ color: C.textQuaternary }}>
              Aspect Ratio
            </label>
            <div className="flex gap-1 flex-wrap">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className="h-6 px-2 rounded-md text-[10px] font-medium transition-all duration-100"
                  style={{
                    background: aspectRatio === ar.value ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                    border:     `1px solid ${aspectRatio === ar.value ? C.borderStrong : C.borderSubtle}`,
                    color:      aspectRatio === ar.value ? C.textSecondary : C.textMuted,
                  }}
                >
                  {ar.value}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="text-[9.5px] uppercase tracking-[0.24em] mb-1 block" style={{ color: C.textQuaternary }}>
              Prompt
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the visual you want to generate…"
              className="w-full rounded-xl px-3 py-2 text-[11.5px] bg-transparent resize-none outline-none placeholder:opacity-30"
              style={{
                background: "oklch(1 0 0 / 4%)",
                border:     `1px solid ${C.borderSubtle}`,
                color:      C.textSecondary,
              }}
            />
          </div>

          {/* Usage badge */}
          {usage && (
            <div className="text-[9.5px]" style={{ color: C.textMuted }}>
              {usage.used} / {usage.limit} generations used this month
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 h-8 rounded-xl text-[11.5px] font-semibold transition-all duration-100"
            style={{
              background: isGenerating ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 12%)",
              border:     `1px solid ${isGenerating ? C.borderSubtle : C.borderStrong}`,
              color:      isGenerating ? C.textMuted : C.accent,
              cursor:     isGenerating || !prompt.trim() ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
              : <><Wand2 className="h-3 w-3" /> Generate {assetType === "image" ? "Image" : "Video"}</>
            }
          </button>

          {/* Result */}
          {isCompleted && asset?.output_url && (
            <div className="space-y-2">
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.borderNormal}` }}
              >
                {asset.asset_type === "image" ? (
                  <img
                    src={asset.output_url}
                    alt="Generated visual"
                    className="w-full object-cover"
                    style={{ maxHeight: 200 }}
                  />
                ) : (
                  <video
                    src={asset.output_url}
                    controls
                    className="w-full"
                    style={{ maxHeight: 200 }}
                  />
                )}
              </div>
              <a
                href={asset.output_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10.5px] font-medium transition-colors"
                style={{ color: C.textMuted }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
              >
                <ExternalLink className="h-3 w-3" /> Open full size
              </a>
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "oklch(0.52 0.15 24 / 8%)", border: "1px solid oklch(0.65 0.18 25 / 20%)" }}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "oklch(0.52 0.15 24)" }} />
              <div>
                <div className="text-[11px] font-semibold" style={{ color: "oklch(0.52 0.15 24)" }}>Generation failed</div>
                {asset?.error_message && (
                  <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{asset.error_message}</div>
                )}
                <button
                  onClick={generate}
                  className="text-[10.5px] font-medium mt-1.5 transition-colors"
                  style={{ color: C.textTertiary }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                >
                  Try again →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Content item card (calendar cell) ─────────────────────────────────────────

function ContentCard({
  item,
  onSelect,
  onStatusCycle,
}: {
  item: ContentItem;
  onSelect: (item: ContentItem) => void;
  onStatusCycle: (item: ContentItem) => void;
}) {
  const status = STATUS_CONFIG[item.status];
  const StatusIcon = status.icon;

  return (
    <div
      onClick={() => onSelect(item)}
      className="rounded-xl px-2.5 py-2 mb-1 cursor-pointer transition-all duration-100 group"
      style={{
        background: "oklch(0.13 0 0)",
        border: `1px solid ${C.borderSubtle}`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <PlatformIcon platform={item.platform} size={10} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] truncate flex-1" style={{ color: C.textTertiary }}>
          {item.content_type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onStatusCycle(item); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Status: ${status.label}`}
        >
          <StatusIcon style={{ height: 8, width: 8, color: status.color }} />
        </button>
      </div>
      <div className="text-[10.5px] font-medium leading-snug line-clamp-2" style={{ color: C.textSecondary }}>
        {item.title}
      </div>
      {item.scheduled_time && (
        <div className="mt-1 flex items-center gap-1">
          <Clock style={{ height: 8, width: 8, color: C.textMuted }} />
          <span className="text-[9px]" style={{ color: C.textMuted }}>{item.scheduled_time}</span>
        </div>
      )}
      <div
        className="mt-1.5 h-0.5 rounded-full"
        style={{ background: status.color, opacity: 0.5, width: item.status === "posted" ? "100%" : item.status === "drafted" ? "60%" : "20%" }}
      />
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

const POST_GOAL_COLORS: Record<string, string> = {
  reach:         "oklch(0.72 0.10 224)",   // system AI blue
  engagement:    "oklch(0.70 0.08 68)",    // system titanium gold
  conversions:   "oklch(0.62 0.12 158)",   // system muted emerald
  trust:         "oklch(0.60 0.06 255)",   // muted cool blue-slate
  entertainment: "oklch(0.65 0.07 340)",   // muted rose
};

function DetailPanel({
  item,
  onClose,
  onDelete,
  onStatusChange,
  onSave,
}: {
  item: ContentItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ContentStatus) => void;
  onSave: (item: ContentItem) => void;
}) {
  const [editing,      setEditing]      = useState(false);
  const [draft,        setDraft]        = useState(item);
  const [regenerating, setRegenerating] = useState(false);
  const [improving,    setImproving]    = useState(false);
  const [copiedKey,    setCopiedKey]    = useState<string | null>(null);

  useEffect(() => {
    setDraft(item);
    setEditing(false);
  }, [item.id]);

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  function copyToClipboard(key: string, text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  }

  function buildFullPostText(): string {
    const parts: string[] = [];
    if (item.hook) parts.push(`HOOK:\n${item.hook}`);
    if (item.content_idea) parts.push(`IDEA:\n${item.content_idea}`);
    if (item.caption) parts.push(`CAPTION:\n${item.caption}`);
    if (item.cta) parts.push(`CTA:\n${item.cta}`);
    if (item.creative_direction) parts.push(`DIRECTION:\n${item.creative_direction}`);
    return parts.join("\n\n");
  }

  function exportAsText() {
    const text = buildFullPostText();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title.replace(/\s+/g, "-").toLowerCase()}-${item.platform}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAIAction(action: "regenerate_item" | "improve_item") {
    if (action === "regenerate_item") setRegenerating(true);
    else setImproving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.functions.invoke("content-plan-generate", {
        body: {
          action,
          item_context: item,
          goal:         item.post_goal ?? "engagement",
          weeks:        1,
          start_date:   item.scheduled_date,
          frequency:    1,
          platforms:    [item.platform],
        },
      });
      if (error) throw error;
      const newItem = data?.items?.[0];
      if (!newItem) throw new Error("No item returned");
      onSave({ ...item, ...newItem, id: item.id, user_id: item.user_id, session_id: item.session_id });
      toast.success(action === "regenerate_item" ? "Regenerated with a fresh angle." : "Improved with Claude AI.");
    } catch (err) {
      console.error(err);
      toast.error("AI action failed. Please try again.");
    } finally {
      setRegenerating(false);
      setImproving(false);
    }
  }

  const platform = PLATFORMS.find((p) => p.id === item.platform);
  const status   = STATUS_CONFIG[item.status];
  const StatusIcon = status.icon;
  const goalColor = item.post_goal ? (POST_GOAL_COLORS[item.post_goal] ?? C.textMuted) : null;

  return (
    <div
      className="w-full md:w-[300px] flex-none flex flex-col overflow-hidden"
      style={{ borderLeft: `1px solid ${C.borderSubtle}`, background: "oklch(0.07 0 0)" }}
    >
      {/* Panel header */}
      <div className="h-[52px] px-4 flex items-center gap-3 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <PlatformIcon platform={item.platform} size={14} />
        <span className="flex-1 text-[12px] font-semibold truncate" style={{ color: C.textSecondary }}>
          {item.content_type}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: C.textMuted }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4">
        {/* Title */}
        {editing ? (
          <input
            className="w-full text-[13px] font-semibold bg-transparent outline-none"
            style={{ color: C.textPrimary, borderBottom: `1px solid ${C.borderNormal}` }}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        ) : (
          <div className="text-[13px] font-semibold leading-snug" style={{ color: C.textPrimary }}>{item.title}</div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}` }}>
            <PlatformIcon platform={item.platform} size={10} />
            <span className="text-[10px] font-medium" style={{ color: platform?.color ?? C.textTertiary }}>{item.platform}</span>
          </div>

          <button
            onClick={() => {
              const order: ContentStatus[] = ["planned", "drafted", "posted"];
              const next = order[(order.indexOf(item.status) + 1) % order.length];
              onStatusChange(item.id, next);
            }}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-100"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}` }}
          >
            <StatusIcon style={{ height: 10, width: 10, color: status.color }} />
            <span className="text-[10px] font-medium" style={{ color: status.color }}>{status.label}</span>
          </button>

          {item.scheduled_time && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textTertiary }}>
              <Clock className="h-3 w-3" /> {item.scheduled_time}
            </div>
          )}
        </div>

        {/* Hook */}
        {(item.hook || editing) && (
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 flex items-center gap-1.5" style={{ color: C.textQuaternary }}>
              <Lightbulb className="h-3 w-3" /> Hook
            </div>
            {editing ? (
              <textarea rows={2} className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.hook ?? ""} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} />
            ) : (
              <p className="text-[12px] leading-relaxed font-medium" style={{ color: C.textSecondary }}>{item.hook}</p>
            )}
          </div>
        )}

        {/* Content Idea */}
        {(item.content_idea || editing) && (
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 flex items-center gap-1.5" style={{ color: C.textQuaternary }}>
              <MessageSquare className="h-3 w-3" /> Content Idea
            </div>
            {editing ? (
              <textarea rows={3} className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.content_idea ?? ""} onChange={(e) => setDraft({ ...draft, content_idea: e.target.value })} />
            ) : (
              <p className="text-[12px] leading-relaxed" style={{ color: C.textSecondary }}>{item.content_idea}</p>
            )}
          </div>
        )}

        {/* Caption */}
        {(item.caption || editing) && (
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 flex items-center gap-1.5" style={{ color: C.textQuaternary }}>
              <AlignLeft className="h-3 w-3" /> Caption
            </div>
            {editing ? (
              <textarea rows={4} className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.caption ?? ""} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
            ) : (
              <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: C.textTertiary }}>{item.caption}</p>
            )}
          </div>
        )}

        {/* CTA */}
        {(item.cta || editing) && (
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 flex items-center gap-1.5" style={{ color: C.textQuaternary }}>
              <ArrowRight className="h-3 w-3" /> Call to Action
            </div>
            {editing ? (
              <textarea rows={2} className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.cta ?? ""} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
            ) : (
              <p className="text-[12px] leading-relaxed" style={{ color: C.textSecondary }}>{item.cta}</p>
            )}
          </div>
        )}

        {/* Creative direction */}
        {(item.creative_direction || editing) && (
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 flex items-center gap-1.5" style={{ color: C.textQuaternary }}>
              <Zap className="h-3 w-3" /> Creative Direction
            </div>
            {editing ? (
              <textarea rows={3} className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.creative_direction ?? ""} onChange={(e) => setDraft({ ...draft, creative_direction: e.target.value })} />
            ) : (
              <p className="text-[12px] leading-relaxed" style={{ color: C.textTertiary }}>{item.creative_direction}</p>
            )}
          </div>
        )}

        {/* Why It Works */}
        {item.why_it_works && (
          <div className="rounded-xl px-3.5 py-3" style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid oklch(1 0 0 / 10%)` }}>
            <div className="text-[9.5px] uppercase tracking-[0.28em] mb-1.5 flex items-center gap-1.5" style={{ color: C.textQuaternary }}>
              <Lightbulb className="h-3 w-3" style={{ color: C.amber }} /> Why It Works
            </div>
            <p className="text-[11.5px] leading-relaxed" style={{ color: C.textSecondary }}>{item.why_it_works}</p>
          </div>
        )}

        {/* Post Goal + AI badge */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.post_goal && goalColor && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: `${goalColor.replace(")", " / 10%)")}`, border: `1px solid ${goalColor.replace(")", " / 25%)")}` }}>
              <Target className="h-2.5 w-2.5" style={{ color: goalColor }} />
              <span className="text-[10px] font-medium capitalize" style={{ color: goalColor }}>{item.post_goal}</span>
            </div>
          )}
          {item.ai_generated && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 14%)" }}>
              <Sparkles className="h-2.5 w-2.5" style={{ color: C.accent }} />
              <span className="text-[10px]" style={{ color: C.accent }}>AI generated</span>
            </div>
          )}
        </div>

        {/* Generate Visual — Higgsfield integration */}
        <GenerateVisualSection item={item} />
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 shrink-0 space-y-2" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
        {/* AI actions — only for AI-generated items in view mode */}
        {!editing && item.ai_generated && (
          <div className="flex gap-1.5">
            <button
              onClick={() => handleAIAction("regenerate_item")}
              disabled={regenerating || improving}
              className="flex-1 h-8 rounded-full text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid oklch(1 0 0 / 14%)`, color: C.textTertiary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
            >
              {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Regenerate
            </button>
            <button
              onClick={() => handleAIAction("improve_item")}
              disabled={regenerating || improving}
              className="flex-1 h-8 rounded-full text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid oklch(1 0 0 / 14%)`, color: C.textTertiary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.accent; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
            >
              {improving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Improve
            </button>
          </div>
        )}

        {/* Export row — always visible in view mode */}
        {!editing && (
          <div className="flex gap-1.5">
            <button
              onClick={() => copyToClipboard("caption", item.caption ?? item.hook ?? "")}
              className="flex-1 h-7 rounded-lg text-[10.5px] font-medium flex items-center justify-center gap-1 transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
              title="Copy caption to clipboard"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            >
              <Copy className="h-2.5 w-2.5" />
              {copiedKey === "caption" ? "Copied!" : "Copy caption"}
            </button>
            <button
              onClick={() => copyToClipboard("full", buildFullPostText())}
              className="flex-1 h-7 rounded-lg text-[10.5px] font-medium flex items-center justify-center gap-1 transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
              title="Copy full post content"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            >
              <Copy className="h-2.5 w-2.5" />
              {copiedKey === "full" ? "Copied!" : "Copy all"}
            </button>
            <button
              onClick={exportAsText}
              className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-100 shrink-0"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
              title="Export as text file"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        )}

        {editing ? (
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 h-8 rounded-full text-[11.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 10%)", border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}>
              Save
            </button>
            <button onClick={() => { setDraft(item); setEditing(false); }}
              className="h-8 px-3 rounded-full text-[11.5px] transition-all duration-100"
              style={{ color: C.textTertiary }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)}
              className="flex-1 h-8 rounded-full text-[11.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}>
              <FileEdit className="h-3 w-3 inline mr-1.5" />Edit
            </button>
            <button onClick={() => onDelete(item.id)}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-100"
              style={{ color: "oklch(0.52 0.15 24 / 55%)", border: `1px solid oklch(0.52 0.15 24 / 12%)` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.red; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.52 0.15 24 / 55%)"; }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Item Modal ─────────────────────────────────────────────────────────────

function AddItemModal({
  defaultDate,
  onClose,
  onAdd,
  userRole,
}: {
  defaultDate: string;
  onClose: () => void;
  onAdd: (item: Omit<ContentItem, "id" | "user_id">) => void;
  userRole: "creator" | "business";
}) {
  const [form, setForm] = useState({
    title:          "",
    platform:       "Instagram",
    content_type:   userRole === "creator" ? "Reel" : "Product Post",
    scheduled_date: defaultDate,
    scheduled_time: "12:00",
    status:         "planned" as ContentStatus,
    hook:           "",
    caption:        "",
    creative_direction: "",
  });

  const contentTypes = userRole === "creator" ? CONTENT_TYPES_CREATOR : CONTENT_TYPES_BUSINESS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    onAdd({
      ...form,
      scheduled_time:     form.scheduled_time || null,
      hook:               form.hook || null,
      content_idea:       null,
      caption:            form.caption || null,
      cta:                null,
      creative_direction: form.creative_direction || null,
      why_it_works:       null,
      post_goal:          null,
      notes:              null,
      ai_generated:       false,
      session_id:         null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "oklch(0 0 0 / 75%)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden modal-in"
        style={{ background: "oklch(0.10 0 0)", border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowPanel }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>Add Content Item</span>
          <button onClick={onClose} style={{ color: C.textMuted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] mb-1.5 block" style={{ color: C.textQuaternary }}>Title</label>
            <input
              required
              autoFocus
              className="w-full rounded-xl px-3 h-9 text-[13px] outline-none"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What's this content about?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] mb-1.5 block" style={{ color: C.textQuaternary }}>Platform</label>
              <select
                className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              >
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] mb-1.5 block" style={{ color: C.textQuaternary }}>Type</label>
              <select
                className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                value={form.content_type}
                onChange={(e) => setForm({ ...form, content_type: e.target.value })}
              >
                {contentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] mb-1.5 block" style={{ color: C.textQuaternary }}>Date</label>
              <input
                type="date"
                className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] mb-1.5 block" style={{ color: C.textQuaternary }}>Time</label>
              <input
                type="time"
                className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                value={form.scheduled_time}
                onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] mb-1.5 block" style={{ color: C.textQuaternary }}>Hook (optional)</label>
            <input
              className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
              value={form.hook}
              onChange={(e) => setForm({ ...form, hook: e.target.value })}
              placeholder="Opening line or scroll-stopper…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-full text-[12.5px] font-medium transition-all duration-100"
              style={{ border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-9 rounded-full text-[12.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 10%)", border: `1px solid ${C.borderStrong}`, color: C.textPrimary }}
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MENA Regional Events ───────────────────────────────────────────────────────

interface MenaEvent {
  key: string;   // i18n key
  emoji: string;
  color: string;
  range?: boolean; // true = the event spans a range (start marker)
}

const MENA_EVENTS: Record<string, MenaEvent> = {
  // 2026 — Ramadan (approx. March 10 – April 8)
  "2026-03-10": { key: "event.ramadan_start", emoji: "🌙", color: "oklch(0.70 0.08 68)", range: true },
  "2026-04-08": { key: "event.ramadan_end",   emoji: "🌙", color: "oklch(0.70 0.08 68)" },
  // 2026 — Eid al-Fitr (approx. April 9–11)
  "2026-04-09": { key: "event.eid_fitr", emoji: "🌙✨", color: "oklch(0.62 0.12 158)", range: true },
  "2026-04-10": { key: "event.eid_fitr", emoji: "🌙✨", color: "oklch(0.62 0.12 158)" },
  "2026-04-11": { key: "event.eid_fitr", emoji: "🌙✨", color: "oklch(0.62 0.12 158)" },
  // 2026 — Eid al-Adha (approx. June 16–18)
  "2026-06-16": { key: "event.eid_adha", emoji: "🐑", color: "oklch(0.62 0.12 158)", range: true },
  "2026-06-17": { key: "event.eid_adha", emoji: "🐑", color: "oklch(0.62 0.12 158)" },
  "2026-06-18": { key: "event.eid_adha", emoji: "🐑", color: "oklch(0.62 0.12 158)" },
  // Jordan Independence Day
  "2026-05-25": { key: "event.jordan_ind", emoji: "🇯🇴", color: "oklch(0.55 0.10 30)" },
  // Kuwait National Day
  "2026-02-25": { key: "event.kuwait_national", emoji: "🇰🇼", color: "oklch(0.55 0.10 145)" },
  "2026-02-26": { key: "event.kuwait_national", emoji: "🇰🇼", color: "oklch(0.55 0.10 145)" },
  // Saudi National Day
  "2026-09-23": { key: "event.saudi_national", emoji: "🇸🇦", color: "oklch(0.55 0.10 145)" },
  // Back to School (UAE/GCC — late Aug)
  "2026-08-31": { key: "event.back_to_school", emoji: "🎒", color: "oklch(0.72 0.10 224)" },
  // Lebanese Independence Day
  "2026-11-22": { key: "event.lebanese_ind", emoji: "🇱🇧", color: "oklch(0.55 0.15 25)" },
  // White Friday 2026 (Nov 27)
  "2026-11-27": { key: "event.white_friday", emoji: "🛍️", color: "oklch(0.72 0.10 224)" },
  // UAE National Day
  "2026-12-02": { key: "event.uae_national", emoji: "🇦🇪", color: "oklch(0.55 0.10 145)", range: true },
  "2026-12-03": { key: "event.uae_national", emoji: "🇦🇪", color: "oklch(0.55 0.10 145)" },
  // 2027 — Ramadan (approx. Feb 28 – Mar 29)
  "2027-02-28": { key: "event.ramadan_start", emoji: "🌙", color: "oklch(0.70 0.08 68)", range: true },
  "2027-03-29": { key: "event.ramadan_end",   emoji: "🌙", color: "oklch(0.70 0.08 68)" },
  // 2027 — Eid al-Fitr (approx. Mar 30–31)
  "2027-03-30": { key: "event.eid_fitr", emoji: "🌙✨", color: "oklch(0.62 0.12 158)", range: true },
  "2027-03-31": { key: "event.eid_fitr", emoji: "🌙✨", color: "oklch(0.62 0.12 158)" },
  // 2027 — Eid al-Adha (approx. Jun 5–7)
  "2027-06-05": { key: "event.eid_adha", emoji: "🐑", color: "oklch(0.62 0.12 158)", range: true },
  "2027-06-06": { key: "event.eid_adha", emoji: "🐑", color: "oklch(0.62 0.12 158)" },
  "2027-06-07": { key: "event.eid_adha", emoji: "🐑", color: "oklch(0.62 0.12 158)" },
  // Recurring annual dates (2027 repeats)
  "2027-05-25": { key: "event.jordan_ind",     emoji: "🇯🇴", color: "oklch(0.55 0.10 30)" },
  "2027-09-23": { key: "event.saudi_national", emoji: "🇸🇦", color: "oklch(0.55 0.10 145)" },
  "2027-11-22": { key: "event.lebanese_ind",   emoji: "🇱🇧", color: "oklch(0.55 0.15 25)" },
  "2027-11-26": { key: "event.white_friday",   emoji: "🛍️", color: "oklch(0.72 0.10 224)" },
  "2027-12-02": { key: "event.uae_national",   emoji: "🇦🇪", color: "oklch(0.55 0.10 145)", range: true },
  "2027-12-03": { key: "event.uae_national",   emoji: "🇦🇪", color: "oklch(0.55 0.10 145)" },
};

// ── Calendar helpers ───────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Monthly calendar view ─────────────────────────────────────────────────────

function MonthView({
  year, month, items, selectedDate, onSelectDate, onItemSelect, onStatusCycle, onAddClick,
}: {
  year: number; month: number;
  items: ContentItem[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onItemSelect: (item: ContentItem) => void;
  onStatusCycle: (item: ContentItem) => void;
  onAddClick: (date: string) => void;
}) {
  const { t } = useI18n();
  const daysInMonth   = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfMonth(year, month);
  const today         = new Date().toISOString().split("T")[0];

  const byDate: Record<string, ContentItem[]> = {};
  for (const item of items) {
    const d = item.scheduled_date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(item);
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex-1 overflow-auto min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: C.textQuaternary }}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="grid grid-cols-7"
          style={{
            borderBottom: wi < weeks.length - 1 ? `1px solid ${C.borderSubtle}` : "none",
            minHeight: 100,
          }}
        >
          {week.map((day, di) => {
            if (!day) return (
              <div key={di} style={{ borderRight: di < 6 ? `1px solid ${C.borderSubtle}` : "none", minHeight: 100 }} />
            );
            const dateStr  = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayItems = byDate[dateStr] ?? [];
            const isToday  = dateStr === today;
            const isSelected = dateStr === selectedDate;

            return (
              <div
                key={di}
                onClick={() => onSelectDate(dateStr)}
                className="p-1.5 cursor-pointer transition-colors duration-100 relative group"
                style={{
                  borderRight: di < 6 ? `1px solid ${C.borderSubtle}` : "none",
                  background:  isSelected ? "oklch(1 0 0 / 4%)" : "transparent",
                  minHeight:   100,
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 2.5%)"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{
                      background: isToday ? C.accent : "transparent",
                      color:      isToday ? "#000" : C.textTertiary,
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {day}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddClick(dateStr); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-md flex items-center justify-center"
                    style={{ background: "oklch(1 0 0 / 8%)" }}
                  >
                    <Plus style={{ height: 10, width: 10, color: C.textMuted }} />
                  </button>
                </div>

                {/* MENA regional event badge */}
                {MENA_EVENTS[dateStr] && (
                  <div
                    className="flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold truncate"
                    style={{
                      background: `${MENA_EVENTS[dateStr].color}18`,
                      border:     `1px solid ${MENA_EVENTS[dateStr].color}30`,
                      color:      MENA_EVENTS[dateStr].color,
                    }}
                    title={t(MENA_EVENTS[dateStr].key)}
                  >
                    <span style={{ fontSize: 9 }}>{MENA_EVENTS[dateStr].emoji}</span>
                    <span className="truncate">{t(MENA_EVENTS[dateStr].key)}</span>
                  </div>
                )}

                {/* Items */}
                {dayItems.slice(0, 3).map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onSelect={onItemSelect}
                    onStatusCycle={onStatusCycle}
                  />
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[9px] px-1" style={{ color: C.textMuted }}>
                    +{dayItems.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Weekly calendar view ──────────────────────────────────────────────────────

function WeekView({
  weekStart, items, onItemSelect, onStatusCycle, onAddClick,
}: {
  weekStart: Date;
  items: ContentItem[];
  onItemSelect: (item: ContentItem) => void;
  onStatusCycle: (item: ContentItem) => void;
  onAddClick: (date: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byDate: Record<string, ContentItem[]> = {};
  for (const item of items) {
    if (!byDate[item.scheduled_date]) byDate[item.scheduled_date] = [];
    byDate[item.scheduled_date].push(item);
  }

  return (
    <div className="flex-1 overflow-auto flex min-h-0">
      {days.map((day, i) => {
        const dateStr  = day.toISOString().split("T")[0];
        const dayItems = byDate[dateStr] ?? [];
        const isToday  = dateStr === today;

        return (
          <div
            key={i}
            className="flex-1 flex flex-col"
            style={{ borderRight: i < 6 ? `1px solid ${C.borderSubtle}` : "none" }}
          >
            {/* Day header */}
            <div
              className="px-3 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: isToday ? "oklch(1 0 0 / 6%)" : "transparent" }}
            >
              <div className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-0.5" style={{ color: C.textMuted }}>
                {DAY_NAMES[day.getDay()]}
              </div>
              <div
                className="text-[18px] font-semibold"
                style={{ color: isToday ? C.accent : C.textSecondary }}
              >
                {day.getDate()}
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 p-2 overflow-y-auto">
              {dayItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onSelect={onItemSelect}
                  onStatusCycle={onStatusCycle}
                />
              ))}
              <button
                onClick={() => onAddClick(dateStr)}
                className="w-full rounded-xl px-2 py-2 text-[10px] transition-all duration-100 mt-1 flex items-center justify-center gap-1"
                style={{ color: C.textMuted, border: `1px dashed ${C.borderSubtle}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
              >
                <Plus style={{ height: 9, width: 9 }} /> Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Daily view ────────────────────────────────────────────────────────────────

function DayView({
  date, items, onItemSelect, onStatusCycle, onAddClick,
}: {
  date: Date;
  items: ContentItem[];
  onItemSelect: (item: ContentItem) => void;
  onStatusCycle: (item: ContentItem) => void;
  onAddClick: (date: string) => void;
}) {
  const dateStr  = date.toISOString().split("T")[0];
  const dayItems = items.filter((item) => item.scheduled_date === dateStr);
  const today    = new Date().toISOString().split("T")[0];
  const isToday  = dateStr === today;

  return (
    <div className="flex-1 overflow-auto min-h-0 px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-[20px] font-bold"
            style={{ background: isToday ? "oklch(1 0 0 / 15%)" : "oklch(1 0 0 / 6%)", color: isToday ? C.accent : C.textSecondary }}
          >
            {date.getDate()}
          </div>
          <div>
            <div className="text-[16px] font-semibold" style={{ color: C.textPrimary }}>
              {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            {isToday && <div className="text-[11px]" style={{ color: C.accent }}>Today</div>}
          </div>
          <button
            onClick={() => onAddClick(dateStr)}
            className="ml-auto flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-medium transition-all duration-100"
            style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
          >
            <Plus className="h-3 w-3" /> Add Content
          </button>
        </div>

        {dayItems.length === 0 ? (
          <div
            className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
            style={{ background: "oklch(1 0 0 / 2%)", border: `1px dashed ${C.borderSubtle}` }}
          >
            <CalendarDays className="h-8 w-8 mb-3" style={{ color: C.textMuted }} />
            <div className="text-[13px] font-medium mb-1" style={{ color: C.textTertiary }}>Nothing scheduled</div>
            <div className="text-[11px] mb-4" style={{ color: C.textMuted }}>Add content or generate a plan for this day.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {dayItems
              .sort((a, b) => (a.scheduled_time ?? "00:00").localeCompare(b.scheduled_time ?? "00:00"))
              .map((item) => {
                const status = STATUS_CONFIG[item.status];
                return (
                  <div
                    key={item.id}
                    onClick={() => onItemSelect(item)}
                    className="flex items-start gap-4 rounded-2xl p-4 cursor-pointer transition-all duration-100"
                    style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                  >
                    {item.scheduled_time && (
                      <div className="shrink-0 text-[11px] font-mono font-medium w-12 mt-0.5" style={{ color: C.textTertiary }}>
                        {item.scheduled_time.slice(0, 5)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PlatformIcon platform={item.platform} size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.textTertiary }}>{item.content_type}</span>
                        <span
                          className="ml-auto text-[9px] font-semibold uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
                          style={{ background: `${status.color.replace(")", " / 12%)")}`, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: C.textPrimary }}>{item.title}</div>
                      {item.hook && <div className="text-[11.5px]" style={{ color: C.textTertiary }}>{item.hook}</div>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Calendar Intelligence types ────────────────────────────────────────────

type AIRecommendation = {
  title:      string;
  why:        string;
  format:     string;
  confidence: "high" | "medium";
  emoji:      string;
};

type PreciseTime = {
  rank:                number;
  time:                string;   // "8:17 PM"
  confidence:          number;   // 0–100
  expected_reach_lift: number;   // percentage e.g. 31
  format:              string;   // "Reel" | "Story" | "Carousel"
  reason:              string;
};

type BestDay = {
  day:        string;
  time:       string;
  confidence: number;
  reason?:    string;
};

type PostingIntelligence = {
  region:               string;
  timezone:             string;
  baseline_score:       number;
  top_times_today:      PreciseTime[];
  best_day_this_week:   BestDay | null;
  best_day_this_month:  BestDay | null;
};

type CalendarIntelligence = {
  recommendations:     AIRecommendation[];
  trends:              string[];
  posting_intelligence: PostingIntelligence;
};

// ── Confidence ring SVG ───────────────────────────────────────────────────────

function ConfidenceRing({ score, size = 44 }: { score: number; size?: number }) {
  const r        = (size - 6) / 2;
  const circ     = 2 * Math.PI * r;
  const filled   = (score / 100) * circ;
  const color    = score >= 88 ? C.green : score >= 78 ? C.accent : C.amber;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 8%)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill={color} fontSize={10} fontWeight={700} fontFamily="inherit">
        {score}%
      </text>
    </svg>
  );
}

// ── AI Intelligence Panel ─────────────────────────────────────────────────────

function AIIntelligencePanel({
  userProfile, userRole, onClose,
}: {
  userProfile: UserProfile | null;
  userRole:    "creator" | "business";
  onClose:     () => void;
}) {
  const { user }  = useAuth();
  const { t }     = useI18n();
  const [intel,   setIntel]   = useState<CalendarIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const cacheKey = `mrkt_cal_intel_v2_${user?.id}_${new Date().toISOString().slice(0, 10)}`;

  const load = useCallback(async (force = false) => {
    if (!user) return;
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) { setIntel(JSON.parse(cached)); return; }
      } catch { /* */ }
    }
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-intelligence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            role:              userRole,
            niche:             userProfile?.niche ?? userProfile?.categories?.[0] ?? "",
            platforms:         userProfile?.platforms ?? [],
            location:          userProfile?.location ?? userProfile?.audience_location ?? "",
            audience_location: userProfile?.audience_location ?? "",
            categories:        userProfile?.categories ?? [],
            industry:          userProfile?.niche ?? "",
            account_type:      userProfile?.account_type ?? "",
          }),
        },
      );
      if (!res.ok) throw new Error("AI unavailable");
      const data: CalendarIntelligence = await res.json();
      setIntel(data);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI unavailable");
    } finally {
      setLoading(false);
    }
  }, [user, userProfile, userRole, cacheKey]);

  useEffect(() => { if (userProfile) load(); }, [userProfile, load]);

  const pi = intel?.posting_intelligence;
  const top = pi?.top_times_today ?? [];
  const [best, ...rest] = top;

  return (
    <div
      className="hidden md:flex flex-col overflow-hidden"
      style={{ width: 308, flexShrink: 0, borderLeft: `1px solid ${C.borderSubtle}`, background: "oklch(0.065 0 0)" }}
    >
      {/* Header */}
      <div
        className="h-[44px] px-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" style={{ color: C.accent }} />
          <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>
            Posting Intelligence
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: C.textMuted }}
            title="Refresh"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = ""; }}
          >
            <RefreshIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = ""; }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">

        {/* Region badge */}
        {pi?.region && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" style={{ color: C.textMuted }} />
            <span className="text-[11px]" style={{ color: C.textTertiary }}>{pi.region}</span>
            {pi.timezone && (
              <span className="text-[10px] ml-0.5" style={{ color: C.textMuted }}>· {pi.timezone}</span>
            )}
          </div>
        )}

        {/* ── BEST TIMES TODAY ──────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="h-3 w-3" style={{ color: C.amber }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: C.textQuaternary }}>
              Best times today
            </span>
          </div>

          {loading && !intel && (
            <div className="space-y-2.5">
              <div className="skeleton rounded-2xl" style={{ height: 110 }} />
              <div className="grid grid-cols-2 gap-2">
                <div className="skeleton rounded-xl" style={{ height: 80 }} />
                <div className="skeleton rounded-xl" style={{ height: 80 }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-3 py-3 text-[12px]" style={{ background: "oklch(0.52 0.15 24 / 8%)", border: `1px solid oklch(0.52 0.15 24 / 18%)`, color: C.textTertiary }}>
              AI unavailable — check connection.
            </div>
          )}

          {/* #1 — Large hero card */}
          {best && (
            <div
              className="rounded-2xl p-4 mb-2.5 relative overflow-hidden"
              style={{ background: "oklch(0.62 0.12 158 / 7%)", border: `1px solid oklch(0.62 0.12 158 / 20%)` }}
            >
              {/* Rank badge */}
              <div
                className="absolute top-3 left-3 h-5 px-2 rounded-full flex items-center gap-1"
                style={{ background: C.green, color: "#000" }}
              >
                <span className="text-[9px] font-black tracking-widest">#1 BEST</span>
              </div>

              <div className="flex items-start justify-between mt-5">
                <div>
                  <div className="text-[22px] font-black tabular-nums leading-none" style={{ color: C.textPrimary }}>
                    {best.time}
                  </div>
                  <div className="text-[10px] font-semibold mt-1 uppercase tracking-[0.14em]" style={{ color: C.textMuted }}>
                    {best.format}
                  </div>
                </div>
                <ConfidenceRing score={best.confidence} size={48} />
              </div>

              {/* Reach lift */}
              <div
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1"
                style={{ background: "oklch(0.62 0.12 158 / 12%)", border: `1px solid oklch(0.62 0.12 158 / 22%)` }}
              >
                <TrendingUp className="h-3 w-3" style={{ color: C.green }} />
                <span className="text-[11px] font-bold" style={{ color: C.green }}>
                  +{best.expected_reach_lift}% expected reach
                </span>
              </div>

              {/* Reason */}
              <p className="text-[11px] leading-relaxed mt-2.5" style={{ color: C.textTertiary }}>
                {best.reason}
              </p>
            </div>
          )}

          {/* #2 and #3 — Side by side */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {rest.map((t2) => (
                <div
                  key={t2.rank}
                  className="rounded-xl p-3 relative"
                  style={{ background: "oklch(1 0 0 / 3.5%)", border: `1px solid ${C.borderFaint}` }}
                >
                  <div
                    className="text-[9px] font-black tracking-widest mb-2"
                    style={{ color: t2.rank === 2 ? C.accent : C.textMuted }}
                  >
                    #{t2.rank}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[15px] font-black tabular-nums leading-none" style={{ color: C.textPrimary }}>
                      {t2.time}
                    </div>
                  </div>
                  <div className="text-[9.5px] mb-2" style={{ color: C.textMuted }}>{t2.format}</div>
                  <ConfidenceRing score={t2.confidence} size={36} />
                  <div className="text-[10px] font-semibold mt-1.5" style={{ color: C.green }}>
                    +{t2.expected_reach_lift}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Performance comparison */}
          {best && rest[0] && pi && (
            <div
              className="mt-2.5 rounded-xl px-3 py-2.5"
              style={{ background: "oklch(1 0 0 / 2.5%)", border: `1px solid ${C.borderFaint}` }}
            >
              <div className="text-[9.5px] uppercase tracking-[0.2em] mb-2" style={{ color: C.textMuted }}>
                Performance comparison
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-center">
                  <div className="text-[11px] font-bold tabular-nums" style={{ color: C.green }}>{best.time}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: C.textMuted }}>{best.confidence}% score</div>
                </div>
                <div className="text-[9px]" style={{ color: C.textMuted }}>vs</div>
                <div className="flex-1 text-center">
                  <div className="text-[11px] font-bold tabular-nums" style={{ color: C.textTertiary }}>{rest[0].time}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: C.textMuted }}>{rest[0].confidence}% score</div>
                </div>
                <div
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: "oklch(0.62 0.12 158 / 10%)", color: C.green }}
                >
                  +{best.expected_reach_lift - rest[0].expected_reach_lift}%
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── BEST DAY THIS WEEK ────────────────────────────────── */}
        {(pi?.best_day_this_week || loading) && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Calendar className="h-3 w-3" style={{ color: C.accent }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: C.textQuaternary }}>
                Best day this week
              </span>
            </div>
            {loading && !intel ? (
              <div className="skeleton rounded-xl" style={{ height: 60 }} />
            ) : pi?.best_day_this_week && (
              <div
                className="rounded-xl px-3 py-3"
                style={{ background: "oklch(0.55 0.12 270 / 6%)", border: `1px solid oklch(0.55 0.12 270 / 16%)` }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-[14px] font-black" style={{ color: C.textPrimary }}>
                      {pi.best_day_this_week.day}
                    </span>
                    <span className="text-[11px] ml-2 tabular-nums" style={{ color: C.accent }}>
                      {pi.best_day_this_week.time}
                    </span>
                  </div>
                  <ConfidenceRing score={pi.best_day_this_week.confidence} size={36} />
                </div>
                {pi.best_day_this_week.reason && (
                  <p className="text-[11px] leading-snug" style={{ color: C.textTertiary }}>
                    {pi.best_day_this_week.reason}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── BEST DAY THIS MONTH ───────────────────────────────── */}
        {(pi?.best_day_this_month || loading) && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <BarChart2 className="h-3 w-3" style={{ color: C.amber }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: C.textQuaternary }}>
                Best day this month
              </span>
            </div>
            {loading && !intel ? (
              <div className="skeleton rounded-xl" style={{ height: 52 }} />
            ) : pi?.best_day_this_month && (
              <div
                className="rounded-xl px-3 py-3"
                style={{ background: "oklch(0.75 0.14 60 / 6%)", border: `1px solid oklch(0.75 0.14 60 / 16%)` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-black" style={{ color: C.textPrimary }}>
                      {pi.best_day_this_month.day}
                    </span>
                    <span className="text-[11px] ml-2 tabular-nums" style={{ color: C.amber }}>
                      {pi.best_day_this_month.time}
                    </span>
                  </div>
                  <ConfidenceRing score={pi.best_day_this_month.confidence} size={36} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── RECOMMENDED THIS WEEK ─────────────────────────────── */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-3 w-3" style={{ color: C.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: C.textQuaternary }}>
              Recommended this week
            </span>
          </div>
          {loading && !intel && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton rounded-xl" style={{ height: 72 }} />
              ))}
            </div>
          )}
          {intel?.recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-xl px-3 py-3 mb-2 last:mb-0"
              style={{ background: "oklch(1 0 0 / 3.5%)", border: `1px solid ${C.borderFaint}` }}
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span style={{ fontSize: 14, lineHeight: 1 }}>{rec.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold leading-snug" style={{ color: C.textPrimary }}>
                    {rec.title}
                  </div>
                  <div
                    className="text-[9.5px] uppercase tracking-[0.18em] font-semibold mt-0.5"
                    style={{ color: rec.confidence === "high" ? C.green : C.amber }}
                  >
                    {rec.confidence} confidence · {rec.format}
                  </div>
                </div>
              </div>
              <p className="text-[11.5px] leading-relaxed" style={{ color: C.textTertiary }}>
                {rec.why}
              </p>
            </div>
          ))}
        </section>

        {/* ── TRENDING NOW ──────────────────────────────────────── */}
        {intel?.trends && intel.trends.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="h-3 w-3" style={{ color: C.green }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: C.textQuaternary }}>
                Trending in your region
              </span>
            </div>
            <div className="space-y-1.5">
              {intel.trends.map((trend, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg px-3 py-2"
                  style={{ background: "oklch(0.62 0.12 158 / 6%)", border: `1px solid oklch(0.62 0.12 158 / 12%)` }}
                >
                  <span className="text-[10px] font-bold tabular-nums mt-0.5" style={{ color: C.green }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11.5px] leading-snug" style={{ color: C.textSecondary }}>{trend}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="text-[10px] text-center pb-2" style={{ color: C.textMuted }}>
          Updated daily · Powered by Claude AI
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ContentPlannerPage() {
  const { user } = useAuth();

  const [items,           setItems]          = useState<ContentItem[]>([]);
  const [loading,         setLoading]        = useState(true);
  const [generating,      setGenerating]     = useState(false);
  const [generatingStep,  setGeneratingStep] = useState(0);
  const [generatingCount, setGeneratingCount] = useState(5);
  const [showGenModal,    setShowGenModal]   = useState(false);
  const [view,            setView]           = useState<CalendarView>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "daily" : "monthly"
  );
  const [currentDate,    setCurrentDate]   = useState(new Date());
  const [selectedItem,   setSelectedItem]  = useState<ContentItem | null>(null);
  const [showAddModal,   setShowAddModal]  = useState(false);
  const [addModalDate,   setAddModalDate]  = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [userProfile,    setUserProfile]   = useState<UserProfile | null>(null);
  const [showAIPanel,    setShowAIPanel]   = useState(true);

  const userRole: "creator" | "business" = (() => {
    if (!userProfile) return "creator";
    const p = userProfile;
    const isBiz = p.account_type === "brand" || p.account_type === "business" ||
      p.onboarding_path === "business_creator" || p.onboarding_path === "business_marketing";
    return isBiz ? "business" : "creator";
  })();

  // Load user profile — full creator profile for AI context
  useEffect(() => {
    if (!user) return;
    // Fetch both profiles in parallel
    Promise.all([
      supabase.from("profiles").select("name,account_type,onboarding_path,niche,platforms").eq("id", user.id).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("creator_profiles")
        .select("display_name,bio,niche,categories,platforms,location,audience_location,audience_age_range,audience_gender_split,follower_count,rate_range,preferred_content_types")
        .eq("user_id", user.id).maybeSingle(),
    ]).then(([{ data: base }, { data: creator }]) => {
      setUserProfile({
        ...(base as Partial<UserProfile> ?? {}),
        ...(creator as Partial<UserProfile> ?? {}),
      } as UserProfile);
    });
  }, [user]);

  // Load planner items
  const loadItems = useCallback(() => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase
      .from("content_planner_items")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as ContentItem[]);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Refresh when AI Strategist adds items from the chat
  useEffect(() => {
    window.addEventListener("mrkt:content-plan-updated", loadItems);
    return () => window.removeEventListener("mrkt:content-plan-updated", loadItems);
  }, [loadItems]);

  // Filter items by platform
  const visibleItems = platformFilter.length > 0
    ? items.filter((i) => platformFilter.includes(i.platform))
    : items;

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "monthly") d.setMonth(d.getMonth() + dir);
    else if (view === "weekly") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function goToday() { setCurrentDate(new Date()); }

  const weekStart = useCallback(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  function headerTitle() {
    if (view === "monthly") return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "weekly") {
      const ws = weekStart();
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      }
      return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  // ── CRUD helpers ───────────────────────────────────────────────────────────

  async function addItem(itemData: Omit<ContentItem, "id" | "user_id">) {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from("content_planner_items")
      .insert([{ ...itemData, user_id: user.id }])
      .select()
      .single();
    if (error) { toast.error("Failed to add item."); return; }
    setItems((prev) => [...prev, data as ContentItem].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)));
    setShowAddModal(false);
    toast.success("Content item added.");
  }

  async function updateItem(updated: ContentItem) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("content_planner_items")
      .update(updated)
      .eq("id", updated.id);
    if (error) { toast.error("Failed to save."); return; }
    setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
  }

  async function deleteItem(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("content_planner_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItem(null);
    toast.success("Removed.");
  }

  async function cycleStatus(item: ContentItem) {
    const order: ContentStatus[] = ["planned", "drafted", "posted"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    await updateItem({ ...item, status: next });
  }

  // ── AI plan generation ─────────────────────────────────────────────────────

  async function generatePlan(goal: string, frequency: number, weeks: 1 | 4) {
    if (!user) return;

    const platforms = (userProfile?.platforms ?? ["Instagram", "TikTok"]).filter(Boolean);
    const niche     = userProfile?.niche ?? userProfile?.display_name ?? "content creation";
    const postCount = weeks === 1 ? Math.min(frequency, 7) : Math.min(frequency * 4, 24);

    setShowGenModal(false);
    setGenerating(true);
    setGeneratingStep(0);
    setGeneratingCount(postCount);

    // Animate steps — real completion tied to the fetch
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    stepTimers.push(setTimeout(() => setGeneratingStep(1), 1500));
    stepTimers.push(setTimeout(() => setGeneratingStep(2), 3000));

    try {
      const startDate = view === "monthly"
        ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        : weekStart();
      const startISO = startDate.toISOString().split("T")[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.functions.invoke("content-plan-generate", {
        body: { weeks, start_date: startISO, goal, frequency, platforms, action: "generate" },
      });

      stepTimers.forEach(clearTimeout);

      if (error) throw new Error(error.message ?? "Generation failed");
      if (!data?.items?.length) throw new Error("No items returned from AI");

      setGeneratingStep(3);

      const itemsWithUser = (data.items as Omit<ContentItem, "id" | "user_id">[])
        .map((g) => ({ ...g, user_id: user!.id }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: saved, error: insertErr } = await supabase
        .from("content_planner_items")
        .insert(itemsWithUser)
        .select();

      if (insertErr) throw insertErr;

      setItems((prev) => [
        ...prev,
        ...(saved as ContentItem[]),
      ].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)));

      toast.success(`${saved.length} posts generated — your ${weeks === 1 ? "week" : "month"} is planned.`);
    } catch (err) {
      stepTimers.forEach(clearTimeout);
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
      setGeneratingStep(0);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  // ── Export helpers ─────────────────────────────────────────────────────────

  function getVisibleItems(): ContentItem[] {
    if (view === "monthly") {
      const y = currentDate.getFullYear(), m = currentDate.getMonth();
      return items.filter((i) => {
        const d = new Date(i.scheduled_date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    if (view === "weekly") {
      const ws = weekStart();
      const we = new Date(ws); we.setDate(we.getDate() + 7);
      return items.filter((i) => {
        const d = new Date(i.scheduled_date);
        return d >= ws && d < we;
      });
    }
    const dateStr = currentDate.toISOString().split("T")[0];
    return items.filter((i) => i.scheduled_date === dateStr);
  }

  function exportPlanAsText() {
    const visible = getVisibleItems();
    if (!visible.length) { toast.info("No content in this view to export."); return; }
    const lines: string[] = [`MRKT CONTENT PLAN — ${headerTitle()}`, ""];
    visible.forEach((it) => {
      lines.push(`━━━ ${it.scheduled_date} · ${it.platform} · ${it.content_type} ━━━`);
      if (it.title) lines.push(`TITLE: ${it.title}`);
      if (it.hook) lines.push(`HOOK: ${it.hook}`);
      if (it.caption) lines.push(`CAPTION: ${it.caption}`);
      if (it.cta) lines.push(`CTA: ${it.cta}`);
      if (it.creative_direction) lines.push(`DIRECTION: ${it.creative_direction}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mrkt-calendar-${headerTitle().replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visible.length} posts.`);
  }

  return (
    <div className="flex flex-col overflow-hidden h-full" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* Top bar */}
      <div
        className="min-h-[52px] px-5 flex items-center gap-3 shrink-0 flex-wrap py-2 md:py-0 md:flex-nowrap md:h-[52px]"
        style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: "oklch(0.06 0 0)" }}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" style={{ color: C.textMuted }} />
        <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>Calendar</span>

        {userRole && (
          <span
            className="text-[9px] uppercase tracking-[0.22em] font-semibold rounded-full px-2 py-0.5 shrink-0"
            style={{
              background: userRole === "business" ? C.blueBg : C.borderFaint,
              color:      userRole === "business" ? C.aiBlue : C.textSecondary,
              border:     `1px solid ${userRole === "business" ? C.blueBorder : C.borderSubtle}`,
            }}
          >
            {userRole === "business" ? "Business" : "Creator"}
          </span>
        )}

        {/* Platform filters — hidden on mobile to avoid overflow */}
        <div className="hidden md:flex items-center gap-1.5 ml-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatformFilter((prev) =>
                prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
              )}
              className="h-7 px-2.5 rounded-full text-[10px] font-semibold transition-all duration-100"
              style={{
                background: platformFilter.includes(p.id) ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                border: `1px solid ${platformFilter.includes(p.id) ? "oklch(0.84 0 0 / 35%)" : C.borderSubtle}`,
                color: platformFilter.includes(p.id) ? p.color : C.textMuted,
              }}
            >
              {p.label}
            </button>
          ))}
          {platformFilter.length > 0 && (
            <button onClick={() => setPlatformFilter([])} style={{ color: C.textMuted }}>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* AI Intelligence toggle */}
          <button
            onClick={() => setShowAIPanel((v) => !v)}
            className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
            style={{
              background: showAIPanel ? "oklch(0.72 0.10 224 / 14%)" : "oklch(1 0 0 / 6%)",
              border: `1px solid ${showAIPanel ? "oklch(0.72 0.10 224 / 30%)" : C.borderSubtle}`,
              color: showAIPanel ? C.accent : C.textMuted,
            }}
            title="Toggle AI Intelligence panel"
          >
            <Brain className="h-3 w-3" />
            <span className="hidden sm:inline">Intelligence</span>
          </button>

          {/* Export button */}
          <button
            onClick={exportPlanAsText}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
            title="Export current view as text"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Generate AI plan button */}
          <button
            onClick={() => setShowGenModal(true)}
            disabled={generating}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
            style={{ background: "oklch(1 0 0 / 12%)", border: "1px solid oklch(1 0 0 / 25%)", color: C.accent }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 18%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
          >
            {generating
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />
            }
            <span className="hidden sm:inline">Generate Plan</span>
          </button>

          {/* Add item */}
          <button
            onClick={() => { setAddModalDate(today); setShowAddModal(true); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
            style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          >
            <Plus className="h-3 w-3" /><span className="hidden sm:inline"> Add</span>
          </button>
        </div>
      </div>

      {/* Calendar toolbar */}
      <div
        className="min-h-[44px] px-4 flex items-center gap-2 md:gap-4 shrink-0 flex-wrap py-1.5 md:py-0 md:flex-nowrap md:h-[44px]"
        style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: "oklch(0.065 0 0)" }}
      >
        {/* Nav arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-100"
            style={{ color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-100"
            style={{ color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>{headerTitle()}</span>

        <button
          onClick={goToday}
          className="h-7 px-3 rounded-full text-[11px] font-medium transition-all duration-100"
          style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
        >
          Today
        </button>

        {/* Stats — hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 ml-2">
          {(["planned", "drafted", "posted"] as ContentStatus[]).map((s) => {
            const cfg   = STATUS_CONFIG[s];
            const count = items.filter((i) => i.status === s).length;
            return count > 0 ? (
              <div key={s} className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
                <span className="text-[10px]" style={{ color: C.textMuted }}>{count} {cfg.label.toLowerCase()}</span>
              </div>
            ) : null;
          })}
        </div>

        {/* View toggle */}
        <div
          className="ml-auto flex rounded-lg overflow-hidden"
          style={{ border: `1px solid ${C.borderNormal}` }}
        >
          {(["monthly", "weekly", "daily"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 h-7 text-[11px] font-medium capitalize transition-all duration-100"
              style={{
                background: view === v ? "oklch(1 0 0 / 10%)" : "transparent",
                color:      view === v ? C.textPrimary : C.textTertiary,
                borderRight: v !== "daily" ? `1px solid ${C.borderSubtle}` : "none",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-row overflow-hidden" style={{ flex: "1 1 0%", minHeight: 0 }}>

        {/* Calendar */}
        <div className="flex flex-col overflow-hidden relative" style={{ flex: "1 1 0%", minWidth: 0 }}>
          {generating && (
            <GenerationOverlay
              step={generatingStep}
              niche={userProfile?.niche ?? "your niche"}
              postCount={generatingCount}
            />
          )}
          {loading ? (
            <div className="flex-1 overflow-hidden p-4">
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {/* Day headers */}
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                  <div key={d} className="skeleton" style={{ height: 14, borderRadius: 6 }} />
                ))}
                {/* Calendar cells */}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {view === "monthly" && (
                <MonthView
                  year={currentDate.getFullYear()}
                  month={currentDate.getMonth()}
                  items={visibleItems}
                  selectedDate={addModalDate}
                  onSelectDate={(d) => { setAddModalDate(d); }}
                  onItemSelect={setSelectedItem}
                  onStatusCycle={cycleStatus}
                  onAddClick={(d) => { setAddModalDate(d); setShowAddModal(true); }}
                />
              )}

              {view === "weekly" && (
                <WeekView
                  weekStart={weekStart()}
                  items={visibleItems}
                  onItemSelect={setSelectedItem}
                  onStatusCycle={cycleStatus}
                  onAddClick={(d) => { setAddModalDate(d); setShowAddModal(true); }}
                />
              )}

              {view === "daily" && (
                <DayView
                  date={currentDate}
                  items={visibleItems}
                  onItemSelect={setSelectedItem}
                  onStatusCycle={cycleStatus}
                  onAddClick={(d) => { setAddModalDate(d); setShowAddModal(true); }}
                />
              )}

              {/* Empty state — no items at all */}
              {!loading && items.length === 0 && !generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div
                    className="rounded-2xl px-8 py-8 flex flex-col items-center text-center pointer-events-auto"
                    style={{ background: "oklch(0.10 0 0 / 90%)", border: `1px solid ${C.borderNormal}`, backdropFilter: "blur(12px)", maxWidth: 380 }}
                  >
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid oklch(1 0 0 / 12%)` }}>
                      <Sparkles className="h-6 w-6" style={{ color: C.accent }} />
                    </div>
                    <div className="text-[15px] font-semibold mb-1.5" style={{ color: C.textPrimary }}>
                      Start with an AI content plan
                    </div>
                    <div className="text-[12px] mb-6 leading-relaxed" style={{ color: C.textTertiary }}>
                      Claude will craft a personalized strategy using your niche, audience, and goals — not generic templates.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowGenModal(true)}
                        disabled={generating}
                        className="flex items-center gap-2 rounded-full h-9 px-5 text-[12.5px] font-medium"
                        style={{ background: "oklch(1 0 0 / 15%)", border: "1px solid oklch(1 0 0 / 30%)", color: C.accent }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Plan
                      </button>
                      <button
                        onClick={() => { setAddModalDate(today); setShowAddModal(true); }}
                        className="flex items-center gap-2 rounded-full h-9 px-5 text-[12.5px] font-medium"
                        style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Manually
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* AI Intelligence panel — visible when no item is selected and panel is toggled on */}
        {showAIPanel && !selectedItem && (
          <AIIntelligencePanel
            userProfile={userProfile}
            userRole={userRole}
            onClose={() => setShowAIPanel(false)}
          />
        )}

        {/* Detail panel — side panel on desktop, full-screen overlay on mobile */}
        {selectedItem && (
          <>
            {/* Mobile overlay */}
            <div
              className="md:hidden fixed inset-0 z-50 flex flex-col"
              style={{ background: "oklch(0.07 0 0)" }}
            >
              <DetailPanel
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onDelete={deleteItem}
                onStatusChange={(id, status) => {
                  const item = items.find((i) => i.id === id);
                  if (item) updateItem({ ...item, status });
                }}
                onSave={updateItem}
              />
            </div>
            {/* Desktop side panel */}
            <div className="hidden md:contents">
              <DetailPanel
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onDelete={deleteItem}
                onStatusChange={(id, status) => {
                  const item = items.find((i) => i.id === id);
                  if (item) updateItem({ ...item, status });
                }}
                onSave={updateItem}
              />
            </div>
          </>
        )}
      </div>

      {/* Add item modal */}
      {showAddModal && (
        <AddItemModal
          defaultDate={addModalDate || today}
          onClose={() => setShowAddModal(false)}
          onAdd={addItem}
          userRole={userRole}
        />
      )}

      {/* Generate plan modal */}
      {showGenModal && !generating && (
        <GeneratePlanModal
          onClose={() => setShowGenModal(false)}
          onGenerate={generatePlan}
        />
      )}
    </div>
  );
}
