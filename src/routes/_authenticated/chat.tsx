import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus, Send, Sparkles, Trash2,
  Bookmark, BookmarkCheck, Zap, Users,
  FileText, Paperclip,
  Search, MoreHorizontal, ArrowUpRight,
  Activity, BarChart3, Lightbulb, PenLine,
  Copy, CalendarDays, CheckCircle2, Loader2,
  TrendingUp, ChevronRight, Wand2, Layers, Folder,
  MessageSquare, Globe, Eye, Briefcase, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "MRKT — AI marketing strategist" }] }),
  component: ChatPage,
});

type Msg  = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; updated_at: string };
type OnboardingPath = "creator" | "business_creator" | "business_marketing";

interface UserProfile {
  name: string | null;
  account_type: string | null;
  onboarding_path: OnboardingPath | null;
  niche: string | null;
  platforms: string[] | null;
  goal: string | null;
  business_stage: string | null;
}

interface BusinessProfile {
  company_name: string | null;
  industry: string | null;
  preferred_platforms: string[] | null;
  preferred_creator_categories: string[] | null;
  campaign_goals: string[] | null;
  monthly_creator_budget: string | null;
  target_audience: string | null;
  is_complete: boolean;
}

interface SavedOutput {
  id: string;
  title: string;
  output_type: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  updated_at: string;
}

// ─── AI Generated Panel types ─────────────────────────────────────────────────

interface MrktPanelData {
  type: "creators" | "opportunities" | "pipeline" | "content-plan";
  data: unknown;
}

interface ContentPlanItem {
  date: string;           // YYYY-MM-DD
  platform: string;
  content_type: string;
  title: string;
  hook: string | null;
  scheduled_time: string | null;
  caption: string | null;
  creative_direction: string | null;
}

interface CreatorPanelItem {
  name: string;
  stat?: string;
  niche?: string;
  location?: string;
  status?: string;
  reason?: string;
  score?: number;
}

interface OpportunityPanelItem {
  title: string;
  brand?: string;
  budget?: string;
  platform?: string;
  match?: string;
  status?: string;
}

interface PipelineStage {
  label: string;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Material system tokens
// ─────────────────────────────────────────────────────────────────────────────
//
// Canvas    #000        ← absolute background / scrollable areas
// Base      L=7.5%      ← sidebars, panels (visible against canvas)
// Surface   L=11%       ← cards floating on base
// Raised    L=15%       ← inner items, nested cards
// High      L=19%       ← modal surfaces, highest elevation
//
// Shadows carry the sense of Z-height — without them surfaces feel flat.
// Inset top-edge highlights (like Apple) simulate a light source above.
//
// ─────────────────────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRoleLabel(p: UserProfile | null): string | null {
  if (!p) return null;
  if (p.onboarding_path === "creator" || p.account_type === "creator") return "Creator";
  if (p.onboarding_path === "business_creator")  return "Business · Campaigns";
  if (p.onboarding_path === "business_marketing") return "Business · Marketing";
  return null;
}
function isCreatorAccount(p: UserProfile | null): boolean {
  return p?.onboarding_path === "creator" || p?.account_type === "creator";
}
function isBusinessAccount(p: UserProfile | null): boolean {
  if (!p) return false;
  return p.onboarding_path === "business_creator" || p.onboarding_path === "business_marketing" || p.account_type === "brand" || p.account_type === "business";
}
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function getWelcome(p: UserProfile | null): { title: string; sub: string } {
  if (!p) return { title: "What are we building today?", sub: "Strategy, calendars, hooks, captions — ask MRKT anything." };
  const first = p.name?.split(" ")[0];
  const g = first ? `, ${first}` : "";
  if (isCreatorAccount(p)) return { title: `What are we creating today${g}?`, sub: "Hooks, captions, calendars, and growth — built around your creator brand." };
  if (p.onboarding_path === "business_creator") return { title: `What's the campaign${g}?`, sub: "Campaign briefs, creator selection, compensation, and partnership strategy." };
  if (p.onboarding_path === "business_marketing") return { title: `What are we building today${g}?`, sub: "Strategy, content calendars, and growth — for your brand." };
  return { title: "What are we building today?", sub: "Strategy, calendars, hooks, captions — ask MRKT anything." };
}
function getSuggestions(p: UserProfile | null, biz?: BusinessProfile | null): string[] {
  if (!p) return [
    "Build a 4-week content calendar for a new skincare brand on Instagram and TikTok.",
    "Write 5 high-converting hooks for a fitness coach launching a 30-day program.",
    "Create 3 reel scripts for a luxury watch brand — under 30 seconds each.",
    "Audit my brand voice and recommend 3 content pillars with examples.",
  ];
  const niche    = p.niche || "your niche";
  const platform = p.platforms?.[0] || "Instagram";
  if (isCreatorAccount(p)) return [
    `Write 5 hooks for a ${niche} video on ${platform} — hook-first, scroll-stopping.`,
    `Build a 2-week content calendar for a ${niche} creator on ${platform}.`,
    `Write a ready-to-post ${platform} caption for a ${niche} piece of content.`,
    `What content format is performing best for ${niche} creators right now?`,
  ];
  // Business: prefer data from business_profiles if available.
  // Guard against "Other" leaking verbatim into prompts.
  const rawIndustry = biz?.industry;
  const industry    = (rawIndustry && rawIndustry.toLowerCase() !== "other")
    ? rawIndustry
    : (p.niche || "your industry");
  const bizPlatform = biz?.preferred_platforms?.[0] || platform;
  const goal       = biz?.campaign_goals?.[0] || "brand awareness";
  if (p.onboarding_path === "business_creator" || p.account_type === "brand") return [
    `Write a full creator campaign brief for a ${industry} brand focused on ${goal}.`,
    `What should I pay a creator with 100K followers for 2 Instagram Reels?`,
    `Help me define the right creator requirements for a ${industry} campaign on ${bizPlatform}.`,
    `How do I evaluate which creators are the right fit for my brand?`,
  ];
  if (p.onboarding_path === "business_marketing" || p.account_type === "business") {
    const stage = p.business_stage || "growing";
    return [
      `Build a 4-week content calendar for a ${stage} ${industry} brand on ${bizPlatform}.`,
      `Write 3 hooks for a ${goal} post — for a ${industry} business.`,
      `Create a full marketing strategy for my ${industry} business.`,
      `Give me 3 content pillars and 5 post ideas each for a ${industry} brand.`,
    ];
  }
  return [
    "Build a 4-week content calendar for a new skincare brand on Instagram and TikTok.",
    "Write 5 high-converting hooks for a fitness coach launching a 30-day program.",
    "Create 3 reel scripts for a luxury watch brand — under 30 seconds each.",
    "Audit my brand voice and recommend 3 content pillars with examples.",
  ];
}
function getProfileCompletion(p: UserProfile | null, biz?: BusinessProfile | null): number {
  if (!p) return 0;
  if (isBusinessAccount(p) && biz) {
    const checks = [
      !!biz.company_name,
      !!biz.industry,
      !!biz.target_audience,
      !!(biz.campaign_goals?.length),
      !!biz.monthly_creator_budget,
      !!(biz.preferred_platforms?.length),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }
  let s = 0;
  if (p.name) s += 25;
  if (p.niche) s += 25;
  if (p.platforms?.length) s += 25;
  if (p.goal || p.business_stage) s += 25;
  return s;
}
function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Parse AI-generated panel blocks from assistant messages ───────────────────
// The edge function instructs the AI to embed ```mrkt-TYPE JSON ``` blocks.
// We extract them, strip them from the markdown text, and render as native cards.

function parseMrktPanels(content: string): { text: string; panels: MrktPanelData[] } {
  const re = /```mrkt-(creators|opportunities|pipeline|content-plan)\n([\s\S]*?)```/g;
  const panels: MrktPanelData[] = [];
  const found: Array<{ full: string; type: string; raw: string }> = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    found.push({ full: m[0], type: m[1], raw: m[2] });
  }
  let text = content;
  for (const f of found) {
    try {
      panels.push({ type: f.type as MrktPanelData["type"], data: JSON.parse(f.raw.trim()) });
    } catch { /* skip malformed JSON */ }
    text = text.replace(f.full, "");
  }
  return { text: text.trim(), panels };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OUTPUT_TYPES = [
  { value: "strategy",       label: "Strategy"       },
  { value: "content_plan",   label: "Content Plan"   },
  { value: "campaign_brief", label: "Campaign Brief" },
  { value: "hooks",          label: "Hooks"          },
  { value: "captions",       label: "Captions"       },
  { value: "calendar",       label: "Calendar"       },
  { value: "other",          label: "Other"          },
];

const TYPE_COLORS: Record<string, string> = {
  strategy:       "oklch(0.75 0.005 0)",
  content_plan:   "oklch(0.84 0 0)",
  campaign_brief: "oklch(0.78 0.005 0)",
  hooks:          "oklch(0.78 0.005 0)",
  captions:       "oklch(0.72 0.005 0)",
  calendar:       "oklch(0.72 0.005 0)",
  other:          "oklch(1 0 0 / 35%)",
};

const PRO_TIPS = [
  "The more context you give MRKT, the better the results. Try adding your niche, audience, and goals before asking.",
  "Use MRKT to generate 5 hook variations for your best-performing content — then A/B test them.",
  "Ask MRKT to analyze competitor content patterns to find gaps you can fill in your niche.",
  "Combine MRKT outputs with your unique voice. AI is the foundation, you are the brand.",
];

// ── Save Modal ────────────────────────────────────────────────────────────────

function SaveModal({ content, chatId, onClose, onSaved }: {
  content: string; chatId: string | null;
  onClose: () => void; onSaved: (o: SavedOutput) => void;
}) {
  const { user } = useAuth();
  const [title,     setTitle]     = useState(() => content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 80));
  const [type,      setType]      = useState("other");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("projects")
      .select("id,name,updated_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(8)
      .then(({ data }: { data: Project[] | null }) => setProjects(data ?? []));
  }, [user]);

  async function save() {
    if (!user || !title.trim()) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("saved_outputs")
        .insert({
          user_id: user.id,
          chat_id: chatId ?? null,
          title: title.trim(),
          content,
          output_type: type,
          project_id: projectId ?? null,
        })
        .select().single();
      if (error) throw error;
      toast.success(projectId ? "Saved to project." : "Saved to workspace.");
      onSaved(data as SavedOutput);
      onClose();
    } catch { toast.error("Couldn't save. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 space-y-5 modal-in"
        style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowComposer }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <Bookmark className="h-4 w-4" style={{ color: C.accent }} />
          <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>Save to Workspace</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.textQuaternary }}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
            className="w-full bg-transparent rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-150"
            style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderFocus; }}
            onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderNormal; }}
            autoFocus
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.textQuaternary }}>Type</label>
          <div className="flex flex-wrap gap-1.5">
            {OUTPUT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className="px-3 py-1.5 rounded-full text-[11px] transition-all duration-150"
                style={{
                  background: type === t.value ? "oklch(1 0 0 / 18%)" : C.raised,
                  border: `1px solid ${type === t.value ? "oklch(1 0 0 / 45%)" : C.borderSubtle}`,
                  color: type === t.value ? C.accent : C.textTertiary,
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Add to Project */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.textQuaternary }}>
              Add to Project <span style={{ color: C.textMuted, textTransform: "none", letterSpacing: "normal" }}>— optional</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setProjectId(null)}
                className="px-3 py-1.5 rounded-full text-[11px] transition-all duration-150"
                style={{
                  background: projectId === null ? C.raised : "transparent",
                  border: `1px solid ${projectId === null ? C.borderNormal : C.borderSubtle}`,
                  color: projectId === null ? C.textSecondary : C.textMuted,
                }}
              >
                None
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProjectId(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all duration-150"
                  style={{
                    background: projectId === p.id ? "oklch(1 0 0 / 18%)" : C.raised,
                    border: `1px solid ${projectId === p.id ? "oklch(1 0 0 / 45%)" : C.borderSubtle}`,
                    color: projectId === p.id ? C.accent : C.textTertiary,
                  }}
                >
                  <Folder className="h-2.5 w-2.5" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            className="btn-primary flex-1 h-9 rounded-full text-sm"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-4 h-9 rounded-full text-sm transition-colors"
            style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ─── ActionCard ──────────────────────────────────────────────────────────────
// Used in the dashboard primary action strip. Accepts either an href (Link) or
// an onClick (button) so nav cards and action cards share one component.

function ActionCard({
  icon, title, desc, href, onClick, comingSoon = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  const inner = (
    <>
      <div
        className="mb-3.5 h-9 w-9 rounded-xl flex items-center justify-center"
        style={{ background: "oklch(1 0 0 / 8%)", border: "1px solid oklch(1 0 0 / 14%)", boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%)" }}
      >
        {icon}
      </div>
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <div className="text-[13.5px] font-semibold leading-snug" style={{ color: "oklch(1 0 0 / 92%)" }}>
          {title}
        </div>
        {comingSoon && (
          <span
            className="shrink-0 mt-0.5 text-[8px] uppercase tracking-[0.2em] font-semibold rounded-full px-1.5 py-0.5"
            style={{ background: "oklch(0.75 0.005 0 / 12%)", color: "oklch(0.75 0.005 0 / 55%)", border: "1px solid oklch(0.75 0.005 0 / 18%)" }}
          >
            Soon
          </span>
        )}
      </div>
      <div className="text-[12px]" style={{ color: "oklch(1 0 0 / 42%)" }}>{desc}</div>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    background: "oklch(0.10 0 0)",
    border: "1px solid oklch(1 0 0 / 12%)",
    boxShadow: "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  };

  const hoverIn  = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "translateY(-2px)";
    el.style.background = "oklch(0.13 0 0)";
    el.style.borderColor = "oklch(1 0 0 / 20%)";
    el.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 14%), 0 6px 24px oklch(0 0 0 / 65%), 0 2px 6px oklch(0 0 0 / 50%)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "";
    el.style.background = "oklch(0.10 0 0)";
    el.style.borderColor = "oklch(1 0 0 / 12%)";
    el.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)";
  };

  if (comingSoon) {
    return (
      <button
        type="button"
        onClick={() => toast.info(`${title} is coming soon.`)}
        className="rounded-[18px] p-5 text-left transition-all duration-200 w-full"
        style={{ ...sharedStyle, opacity: 0.7 }}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        {inner}
      </button>
    );
  }

  if (href) {
    return (
      <Link
        to={href as "/"}
        className="rounded-[18px] p-5 text-left transition-all duration-200 block"
        style={sharedStyle}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      className="rounded-[18px] p-5 text-left transition-all duration-200 w-full"
      style={sharedStyle}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
    >
      {inner}
    </button>
  );
}

// ─── MetricChip ───────────────────────────────────────────────────────────────

function MetricChip({
  icon, label, value, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href?: string;
}) {
  const inner = (
    <div
      className="rounded-2xl p-4 h-full"
      style={{
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(1 0 0 / 12%)",
        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 11%), 0 1px 4px oklch(0 0 0 / 40%)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <span style={{ color: "oklch(1 0 0 / 28%)" }}>{icon}</span>
        <span className="text-[9.5px] uppercase tracking-[0.26em] font-semibold" style={{ color: "oklch(1 0 0 / 26%)" }}>{label}</span>
      </div>
      <div className="text-[1.5rem] font-bold tracking-tight leading-none" style={{ color: "oklch(0.84 0 0)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link
        to={href as "/"}
        className="block transition-opacity duration-150 hover:opacity-80"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Generated Panel Components
// Rendered inside assistant messages when the AI includes structured data blocks
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_PILL_STYLE: Record<string, React.CSSProperties> = {
  shortlisted: { background: C.blueBg,    color: C.aiBlue,         border: `1px solid ${C.blueBorder}`   },
  contacted:   { background: C.greenMuted,color: C.green,          border: `1px solid ${C.greenBorder}`  },
  reviewing:   { background: C.amberMuted,color: C.amber,          border: `1px solid ${C.amberBorder}`  },
  pending:     { background: C.amberMuted,color: C.amber,          border: `1px solid ${C.amberBorder}`  },
  open:        { background: C.blueBg,    color: C.aiBlue,         border: `1px solid ${C.blueBorder}`   },
};

function CreatorsPanel({ items }: { items: CreatorPanelItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <div
        className="text-[9px] uppercase tracking-[0.28em] font-semibold mb-2.5 flex items-center gap-1.5"
        style={{ color: "oklch(1 0 0 / 28%)" }}
      >
        <Users className="h-2.5 w-2.5" />
        Creator Recommendations
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-3 flex items-start justify-between gap-3"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 8%), 0 1px 4px oklch(0 0 0 / 40%)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[13px] font-semibold" style={{ color: "oklch(1 0 0 / 92%)" }}>
                  {item.name}
                </span>
                {item.score !== undefined && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: C.accentMuted, color: C.aiBlue, border: `1px solid ${C.aiBlueBorder}` }}
                  >
                    {item.score}% match
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.stat      && <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 60%)" }}>{item.stat}</span>}
                {item.niche     && <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 38%)" }}>· {item.niche}</span>}
                {item.location  && <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 38%)" }}>· {item.location}</span>}
              </div>
              {item.reason && (
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "oklch(1 0 0 / 35%)" }}>
                  {item.reason}
                </p>
              )}
            </div>
            {item.status && (
              <span
                className="shrink-0 text-[9.5px] uppercase tracking-[0.14em] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
                style={STATUS_PILL_STYLE[item.status.toLowerCase()] ?? STATUS_PILL_STYLE.pending}
              >
                {item.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunitiesPanel({ items }: { items: OpportunityPanelItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <div
        className="text-[9px] uppercase tracking-[0.28em] font-semibold mb-2.5 flex items-center gap-1.5"
        style={{ color: "oklch(1 0 0 / 28%)" }}
      >
        <Zap className="h-2.5 w-2.5" />
        Opportunities
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-3 flex items-start justify-between gap-3"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(1 0 0 / 10%)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 8%), 0 1px 4px oklch(0 0 0 / 40%)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[13px] font-semibold" style={{ color: "oklch(1 0 0 / 92%)" }}>
                  {item.title}
                </span>
                {item.match && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: C.accentMuted, color: C.aiBlue, border: `1px solid ${C.aiBlueBorder}` }}
                  >
                    {item.match}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.brand    && <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 60%)" }}>{item.brand}</span>}
                {item.platform && <span className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 38%)" }}>· {item.platform}</span>}
                {item.budget   && (
                  <span className="text-[11.5px] font-medium" style={{ color: "oklch(0.84 0 0)" }}>· {item.budget}</span>
                )}
              </div>
            </div>
            {item.status && (
              <span
                className="shrink-0 text-[9.5px] uppercase tracking-[0.14em] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
                style={STATUS_PILL_STYLE[item.status.toLowerCase()] ?? STATUS_PILL_STYLE.open}
              >
                {item.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelinePanel({ stages }: { stages: PipelineStage[] }) {
  if (!stages.length) return null;
  const total = stages.reduce((s, p) => s + p.count, 0);
  return (
    <div className="mt-5">
      <div
        className="text-[9px] uppercase tracking-[0.28em] font-semibold mb-2.5 flex items-center gap-1.5"
        style={{ color: "oklch(1 0 0 / 28%)" }}
      >
        <BarChart3 className="h-2.5 w-2.5" />
        Pipeline Overview
      </div>
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: "oklch(0.13 0 0)",
          border: "1px solid oklch(1 0 0 / 10%)",
          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 8%), 0 1px 4px oklch(0 0 0 / 40%)",
        }}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "oklch(1 0 0 / 45%)" }}>{stage.label}</span>
              <span
                className="text-[15px] font-bold tabular-nums"
                style={{ color: stage.count > 0 ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 22%)" }}
              >
                {stage.count}
              </span>
            </div>
          ))}
        </div>
        <div
          className="mt-3 pt-2.5 flex items-center justify-between"
          style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <span className="text-[11px] font-medium" style={{ color: "oklch(1 0 0 / 40%)" }}>Total</span>
          <span className="text-[16px] font-bold tabular-nums" style={{ color: "oklch(0.84 0 0)" }}>{total}</span>
        </div>
      </div>
    </div>
  );
}

// ── Content Plan Panel — confirmation + one-click calendar write ──────────────

const PLATFORM_DOTS: Record<string, string> = {
  Instagram: "oklch(0.84 0 0)",
  TikTok:    "#69C9D0",
  YouTube:   "#FF0000",
  LinkedIn:  "#0A66C2",
  X:         "#ffffff",
  Facebook:  "#1877F2",
};

function ContentPlanPanel({ items }: { items: ContentPlanItem[] }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  if (!items.length) return null;

  const validItems = items.filter(
    (i) => i.date && i.platform && i.content_type && i.title
  );
  if (!validItems.length) return null;

  async function handleAdd() {
    if (!user || status === "saving" || status === "saved") return;
    setStatus("saving");
    try {
      const rows = validItems.map((i) => ({
        user_id:            user!.id,
        title:              i.title,
        platform:           i.platform,
        content_type:       i.content_type,
        scheduled_date:     i.date,
        scheduled_time:     i.scheduled_time ?? null,
        status:             "planned",
        hook:               i.hook ?? null,
        caption:            i.caption ?? null,
        creative_direction: i.creative_direction ?? null,
        notes:              null,
        ai_generated:       true,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("content_planner_items")
        .insert(rows);
      if (error) throw error;
      setStatus("saved");
      // Tell Content Planner page to refresh if it's open
      window.dispatchEvent(new CustomEvent("mrkt:content-plan-updated"));
      toast.success(`${validItems.length} posts added to your Content Planner.`);
    } catch {
      setStatus("error");
      toast.error("Couldn't save to Content Planner. Try again.");
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch { return dateStr; }
  }

  return (
    <div className="mt-5">
      <div
        className="text-[9px] uppercase tracking-[0.28em] font-semibold mb-2.5 flex items-center gap-1.5"
        style={{ color: "oklch(1 0 0 / 28%)" }}
      >
        <CalendarDays className="h-2.5 w-2.5" />
        Content Plan · {validItems.length} posts
      </div>

      {/* Post preview list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid oklch(1 0 0 / 10%)" }}
      >
        {validItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-2.5"
            style={{
              background: i % 2 === 0 ? "oklch(0.10 0 0)" : "oklch(0.13 0 0)",
              borderBottom: i < validItems.length - 1 ? "1px solid oklch(1 0 0 / 7%)" : "none",
            }}
          >
            {/* Platform dot */}
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: PLATFORM_DOTS[item.platform] ?? "oklch(0.6 0 0)" }}
            />
            {/* Date + time */}
            <div className="shrink-0 w-[88px]">
              <div className="text-[11px] font-medium" style={{ color: "oklch(1 0 0 / 58%)" }}>
                {formatDate(item.date)}
              </div>
              {item.scheduled_time && (
                <div className="text-[10px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
                  {item.scheduled_time}
                </div>
              )}
            </div>
            {/* Platform + type */}
            <div className="shrink-0 w-[76px]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] truncate" style={{ color: "oklch(1 0 0 / 38%)" }}>
                {item.platform}
              </div>
              <div className="text-[10px] truncate" style={{ color: "oklch(1 0 0 / 25%)" }}>
                {item.content_type}
              </div>
            </div>
            {/* Title */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium leading-snug truncate" style={{ color: "oklch(1 0 0 / 82%)" }}>
                {item.title}
              </div>
              {item.hook && (
                <div className="text-[10.5px] truncate" style={{ color: "oklch(1 0 0 / 32%)" }}>
                  {item.hook}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm / dismiss row */}
      <div className="flex items-center gap-3 mt-3">
        {status === "saved" ? (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium"
              style={{ background: C.greenMuted, color: C.green, border: `1px solid ${C.greenBorder}` }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Added to Content Planner
            </div>
            <Link
              to="/content-planner"
              className="text-[11.5px] transition-colors"
              style={{ color: "oklch(1 0 0 / 35%)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 58%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 35%)"; }}
            >
              Open Planner →
            </Link>
          </div>
        ) : (
          <>
            <button
              onClick={handleAdd}
              disabled={status === "saving"}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all duration-150"
              style={{
                background: status === "saving" ? "oklch(1 0 0 / 8%)" : "oklch(0.96 0 0)",
                color: status === "saving" ? "oklch(1 0 0 / 35%)" : "oklch(0.06 0 0)",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => { if (status === "idle") (e.currentTarget as HTMLElement).style.background = "#fff"; }}
              onMouseLeave={(e) => { if (status === "idle") (e.currentTarget as HTMLElement).style.background = "oklch(0.96 0 0)"; }}
            >
              {status === "saving" ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
              ) : (
                <><Plus className="h-3 w-3" /> Add {validItems.length} posts to Planner</>
              )}
            </button>
            {status === "error" && (
              <span className="text-[11px]" style={{ color: "oklch(0.52 0.15 24)" }}>
                Failed — try again
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Render a panel from the parsed panel data
function renderMrktPanel(panel: MrktPanelData, key: number): React.ReactNode {
  if (panel.type === "creators" && Array.isArray(panel.data))
    return <CreatorsPanel key={key} items={panel.data as CreatorPanelItem[]} />;
  if (panel.type === "opportunities" && Array.isArray(panel.data))
    return <OpportunitiesPanel key={key} items={panel.data as OpportunityPanelItem[]} />;
  if (
    panel.type === "pipeline" &&
    panel.data != null &&
    typeof panel.data === "object" &&
    "stages" in (panel.data as object)
  )
    return <PipelinePanel key={key} stages={(panel.data as { stages: PipelineStage[] }).stages} />;
  if (panel.type === "content-plan" && Array.isArray(panel.data))
    return <ContentPlanPanel key={key} items={panel.data as ContentPlanItem[]} />;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

function ChatPage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [chats,        setChats]        = useState<Chat[]>([]);
  const [chatId,       setChatId]       = useState<string | null>(null);
  const [messages,     setMessages]     = useState<Msg[]>([]);
  const [input,        setInput]        = useState("");
  const [streaming,    setStreaming]    = useState(false);
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);
  const [projects,              setProjects]              = useState<Project[]>([]);
  const [hasCreatorProfile, setHasCreatorProfile] = useState<boolean | null>(null);
  const [creatorProfileId,  setCreatorProfileId]  = useState<string | null>(null);
  const [bizProfile,        setBizProfile]        = useState<BusinessProfile | null>(null);
  const [saveTarget,            setSaveTarget]            = useState<string | null>(null);
  const [savedMsgKeys, setSavedMsgKeys] = useState<Set<string>>(new Set());
  const [tipIndex,     setTipIndex]     = useState(0);
  const [copiedIdx,    setCopiedIdx]    = useState<number | null>(null);
  const [creatorMetrics,  setCreatorMetrics]  = useState<{ profileViews: number; matchAppearances: number; savedByCount: number } | null>(null);
  const [pipelineStats,   setPipelineStats]   = useState<{ total: number; contacted: number; negotiating: number; booked: number } | null>(null);
  // Live counts for context-aware quick action chips
  const [liveStats, setLiveStats] = useState<{ pendingApplicants: number; pendingApplications: number; savedOpportunities: number } | null>(null);
  const [mrktContext, setMrktContext] = useState<string | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const welcomePending  = useRef<string | null>(typeof window !== "undefined" ? localStorage.getItem("mrkt_creator_welcome_pending") : null);
  const welcomeSent     = useRef(false);
  const prefillPrompt   = useRef<string | null>(typeof window !== "undefined" ? localStorage.getItem("mrkt_prefill_prompt") : null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,account_type,onboarding_path,niche,platforms,goal,business_stage")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile((data as UserProfile) ?? null));
  }, [user]);

  // Fetch real-time MRKT context for AI Strategist
  useEffect(() => {
    if (!user) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/build-mrkt-context`, {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.context) setMrktContext(data.context); })
        .catch(() => {}); // context is non-critical — fail silently
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("saved_outputs").select("id,title,output_type,created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(8)
      .then(({ data }: { data: SavedOutput[] | null }) => setSavedOutputs(data ?? []));
  }, [user]);

  // Check if creator has a published profile row
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.onboarding_path !== "creator" && profile.account_type !== "creator") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("creator_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        setHasCreatorProfile(!!data);
        setCreatorProfileId(data?.id ?? null);
      });
  }, [user, profile]);

  // Load creator dashboard metrics (profile views, matching appearances, saves)
  useEffect(() => {
    if (!creatorProfileId) return;
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("creator_analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("creator_profile_id", creatorProfileId)
        .eq("event_type", "profile_viewed"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("creator_analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("creator_profile_id", creatorProfileId)
        .eq("event_type", "appeared_in_matching"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("project_saved_creators")
        .select("*", { count: "exact", head: true })
        .eq("creator_profile_id", creatorProfileId),
    ]).then(([viewsRes, matchRes, savesRes]) => {
      setCreatorMetrics({
        profileViews:      viewsRes.count  ?? 0,
        matchAppearances:  matchRes.count  ?? 0,
        savedByCount:      savesRes.count  ?? 0,
      });
    });
  }, [creatorProfileId]);

  // Load business profile for business/brand accounts
  useEffect(() => {
    if (!user || !profile) return;
    if (!isBusinessAccount(profile)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("business_profiles")
      .select("company_name,industry,preferred_platforms,preferred_creator_categories,campaign_goals,monthly_creator_budget,target_audience,is_complete")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: BusinessProfile | null }) => setBizProfile(data));
  }, [user, profile]);

  // Load pipeline summary counts for business users
  useEffect(() => {
    if (!user || !profile) return;
    if (!isBusinessAccount(profile)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("project_saved_creators")
      .select("status")
      .eq("saved_by", user.id)
      .not("status", "eq", "rejected")
      .then(({ data }: { data: Array<{ status: string }> | null }) => {
        if (!data) return;
        const stats = {
          total:       data.length,
          contacted:   data.filter(r => r.status === "contacted").length,
          negotiating: data.filter(r => r.status === "negotiating").length,
          booked:      data.filter(r => r.status === "booked").length,
        };
        setPipelineStats(stats);
      });
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("projects")
      .select("id,name,updated_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(6)
      .then(({ data }: { data: Project[] | null }) => setProjects(data ?? []));
  }, [user]);

  // Load live counts for context-aware quick action chip labels
  useEffect(() => {
    if (!user || !profile) return;

    if (isBusinessAccount(profile)) {
      // Step 1: get active campaign IDs, then count pending applicants
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("campaigns")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .then(async ({ data: camps }: { data: Array<{ id: string }> | null }) => {
          if (!camps || camps.length === 0) {
            setLiveStats({ pendingApplicants: 0, pendingApplications: 0, savedOpportunities: 0 });
            return;
          }
          const ids = camps.map((c) => c.id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { count } = await (supabase as any)
            .from("campaign_applications")
            .select("id", { count: "exact", head: true })
            .in("campaign_id", ids)
            .eq("status", "pending");
          setLiveStats({ pendingApplicants: count ?? 0, pendingApplications: 0, savedOpportunities: 0 });
        });
    } else if (isCreatorAccount(profile)) {
      Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("campaign_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["pending", "reviewing"]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("campaign_saves")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]).then(([appRes, saveRes]) => {
        setLiveStats({
          pendingApplicants: 0,
          pendingApplications: appRes.count ?? 0,
          savedOpportunities: saveRes.count ?? 0,
        });
      });
    }
  }, [user, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      const isTyping = active?.tagName === "INPUT" || active?.tagName === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textarea.current?.focus();
      }
      if (!isTyping && !saveTarget) {
        if (e.key === "n") { e.preventDefault(); newChat(); }
        if (e.key === "p") { e.preventDefault(); nav({ to: "/projects" as "/" }); }
      }
      if (e.key === "Escape" && saveTarget) {
        setSaveTarget(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [saveTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % PRO_TIPS.length), 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { loadChats(); }, []);
  useEffect(() => { if (chatId) loadMessages(chatId); else setMessages([]); }, [chatId]);

  // Pre-fill prompt from Growth Hub "Ask AI to help" button
  useEffect(() => {
    if (!prefillPrompt.current || !user) return;
    const text = prefillPrompt.current;
    prefillPrompt.current = null;
    localStorage.removeItem("mrkt_prefill_prompt");
    setTimeout(() => {
      setInput(text);
      textarea.current?.focus();
    }, 600);
  }, [user]);

  // Auto-send welcome session for new creators arriving from onboarding
  useEffect(() => {
    if (!welcomePending.current || welcomeSent.current || !user) return;
    const raw = welcomePending.current;
    const timer = setTimeout(() => {
      if (welcomeSent.current) return;
      welcomeSent.current = true;
      localStorage.removeItem("mrkt_creator_welcome_pending");
      try {
        const p = JSON.parse(raw) as Record<string, string>;
        const name      = p.name      || "a creator";
        const niche     = p.niche     || "";
        const platforms = p.platforms || "";
        const location  = p.location  || "";
        const lines = [
          `I just set up my creator profile on MRKT. My name is ${name}${niche ? `, focused on ${niche}` : ""}${platforms ? ` creating content on ${platforms}` : ""}${location ? `, based in ${location}` : ""}.`,
          "",
          "Please give me a personalized first-session analysis with four parts:",
          "1. **Profile Strength Assessment** — what's strong, what's missing, and what impacts my match score most",
          "2. **Top 3 Improvement Actions** ranked by expected impact on getting matched with brands",
          "3. **Week 1 Growth Plan** — 3–5 practical things I can do this week to improve my visibility on MRKT",
          "4. **Opportunity Readiness** — what type of campaigns and brands I'm currently best positioned for",
        ].join("\n");
        send(lines);
      } catch {
        welcomeSent.current = false;
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [user]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  async function loadChats() {
    const { data } = await supabase.from("chats").select("id,title,updated_at").order("updated_at", { ascending: false });
    setChats(data ?? []);
    if (!chatId && data && data.length) setChatId(data[0].id);
  }
  async function loadMessages(id: string) {
    const { data } = await supabase.from("messages").select("role,content").eq("chat_id", id).order("created_at");
    setMessages((data ?? []) as Msg[]);
  }
  async function newChat() { setChatId(null); setMessages([]); setInput(""); }
  async function deleteChat(id: string) {
    await supabase.from("chats").delete().eq("id", id);
    if (chatId === id) { setChatId(null); setMessages([]); }
    loadChats();
  }

  async function send(text: string) {
    if (!text.trim() || streaming || !user) return;
    setStreaming(true); setInput("");
    let activeId = chatId;
    if (!activeId) {
      const title = text.trim().slice(0, 60);
      const { data, error } = await supabase.from("chats").insert({ user_id: user.id, title }).select().single();
      if (error || !data) { setStreaming(false); return toast.error("Couldn't start session"); }
      activeId = data.id; setChatId(activeId);
      setChats((c) => [{ id: data.id, title, updated_at: data.updated_at }, ...c]);
    }
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    await supabase.from("messages").insert({ chat_id: activeId, user_id: user.id, role: "user", content: text });
    let assistant = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Session expired — please sign in again."); setStreaming(false); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: next, mrkt_context: mrktContext ?? undefined }),
      });
      if (!res.ok || !res.body) {
        let errMsg = "Something went wrong. Try again.";
        try { const b = await res.clone().json(); if (b?.error) errMsg = b.error; } catch { /* */ }
        toast.error(errMsg); setMessages(next); setStreaming(false); return;
      }
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let buf = ""; let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { assistant += delta; setMessages([...next, { role: "assistant", content: assistant }]); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      if (assistant) {
        await supabase.from("messages").insert({ chat_id: activeId, user_id: user.id, role: "assistant", content: assistant });
        await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", activeId);
      }
    } catch (e) { console.error(e); toast.error("Connection failed"); }
    finally { setStreaming(false); }
  }

  function handleSaved(output: SavedOutput) {
    setSavedOutputs((prev) => [output, ...prev].slice(0, 8));
    if (saveTarget) setSavedMsgKeys((s) => new Set([...s, saveTarget]));
    setSaveTarget(null);
  }
  function copyMessage(content: string, idx: number) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  const [activeTab, setActiveTab] = useState<"chat" | "strategy" | "insights" | "recommendations">("chat");

  const initial     = profile?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "M";
  const displayName = profile?.name ?? user?.email ?? "";
  const roleLabel   = getRoleLabel(profile);
  const welcome     = getWelcome(profile);
  const isCreator     = isCreatorAccount(profile);
  const isBusiness    = isBusinessAccount(profile);
  const profilePct    = getProfileCompletion(profile, bizProfile);
  const firstName     = profile?.name?.split(" ")[0] ?? "";
  const companyName   = bizProfile?.company_name ?? null;

  // ── Chip → full prompt expansion ──────────────────────────────────────────
  function expandChip(chip: string): string {
    const niche    = profile?.niche || "your niche";
    const platform = profile?.platforms?.[0] || "Instagram";
    const industry = bizProfile?.industry || profile?.niche || "your industry";
    const pendingApplicants = liveStats?.pendingApplicants ?? 0;
    const pendingApplications = liveStats?.pendingApplications ?? 0;
    const savedOpps = liveStats?.savedOpportunities ?? 0;
    const map: Record<string, string> = {
      // ── Spec quick actions (Business) ────────────────────────────────────────
      "Find Creators":          `Find me the best creator profiles for a ${industry} campaign. What niches, follower ranges, and engagement rates should I target? Give me specific criteria.`,
      "Review Applicants":      pendingApplicants > 0
        ? `I have ${pendingApplicants} new applicants waiting to be reviewed. Walk me through who to prioritise and how to evaluate them. Use my actual campaign data.`
        : `How should I evaluate my campaign applicants? Give me a framework for deciding who to shortlist.`,
      "Generate Outreach":      `Write 3 high-converting creator outreach messages for a ${industry} brand. Make them feel personal, professional, and specific — not like a mass email.`,
      "Improve Campaign":       `Review my active campaigns and tell me what I can improve — creator requirements, messaging, compensation structure, or targeting.`,
      "Build Campaign Brief":   `Build a complete creator campaign brief for a ${industry} brand. Include: objective, deliverables, timeline, tone, content requirements, usage rights, and compensation.`,
      "Plan Campaign Content":  `Build a content calendar connected to my active campaigns. Check what's already scheduled and generate a 2-week posting plan tied to campaign goals. Generate a plan I can add to my calendar.`,
      // ── Spec quick actions (Creator) ─────────────────────────────────────────
      "Find Opportunities":     savedOpps > 0
        ? `I have ${savedOpps} saved opportunities. Which ones should I apply to first and why? Consider my profile and give me a prioritised list.`
        : `What brand partnership opportunities are best suited for a ${niche} creator on ${platform}? How do I find and apply effectively?`,
      "Improve Profile":        `Review my creator profile and give me specific improvements to increase my chances of getting brand deals and appearing in searches.`,
      "Build Content Plan":     `Build me a 2-week content plan. Use my content calendar data — check what I already have scheduled and fill the empty weeks. Generate a ready-to-add plan.`,
      // ── Shared content planner actions ───────────────────────────────────────
      "What Should I Post?":    `Look at my content calendar. What are the next 5 posts I should schedule? Tell me exactly what to post, when, and on which platform. Use my calendar data.`,
      "Fill My Calendar":       `My calendar has gaps. Fill the next 2 weeks with high-performing content ideas for my niche and platforms. Check what's already scheduled and only suggest new dates. Generate a plan I can add directly to my calendar.`,
      "Plan Content This Week": `Build a content plan for this week based on what's already scheduled. Fill any empty days with relevant, platform-specific content ideas.`,
      "Increase Visibility":    `Give me a specific plan to increase my visibility score and get discovered by more brands. Focus on what I can do this week.`,
      "Review Applications":    pendingApplications > 0
        ? `I have ${pendingApplications} applications in progress. Give me a status breakdown and advice on what to do next for each one.`
        : `How should I approach brand partnership applications? Help me write a strong application message for a ${niche} creator.`,
      "Build Growth Plan":          `Build a comprehensive growth plan for my ${niche} creator brand on ${platform}. Include content pillars, posting frequency, engagement tactics, and milestone goals.`,
      "Review My Profile":          `Review my creator profile and provide specific recommendations to improve my brand visibility, discoverability by brands, and profile strength.`,
      "Content Strategy":           `Create a detailed content strategy for a ${niche} creator on ${platform}. Include content types, themes, hooks, and a weekly posting schedule.`,
      "Review Campaign":            `Review my campaign strategy and provide recommendations to improve performance, creator fit, and ROI.`,
      "Campaign Strategy":          `Build a complete campaign strategy for a ${industry} brand. Include goals, creator requirements, content formats, timeline, and budget allocation.`,
      "Creator Recommendations":    `Based on my brand goals, recommend the types of creators I should partner with and how to evaluate their fit for a ${industry} campaign.`,
      "Outreach Templates":         `Write 3 high-converting creator outreach messages for a ${industry} brand campaign — personalized, professional, and conversion-focused.`,
      "30-Day Content Strategy":    `Create a complete 30-day content strategy for my ${niche} brand on ${platform}. Include daily topics, formats, and hooks.`,
      "Platform Growth Plan":       `Build a platform growth plan for a ${niche} creator on ${platform}. Cover follower acquisition, engagement tactics, and monetization milestones.`,
      "Monetization Roadmap":       `Create a monetization roadmap for my ${niche} creator brand. Include brand deals, digital products, affiliate marketing, and revenue targets.`,
      "Brand Positioning":          `Help me define my creator brand positioning. What makes me unique in the ${niche} space and how do I communicate that to brands?`,
      "Audience Growth":            `Give me a proven audience growth strategy for a ${niche} creator on ${platform}. Focus on organic growth tactics that work right now.`,
      "Analyze My Performance":     `Analyze my creator profile performance and give me insights on what's working, what needs improvement, and how I compare to top ${niche} creators.`,
      "Audience Insights":          `Give me deep insights about the ideal audience for a ${niche} creator. What are their demographics, interests, pain points, and what content resonates most?`,
      "Best Posting Times":         `What are the optimal posting times and frequencies for a ${niche} creator on ${platform}? Include platform-specific timing recommendations.`,
      "Competitor Gap Analysis":    `Analyze the competitive landscape for ${niche} creators on ${platform} and identify content gaps and opportunities I can fill.`,
      "Engagement Trends":          `What content formats and topics are driving the highest engagement for ${niche} creators right now? Give me actionable recommendations.`,
      "Recommended Opportunities":  `What are the best brand partnership opportunities for ${niche} creators like me right now? How do I find and apply for them?`,
      "Profile Improvements":       `Give me a prioritized list of improvements to my creator profile to increase my chances of getting brand deals and appearing in searches.`,
      "Content Recommendations":    `Based on my ${niche} niche and ${platform} platform, give me 20 specific content ideas that would perform well with my audience.`,
      "Brand Match Ideas":          `What types of brands would be the best match for a ${niche} creator on ${platform}? Include specific categories and collaboration formats.`,
      "Growth Tactics":             `Give me 10 proven growth tactics for a ${niche} creator on ${platform} that can deliver results within 30 days.`,
      "Campaign Performance":       `Analyze my campaign performance and provide insights on creator ROI, content performance, and recommendations for improvement.`,
      "ROI Analysis":               `Help me calculate and improve the ROI of my influencer marketing campaigns. What metrics should I track and what benchmarks should I hit?`,
      "Creator Market Insights":    `Give me current insights on the creator economy in the ${industry} sector. What are brands paying, what's trending, and where are the opportunities?`,
      "Audience Demographics":      `What audience demographics should I target for a ${industry} brand campaign? Include age, interests, platforms, and behavioral patterns.`,
      "Industry Trends":            `What are the top marketing and creator economy trends in the ${industry} industry right now? How should my brand adapt its strategy?`,
      "Recommended Creators":       `Based on my ${industry} brand goals, recommend the top creator profiles and niches I should partner with for maximum campaign impact.`,
      "Campaign Improvements":      `Review my current campaign approach and suggest specific improvements to increase creator performance, engagement, and overall ROI.`,
      "Pricing Guide":              `What are the current market rates for creator partnerships in the ${industry} space? Give me pricing guidance for different creator tiers.`,
      "Creator Niches":             `What creator niches and content categories are most effective for ${industry} brand campaigns? Rank them by performance potential.`,
      "Creator Selection Framework":`Create a creator selection framework for ${industry} brand campaigns. What criteria, scoring system, and evaluation process should I use?`,
      "Budget Plan":                `How should I allocate a creator marketing budget for a ${industry} brand? Break it down across tiers, platforms, and campaign types.`,
      "Partnership Strategy":       `Build a long-term creator partnership strategy for my ${industry} brand. How do I identify, nurture, and scale creator relationships?`,
    };
    return map[chip] || `Tell me about: ${chip}`;
  }

  // ── Tab chips (role + tab aware) ──────────────────────────────────────────
  const TAB_CHIPS: Record<string, string[]> = {
    chat: isCreator
      ? ["Find Opportunities", "Improve Profile", "Build Content Plan", "Increase Visibility", "Review Applications"]
      : ["Find Creators", "Review Applicants", "Generate Outreach", "Improve Campaign", "Build Campaign Brief"],
    strategy: isCreator
      ? ["30-Day Content Strategy", "Platform Growth Plan", "Monetization Roadmap", "Brand Positioning", "Audience Growth"]
      : ["Campaign Strategy", "Creator Selection Framework", "Budget Plan", "Partnership Strategy", "Campaign Improvements"],
    insights: isCreator
      ? ["Analyze My Performance", "Audience Insights", "Best Posting Times", "Competitor Gap Analysis", "Engagement Trends"]
      : ["Campaign Performance", "ROI Analysis", "Creator Market Insights", "Audience Demographics", "Industry Trends"],
    recommendations: isCreator
      ? ["Recommended Opportunities", "Profile Improvements", "Content Recommendations", "Brand Match Ideas", "Growth Tactics"]
      : ["Recommended Creators", "Campaign Improvements", "Outreach Templates", "Pricing Guide", "Creator Niches"],
  };
  const currentChips = TAB_CHIPS[activeTab] ?? TAB_CHIPS.chat;

  const TAB_SUBTITLES: Record<string, string> = {
    chat: isCreator
      ? "Get personalized strategies, content ideas, growth plans, and AI-powered insights for your creator brand."
      : "Get campaign strategy, creator recommendations, and AI-powered insights for your brand.",
    strategy: isCreator
      ? "Build comprehensive marketing strategies tailored to your niche, audience, and platforms."
      : "Build campaign strategies, creator selection frameworks, and brand positioning plans.",
    insights: isCreator
      ? "Analyze your performance data and get actionable insights to grow your creator presence."
      : "Analyze campaign performance, creator metrics, and ROI across all your activities.",
    recommendations: isCreator
      ? "Get AI-curated recommendations for opportunities, content, and brand collaborations."
      : "Get AI-curated creator recommendations, campaign ideas, and outreach suggestions.",
  };
  const tabSubtitle = TAB_SUBTITLES[activeTab] ?? TAB_SUBTITLES.chat;

  // ── Right sidebar data ─────────────────────────────────────────────────────
  const quickActions = isCreator ? [
    { icon: Search,     label: "Find Opportunities",   chip: "Find Opportunities"  },
    { icon: Eye,        label: "Improve Profile",      chip: "Improve Profile"     },
    { icon: PenLine,    label: "Build Content Plan",   chip: "Build Content Plan"  },
    { icon: TrendingUp, label: "Increase Visibility",  chip: "Increase Visibility" },
    { icon: FileText,   label: "Review Applications",  chip: "Review Applications" },
    { icon: Sparkles,   label: "Growth Strategy",      chip: "Build Growth Plan"   },
  ] : [
    { icon: Users,     label: "Find Creators",         chip: "Find Creators"       },
    { icon: MoreHorizontal, label: "Review Applicants",chip: "Review Applicants"   },
    { icon: MessageSquare,  label: "Generate Outreach",chip: "Generate Outreach"   },
    { icon: Activity,  label: "Improve Campaign",      chip: "Improve Campaign"    },
    { icon: FileText,  label: "Campaign Brief",        chip: "Build Campaign Brief"},
    { icon: BarChart3, label: "Pipeline Review",       chip: "Campaign Performance"},
  ];

  const sidebarGoals = isCreator ? [
    { label: "Grow my audience",     sub: "Building follower base",                           pct: Math.min(98, Math.max(10, Math.round((creatorMetrics?.profileViews ?? 0) / 3 + 30))) },
    { label: "Increase engagement",  sub: `Profile ${profilePct}% complete`,                  pct: profilePct                                                                            },
    { label: "Monetize my content",  sub: `${creatorMetrics?.savedByCount ?? 0} brands saved`, pct: Math.min(98, Math.max(5, (creatorMetrics?.savedByCount ?? 0) * 25))                 },
  ] : [
    { label: "Build creator pipeline", sub: `${pipelineStats?.total ?? 0} creators saved`,   pct: Math.min(98, Math.max(5, (pipelineStats?.total ?? 0) * 12))       },
    { label: "Launch campaigns",       sub: `${projects.length} active projects`,            pct: Math.min(98, Math.max(5, projects.length * 20))                   },
    { label: "Scale creator network",  sub: `${pipelineStats?.contacted ?? 0} contacted`,    pct: Math.min(98, Math.max(5, (pipelineStats?.contacted ?? 0) * 18))   },
  ];

  const aiInsights = isCreator ? [
    creatorMetrics?.profileViews
      ? { icon: TrendingUp, color: C.aiBlue, text: `Your profile was viewed ${creatorMetrics.profileViews} times.` }
      : { icon: Eye, color: C.aiBlue, text: "Complete your profile to get discovered by brands." },
    { icon: Clock, color: C.chrome, text: "Post between 6–9 PM on weekdays for best reach." },
    { icon: Sparkles, color: C.aiBlue, text: "Brands in lifestyle & tech are actively searching your niche." },
  ] : [
    pipelineStats && pipelineStats.total > 0
      ? { icon: TrendingUp, color: C.aiBlue, text: `You have ${pipelineStats.total} creators in your pipeline.` }
      : { icon: Users, color: C.aiBlue, text: "Start building your creator pipeline to launch campaigns." },
    { icon: Activity, color: C.chrome, text: "Micro-influencers (10K–100K) deliver 2× higher engagement." },
    { icon: Lightbulb, color: C.aiBlue, text: "Video content campaigns see 3× higher conversion rates." },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const TABS = [
    { id: "chat",            label: "Chat"            },
    { id: "strategy",        label: "Strategy"        },
    { id: "insights",        label: "Insights"        },
    { id: "recommendations", label: "Recommendations" },
  ] as const;

  return (
    <div className="h-full flex overflow-hidden" style={{ background: C.canvas }}>

      {/* ══════════════════════════════════════════════════════════════════
          SESSIONS PANEL — slim left panel with chat history
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex w-[172px] flex-none flex-col"
        style={{ background: "oklch(0.055 0 0)", borderRight: `1px solid ${C.borderSubtle}` }}
      >
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={newChat}
            className="w-full h-8 rounded-xl inline-flex items-center gap-2 px-3 transition-all duration-150"
            style={{ background: C.surface, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.raised; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            <Plus className="h-3 w-3 shrink-0" />
            <span className="text-[11.5px] font-medium">New Chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3">
          <div className="px-1.5 pt-2 pb-1 text-[8.5px] font-semibold uppercase tracking-[0.34em]" style={{ color: C.textMuted }}>
            Recent
          </div>
          {chats.length === 0 ? (
            <p className="px-1.5 mt-1 text-[11px] leading-relaxed" style={{ color: C.textMuted }}>
              Start a conversation.
            </p>
          ) : (
            chats.slice(0, 16).map((c) => (
              <div
                key={c.id}
                className="group flex items-center rounded-lg mb-[1px] transition-all duration-100"
                style={{ background: chatId === c.id ? "oklch(1 0 0 / 8%)" : "transparent" }}
                onMouseEnter={(e) => { if (chatId !== c.id) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)"; }}
                onMouseLeave={(e) => { if (chatId !== c.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <button
                  onClick={() => setChatId(c.id)}
                  className="flex-1 text-left px-2.5 py-1.5 text-[11.5px] truncate"
                  style={{ color: chatId === c.id ? C.textSecondary : "oklch(1 0 0 / 34%)" }}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  className="hidden group-hover:flex shrink-0 p-1.5 mr-1 rounded"
                  style={{ color: C.textMuted }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.52 0.15 24)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT — the intelligence command center
      ══════════════════════════════════════════════════════════════════ */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{ background: "radial-gradient(ellipse 80% 45% at 50% -8%, oklch(0.72 0.10 224 / 9%) 0%, #000 60%)" }}
      >
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-6 pt-5 pb-0"
          style={{ borderBottom: `1px solid oklch(1 0 0 / 6%)` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.32em", color: "oklch(1 0 0 / 22%)", marginBottom: 6 }}>
                AI Strategist
              </div>
              <h1 style={{
                fontFamily: "'Inter Tight', 'Inter', sans-serif",
                fontSize: "1.45rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.1,
                color: C.textPrimary,
              }}>
                {isCreator
                  ? firstName ? `${firstName}'s command center.` : "Your command center."
                  : companyName ? `${companyName}'s intelligence.` : "Brand intelligence."}
              </h1>
            </div>
            <button
              onClick={newChat}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl px-3.5 h-8 text-[12px] font-medium transition-all duration-150 shrink-0"
              style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 45%)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 9%)"; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 45%)"; }}
            >
              <Plus className="h-3.5 w-3.5" /> New Chat
            </button>
          </div>

          {/* Tab bar */}
          <div className="tab-bar-scroll flex gap-0 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2.5 text-[12px] font-semibold transition-all duration-150 border-b-2"
                style={{
                  color: activeTab === tab.id ? C.textPrimary : "oklch(1 0 0 / 28%)",
                  borderBottomColor: activeTab === tab.id ? C.aiBlue : "transparent",
                  background: "transparent",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 50%)"; }}
                onMouseLeave={(e) => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 28%)"; }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scroll area ───────────────────────────────────────────── */}
        <div ref={scroller} className={`flex-1 min-h-0 ${messages.length === 0 ? "overflow-y-hidden" : "overflow-y-auto"}`}>
          {messages.length === 0 ? (

            <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
              <div className="w-full max-w-2xl">

                {/* AI Orb */}
                <div className="relative mx-auto mb-8" style={{ width: 88, height: 88 }}>
                  {/* Outer ambient glow */}
                  <div
                    className="absolute rounded-full animate-pulse"
                    style={{
                      inset: -28,
                      background: "radial-gradient(circle, oklch(0.66 0.005 0 / 10%) 0%, transparent 68%)",
                      animationDuration: "4s",
                    }}
                  />
                  {/* Middle glow ring */}
                  <div
                    className="absolute rounded-full animate-pulse"
                    style={{
                      inset: -14,
                      background: `radial-gradient(circle, ${C.aiBlueGlow} 0%, transparent 70%)`,
                      animationDuration: "3s",
                      animationDelay: "0.5s",
                    }}
                  />
                  {/* Main orb */}
                  <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                      background: "radial-gradient(circle at 38% 32%, oklch(0.32 0.002 0) 0%, oklch(0.14 0.001 0) 45%, oklch(0.07 0 0) 100%)",
                      border: "1px solid oklch(1 0 0 / 18%)",
                      boxShadow: "inset 0 1px 0 oklch(1 0 0 / 28%), inset 0 0 24px oklch(0 0 0 / 55%), 0 0 36px oklch(0.66 0.005 0 / 10%), 0 4px 24px oklch(0 0 0 / 60%)",
                    }}
                  >
                    {/* Inner highlight */}
                    <div style={{
                      position: "absolute", top: "10%", left: "18%",
                      width: "46%", height: "38%",
                      background: `radial-gradient(ellipse, ${C.aiBlueGlow} 0%, transparent 70%)`,
                      borderRadius: "50%",
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-7 w-7" style={{ color: C.aiBlue }} />
                    </div>
                  </div>
                  {/* Outer chrome ring */}
                  <div
                    className="absolute rounded-full"
                    style={{ inset: -5, border: "0.5px solid oklch(1 0 0 / 8%)" }}
                  />
                </div>

                {/* Welcome headline */}
                <h2
                  className="text-center mb-3"
                  style={{
                    fontFamily: "'Inter Tight', 'Inter', sans-serif",
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.15,
                    color: C.textPrimary,
                  }}
                >
                  {welcome.title}
                </h2>
                <p
                  className="text-center leading-relaxed mb-8 max-w-sm mx-auto"
                  style={{ fontSize: 13.5, color: "oklch(1 0 0 / 38%)" }}
                >
                  {tabSubtitle}
                </p>

                {/* No creator profile CTA */}
                {isCreator && hasCreatorProfile === false && (
                  <div
                    className="rounded-[18px] px-5 py-4 flex items-center justify-between gap-4"
                    style={{ background: "oklch(0.085 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}
                  >
                    <div className="min-w-0">
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3, color: C.textPrimary }}>Build your creator profile</div>
                      <div style={{ fontSize: 12, color: "oklch(1 0 0 / 38%)" }}>Get discovered by brands — takes about 5 minutes.</div>
                    </div>
                    <Link
                      to="/creator-onboarding"
                      className="btn-primary shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] font-medium"
                    >
                      Get started <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

              </div>
            </div>

          ) : (

            /* ══════════ MESSAGES ══════════ */
            <div className="max-w-2xl mx-auto w-full px-5 py-10 space-y-6">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div
                      className="ai-msg-user"
                      style={{
                        maxWidth: "82%",
                        padding: "12px 18px",
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: C.textPrimary,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="ai-msg-assistant group relative">
                    {/* AI avatar header */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        background: "radial-gradient(circle at 38% 32%, oklch(0.28 0.002 0), oklch(0.10 0 0))",
                        border: "1px solid oklch(1 0 0 / 20%)",
                        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 20%), 0 2px 8px oklch(0 0 0 / 60%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Sparkles className="h-3 w-3" style={{ color: C.aiBlue }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: "oklch(1 0 0 / 28%)" }}>MRKT AI</span>
                    </div>
                    {m.content ? (() => {
                      const isLive = streaming && i === messages.length - 1;
                      const { text, panels } = isLive
                        ? { text: m.content, panels: [] }
                        : parseMrktPanels(m.content);
                      return (
                        <>
                          <div className="prose prose-invert prose-sm max-w-none leading-[1.8] prose-headings:font-display prose-headings:tracking-tight prose-a:text-foreground/70 prose-code:text-foreground/80 prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-p:text-foreground/80 prose-li:text-foreground/80">
                            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown>
                          </div>
                          {panels.map((p, pi) => renderMrktPanel(p, pi))}
                        </>
                      );
                    })() : (
                      <div className="flex items-center gap-1.5 py-2 pl-1">
                        <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                        <span className="typing-dot" style={{ animationDelay: "150ms" }} />
                        <span className="typing-dot" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                    {m.content && !streaming && (
                      <div className="flex items-center gap-0.5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => copyMessage(m.content, i)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-100"
                          style={{ color: copiedIdx === i ? C.accent : C.textTertiary }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; if (copiedIdx !== i) (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; if (copiedIdx !== i) (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                        >
                          <Copy className="h-3 w-3" /><span>{copiedIdx === i ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          onClick={() => setSaveTarget(m.content)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-100"
                          style={{ color: savedMsgKeys.has(m.content) ? C.accent : C.textTertiary }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; if (!savedMsgKeys.has(m.content)) (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; if (!savedMsgKeys.has(m.content)) (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                        >
                          {savedMsgKeys.has(m.content)
                            ? <><BookmarkCheck className="h-3 w-3" /><span>Saved</span></>
                            : <><Bookmark className="h-3 w-3" /><span>Save</span></>}
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

          )}
        </div>

        {/* ══════════ COMPOSER ══════════ */}
        <div className="shrink-0 px-5 pb-5 pt-3">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="max-w-2xl mx-auto">
            <div
              className="ai-composer transition-all duration-200"
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "oklch(1 0 0 / 20%)";
                e.currentTarget.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 16%), 0 16px 60px oklch(0 0 0 / 70%), 0 6px 20px oklch(0 0 0 / 55%), 0 0 0 1px oklch(1 0 0 / 7%)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "oklch(1 0 0 / 12%)";
                e.currentTarget.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 11%), 0 12px 48px oklch(0 0 0 / 65%), 0 4px 16px oklch(0 0 0 / 50%)";
              }}
            >
              <div className="px-5 pt-5 pb-1">
                <textarea
                  ref={textarea}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder={
                    activeTab === "chat"            ? "Ask me anything about your marketing strategy…"
                    : activeTab === "strategy"      ? "Let's build your strategy. What are your goals?"
                    : activeTab === "insights"      ? "Ask for insights on your performance or audience…"
                    :                                 "What recommendations would you like?"
                  }
                  rows={1}
                  className="w-full bg-transparent resize-none outline-none leading-relaxed"
                  style={{ minHeight: 26, maxHeight: 160, color: C.textPrimary, fontSize: 14 }}
                />
              </div>
              <div className="flex items-center px-4 pb-4 pt-2 gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg px-3 h-7 text-[11.5px] font-medium transition-all duration-150"
                  style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 35%)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 65%)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 18%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 35%)"; (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 9%)"; }}
                >
                  <Zap className="h-3 w-3" />
                  <span>Deep Research</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg px-2.5 h-7 transition-all duration-100"
                  style={{ color: "oklch(1 0 0 / 25%)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 50%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 25%)"; }}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                {/* Send */}
                <button
                  type="submit"
                  disabled={streaming || !input.trim()}
                  className="ml-auto h-9 w-9 rounded-full flex-none flex items-center justify-center transition-all duration-200"
                  style={{
                    background: input.trim() && !streaming ? "oklch(0.97 0 0)" : "oklch(1 0 0 / 7%)",
                    border: `1px solid ${input.trim() && !streaming ? "transparent" : "oklch(1 0 0 / 10%)"}`,
                    boxShadow: input.trim() && !streaming ? "0 2px 12px oklch(0 0 0 / 55%)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (input.trim() && !streaming) {
                      (e.currentTarget as HTMLElement).style.background = "#fff";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-1px) scale(1.04)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px oklch(0 0 0 / 65%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (input.trim() && !streaming) {
                      (e.currentTarget as HTMLElement).style.background = "oklch(0.97 0 0)";
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px oklch(0 0 0 / 55%)";
                    }
                  }}
                >
                  {streaming
                    ? <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "oklch(1 0 0 / 40%)" }} />
                    : <Send className="h-3.5 w-3.5" style={{ color: input.trim() ? "oklch(0.06 0 0)" : "oklch(1 0 0 / 22%)" }} />
                  }
                </button>
              </div>
            </div>

            <p className="mt-3 text-[10px] text-center" style={{ color: "oklch(1 0 0 / 18%)", letterSpacing: "0.02em" }}>
              MRKT AI can make mistakes — always review before taking action.
            </p>
          </form>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — Intelligence panel
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden xl:flex w-[272px] flex-none flex-col overflow-y-auto"
        style={{ background: "oklch(0.055 0 0)", borderLeft: `1px solid ${C.borderSubtle}` }}
      >
        {/* Header */}
        <div
          className="h-[54px] shrink-0 px-5 flex items-center"
          style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: C.textMuted }}>
            AI Intelligence
          </span>
        </div>

        <div className="p-4 space-y-6">

          {/* ── AI Quick Actions ──────────────────────────────── */}
          <section>
            <div className="text-[9px] uppercase tracking-[0.32em] font-semibold mb-3" style={{ color: C.textMuted }}>
              AI Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map(({ icon: Icon, label, chip }) => (
                <button
                  key={label}
                  onClick={() => send(expandChip(chip))}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all duration-150"
                  style={{ background: C.surface, border: `1px solid ${C.borderSubtle}`, boxShadow: C.shadowCard }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.raised; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
                >
                  <Icon className="h-3 w-3 shrink-0" style={{ color: C.aiBlue }} />
                  <span className="text-[11px] font-medium leading-snug" style={{ color: C.textTertiary }}>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: 1, background: C.borderSubtle }} />

          {/* ── Your Goals ────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: C.textMuted }}>
                Your Goals
              </div>
              <Link
                to={isCreator ? "/analytics" : "/pipeline"}
                className="text-[10.5px] transition-colors"
                style={{ color: C.textQuaternary, textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textQuaternary; }}
              >
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {sidebarGoals.map(({ label, sub, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: C.textSecondary }}>{label}</div>
                      <div className="text-[10.5px]" style={{ color: C.textMuted }}>{sub}</div>
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textTertiary }}>{pct}%</span>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, oklch(0.62 0.10 224 / 80%), oklch(0.82 0.18 264 / 70%))" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: 1, background: C.borderSubtle }} />

          {/* ── AI Insights ───────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] uppercase tracking-[0.32em] font-semibold" style={{ color: C.textMuted }}>
                AI Insights
              </div>
              <button
                className="text-[10.5px] transition-colors"
                style={{ color: C.textQuaternary, background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textQuaternary; }}
                onClick={() => send("Give me a comprehensive AI analysis of my " + (isCreator ? "creator performance, profile strength, and growth opportunities." : "campaign performance, pipeline status, and creator market opportunities."))}
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {aiInsights.map(({ icon: Icon, color, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="h-5 w-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${color.replace(")", " / 12%)")}`, border: `1px solid ${color.replace(")", " / 20%)")}` }}
                  >
                    <Icon className="h-2.5 w-2.5" style={{ color }} />
                  </div>
                  <p className="text-[11.5px] leading-relaxed" style={{ color: C.textTertiary }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </aside>

      {saveTarget && (
        <SaveModal
          content={saveTarget}
          chatId={chatId}
          onClose={() => setSaveTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
