import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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
  Copy,
  TrendingUp, ChevronRight, Wand2, Layers, Folder,
  MessageSquare, Globe, Eye, Briefcase,
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

const C = {
  canvas:       "#000",
  base:         "oklch(0.075 0 0)",      // sidebars
  surface:      "oklch(0.11 0 0)",       // cards
  raised:       "oklch(0.15 0 0)",       // nested / inner
  high:         "oklch(0.19 0 0)",       // highest elevation

  borderSubtle: "oklch(1 0 0 / 9%)",
  borderNormal: "oklch(1 0 0 / 13%)",
  borderStrong: "oklch(1 0 0 / 20%)",
  borderFocus:  "oklch(1 0 0 / 30%)",

  // Card shadow with top-edge inset highlight (Apple style)
  shadowCard:   "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  shadowWidget: "inset 0 1px 0 oklch(1 0 0 / 10%), 0 4px 16px oklch(0 0 0 / 55%)",
  shadowComposer:"inset 0 1px 0 oklch(1 0 0 / 14%), 0 8px 40px oklch(0 0 0 / 60%), 0 2px 8px oklch(0 0 0 / 45%)",

  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",

  chrome:   "oklch(0.82 0.005 250)",
  accent:   "oklch(0.72 0.14 152)",
} as const;

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
  strategy:       "oklch(0.65 0.14 250)",
  content_plan:   "oklch(0.72 0.14 152)",
  campaign_brief: "oklch(0.78 0.12 60)",
  hooks:          "oklch(0.72 0.1 290)",
  captions:       "oklch(0.68 0.12 20)",
  calendar:       "oklch(0.65 0.1 200)",
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
        className="relative w-full max-w-md rounded-2xl p-6 space-y-5"
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
                  background: type === t.value ? "oklch(0.72 0.14 152 / 18%)" : C.raised,
                  border: `1px solid ${type === t.value ? "oklch(0.72 0.14 152 / 45%)" : C.borderSubtle}`,
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
                    background: projectId === p.id ? "oklch(0.72 0.14 152 / 18%)" : C.raised,
                    border: `1px solid ${projectId === p.id ? "oklch(0.72 0.14 152 / 45%)" : C.borderSubtle}`,
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
            style={{ background: "oklch(0.78 0.12 60 / 12%)", color: "oklch(0.78 0.12 60 / 55%)", border: "1px solid oklch(0.78 0.12 60 / 18%)" }}
          >
            Soon
          </span>
        )}
      </div>
      <div className="text-[12px]" style={{ color: "oklch(1 0 0 / 42%)" }}>{desc}</div>
    </>
  );

  const sharedStyle: React.CSSProperties = {
    background: "oklch(0.11 0 0)",
    border: "1px solid oklch(1 0 0 / 13%)",
    boxShadow: "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  };

  const hoverIn  = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "translateY(-2px)";
    el.style.background = "oklch(0.15 0 0)";
    el.style.borderColor = "oklch(1 0 0 / 20%)";
    el.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 14%), 0 6px 24px oklch(0 0 0 / 65%), 0 2px 6px oklch(0 0 0 / 50%)";
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = "";
    el.style.background = "oklch(0.11 0 0)";
    el.style.borderColor = "oklch(1 0 0 / 13%)";
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
        background: "oklch(0.11 0 0)",
        border: "1px solid oklch(1 0 0 / 13%)",
        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 11%), 0 1px 4px oklch(0 0 0 / 40%)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <span style={{ color: "oklch(1 0 0 / 28%)" }}>{icon}</span>
        <span className="text-[9.5px] uppercase tracking-[0.26em] font-semibold" style={{ color: "oklch(1 0 0 / 26%)" }}>{label}</span>
      </div>
      <div className="text-[1.5rem] font-bold tracking-tight leading-none" style={{ color: "oklch(0.82 0.005 250)", fontVariantNumeric: "tabular-nums" }}>
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
  const [creatorMetrics, setCreatorMetrics] = useState<{ profileViews: number; matchAppearances: number; savedByCount: number } | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,account_type,onboarding_path,niche,platforms,goal,business_stage")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile((data as UserProfile) ?? null));
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
        body: JSON.stringify({ messages: next }),
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

  const initial     = profile?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "M";
  const displayName = profile?.name ?? user?.email ?? "";
  const roleLabel   = getRoleLabel(profile);
  const welcome     = getWelcome(profile);
  const suggestions   = getSuggestions(profile, bizProfile);
  const isCreator     = isCreatorAccount(profile);
  const isBusiness    = isBusinessAccount(profile);
  const profilePct    = getProfileCompletion(profile, bizProfile);
  const firstName     = profile?.name?.split(" ")[0] ?? "";
  const companyName   = bizProfile?.company_name ?? null;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex overflow-hidden" style={{ background: C.canvas }}>

      {/* ══════════════════════════════════════════════════════════════════
          SESSIONS PANEL — recent chats; nav lives in AppShell sidebar
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex w-[180px] flex-none flex-col"
        style={{
          background: C.base,
          borderRight: `1px solid ${C.borderSubtle}`,
        }}
      >
        {/* New Chat button */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <button
            onClick={newChat}
            className="w-full h-9 rounded-xl inline-flex items-center justify-between px-3 transition-all duration-150"
            style={{
              background: C.surface,
              border: `1px solid ${C.borderNormal}`,
              boxShadow: C.shadowCard,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = C.raised;
              (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = C.surface;
              (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
            }}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" style={{ color: C.textSecondary }} />
              <span className="text-[12.5px] font-medium" style={{ color: C.textSecondary }}>New Chat</span>
            </div>
            <kbd
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: C.raised, color: C.textMuted, border: `1px solid ${C.borderSubtle}` }}
            >⌘K</kbd>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3">
          <div className="px-1.5 py-2 text-[9px] font-semibold uppercase tracking-[0.32em]" style={{ color: C.textMuted }}>
            Recent
          </div>
          {chats.length === 0 ? (
            <p className="px-1.5 text-[11.5px] leading-relaxed" style={{ color: C.textMuted }}>
              Start a conversation to get AI help.
            </p>
          ) : (
            chats.slice(0, 14).map((c) => (
              <div
                key={c.id}
                className="group flex items-center rounded-lg mb-[1px] transition-all duration-100"
                style={{
                  background: chatId === c.id ? "oklch(1 0 0 / 9%)" : "transparent",
                  boxShadow: chatId === c.id ? "inset 0 1px 0 oklch(1 0 0 / 8%)" : "none",
                }}
                onMouseEnter={(e) => { if (chatId !== c.id) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
                onMouseLeave={(e) => { if (chatId !== c.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <button
                  onClick={() => setChatId(c.id)}
                  className="flex-1 text-left px-2.5 py-2 text-[12px] truncate leading-snug"
                  style={{ color: chatId === c.id ? C.textSecondary : "oklch(1 0 0 / 38%)" }}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  className="hidden group-hover:flex shrink-0 p-1.5 mr-1 rounded-lg transition-all duration-100"
                  style={{ color: C.textMuted }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.70 0.18 25)"; }}
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
          MAIN CONTENT — pure black canvas, content floats above it
      ══════════════════════════════════════════════════════════════════ */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 80% 40% at 30% 0%, oklch(0.07 0 0) 0%, #000 55%)",
        }}
      >
        {/* Thin top bar — mobile new-chat shortcut only; desktop chrome lives in AppShell */}
        <div
          className="md:hidden h-[48px] shrink-0 px-4 flex items-center justify-end"
          style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: "oklch(0 0 0 / 60%)" }}
        >
          <button onClick={newChat} className="inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12.5px] transition-all duration-150" style={{ color: C.textTertiary, background: C.surface, border: `1px solid ${C.borderNormal}` }}>
            <Plus className="h-3.5 w-3.5" /> New Chat
          </button>
        </div>

        {/* Scroll area */}
        <div ref={scroller} className="flex-1 overflow-y-auto">

          {messages.length === 0 ? (
            /* ══════════ DASHBOARD ══════════ */
            <div className="max-w-3xl mx-auto px-6 py-10 pb-6">

              {/* ── Greeting ────────────────────────────────────────── */}
              <div className="mb-8">
                <h1
                  className="font-display text-[2rem] font-semibold tracking-[-0.04em] leading-[1.1]"
                  style={{ color: C.textPrimary }}
                >
                  {getGreeting()}{isBusiness && companyName ? `, ${companyName}` : firstName ? `, ${firstName}` : ""}. <span style={{ color: C.chrome }}>✦</span>
                </h1>
                <p className="mt-2 text-[14.5px] font-light" style={{ color: C.textTertiary }}>
                  {welcome.sub}
                </p>
              </div>

              {/* ── Creator quick actions ────────────────────────────── */}
              {isCreator && (
                <div className="mb-8">
                  <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4" style={{ color: C.textQuaternary }}>
                    Quick Actions
                  </div>

                  {/* No profile yet — setup CTA above cards */}
                  {hasCreatorProfile === false && (
                    <div
                      className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mb-4"
                      style={{ background: "oklch(0.72 0.14 152 / 8%)", border: "1px solid oklch(0.72 0.14 152 / 28%)" }}
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold mb-1" style={{ color: C.textPrimary }}>
                          Build your creator profile
                        </div>
                        <div className="text-[12.5px]" style={{ color: C.textTertiary }}>
                          Get discovered by brands — takes about 5 minutes.
                        </div>
                      </div>
                      <Link
                        to="/creator-onboarding"
                        className="btn-primary shrink-0 inline-flex items-center gap-1.5 rounded-full px-5 h-9 text-[12.5px] font-medium"
                      >
                        Get started <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <ActionCard
                      icon={<ArrowUpRight className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="View Public Profile"
                      desc="See how brands view your creator profile."
                      href={hasCreatorProfile && creatorProfileId ? `/creators/${creatorProfileId}` : "/creator-onboarding"}
                    />
                    <ActionCard
                      icon={<PenLine className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Edit Profile"
                      desc="Update creator information and audience data."
                      href="/creator-onboarding"
                    />
                    <ActionCard
                      icon={<Layers className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Create 30-Day Content Plan"
                      desc="Generate a personalized content strategy."
                      onClick={() => send("Create a personalized 30-day content plan tailored to my niche, platforms, and audience goals.")}
                    />
                    <ActionCard
                      icon={<Sparkles className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Generate 30 Hook Ideas"
                      desc="Create viral hook ideas for content."
                      onClick={() => send("Generate 30 high-converting, scroll-stopping hook ideas for TikTok and Reels in my niche.")}
                    />
                    <ActionCard
                      icon={<Zap className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Find Collaboration Opportunities"
                      desc="Discover campaigns and brands."
                      href="/opportunities"
                    />
                    <ActionCard
                      icon={<BarChart3 className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Analyze My Profile"
                      desc="Get AI insights and visibility recommendations."
                      onClick={() => send("Analyze my creator profile and provide detailed visibility insights, growth recommendations, and actionable steps to increase brand partnerships.")}
                    />
                    <ActionCard
                      icon={<TrendingUp className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Creator Analytics"
                      desc="See profile views, saves, visibility score, and performance."
                      href="/analytics"
                    />
                    <ActionCard
                      icon={<Globe className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="MRKT Globe"
                      desc="Manage creator availability locations."
                      href="/globe"
                    />
                  </div>
                </div>
              )}

              {/* ── Business quick actions ───────────────────────────── */}
              {isBusiness && (
                <div className="mb-8">
                  <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4" style={{ color: C.textQuaternary }}>
                    Quick Actions
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <ActionCard
                      icon={<Users className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Find Creators"
                      desc="Search and discover creators."
                      href="/find-creators"
                    />
                    <ActionCard
                      icon={<Layers className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Create Project"
                      desc="Launch a new campaign workspace."
                      href="/projects"
                    />
                    <ActionCard
                      icon={<FileText className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Create Campaign Brief"
                      desc="Define campaign goals and creator requirements."
                      href="/campaign-create"
                    />
                    <ActionCard
                      icon={<Sparkles className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Find AI Matches"
                      desc="Get creator recommendations."
                      onClick={() => send("Based on my brand profile and campaign goals, recommend the ideal creator profiles and matching criteria for my next campaign.")}
                    />
                    <ActionCard
                      icon={<Briefcase className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Pipeline Management"
                      desc="Manage saved and contacted creators."
                      href="/find-creators"
                    />
                    <ActionCard
                      icon={<PenLine className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Generate Outreach"
                      desc="Create personalized outreach drafts."
                      onClick={() => send("Help me write personalized, high-converting outreach messages for creators I want to partner with for my upcoming campaign.")}
                    />
                    <ActionCard
                      icon={<BarChart3 className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="Campaign Analytics"
                      desc="Track campaign performance."
                      onClick={() => send("Analyze my campaign performance and provide detailed insights, ROI analysis, and strategic recommendations for improvement.")}
                    />
                    <ActionCard
                      icon={<Globe className="h-4 w-4" style={{ color: C.chrome }} />}
                      title="MRKT Globe"
                      desc="Discover creators by availability location."
                      href="/globe"
                    />
                  </div>
                </div>
              )}

              {/* ── Overview metrics ─────────────────────────────────── */}
              <div className="mb-4">
                <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4" style={{ color: C.textQuaternary }}>
                  Overview
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {isCreator ? (
                    <>
                      <MetricChip
                        icon={<Eye className="h-3.5 w-3.5" />}
                        label="Profile Views"
                        value={creatorMetrics?.profileViews ?? "—"}
                      />
                      <MetricChip
                        icon={<Bookmark className="h-3.5 w-3.5" />}
                        label="Saved by Brands"
                        value={creatorMetrics?.savedByCount ?? "—"}
                      />
                      <MetricChip
                        icon={<Zap className="h-3.5 w-3.5" />}
                        label="Matching"
                        value={creatorMetrics?.matchAppearances ?? "—"}
                      />
                      <MetricChip
                        icon={<TrendingUp className="h-3.5 w-3.5" />}
                        label="Analytics"
                        value="View →"
                        href="/analytics"
                      />
                    </>
                  ) : (
                    <>
                      <MetricChip
                        icon={<Layers className="h-3.5 w-3.5" />}
                        label="Projects"
                        value={projects.length}
                      />
                      <MetricChip
                        icon={<Bookmark className="h-3.5 w-3.5" />}
                        label="Saved Outputs"
                        value={savedOutputs.length}
                      />
                      <MetricChip
                        icon={<MessageSquare className="h-3.5 w-3.5" />}
                        label="AI Sessions"
                        value={chats.length}
                      />
                      <MetricChip
                        icon={<Users className="h-3.5 w-3.5" />}
                        label="Find Creators"
                        value="Browse →"
                        href="/find-creators"
                      />
                    </>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* ══════════ MESSAGES ══════════ */
            <div className="max-w-2xl mx-auto w-full px-5 py-10 space-y-9">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div
                      className="max-w-[80%] rounded-[20px] rounded-br-[5px] px-5 py-3.5 text-[14.5px] leading-relaxed"
                      style={{
                        background: C.raised,
                        border: `1px solid ${C.borderStrong}`,
                        color: C.textPrimary,
                        boxShadow: C.shadowCard,
                      }}
                    >{m.content}</div>
                  </div>
                ) : (
                  <div key={i} className="group relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: C.surface,
                          border: `1px solid ${C.borderNormal}`,
                          boxShadow: C.shadowCard,
                        }}
                      >
                        <Sparkles className="h-3 w-3" style={{ color: C.chrome }} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: C.textQuaternary }}>MRKT</span>
                    </div>
                    <div className="pl-[30px]">
                      {m.content ? (
                        <div className="prose prose-invert prose-sm max-w-none leading-[1.8] prose-headings:font-display prose-headings:tracking-tight prose-a:text-foreground/70 prose-code:text-foreground/80 prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-p:text-foreground/80 prose-li:text-foreground/80">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 py-2">
                          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 30%)" }} />
                          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 20%)", animationDelay: "0.15s" }} />
                          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)", animationDelay: "0.3s" }} />
                        </div>
                      )}
                      {m.content && !streaming && (
                        <div className="flex items-center gap-0.5 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => copyMessage(m.content, i)}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-150"
                            style={{ color: copiedIdx === i ? C.accent : C.textTertiary }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; if (copiedIdx !== i) (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; if (copiedIdx !== i) (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                          >
                            <Copy className="h-3 w-3" />
                            <span>{copiedIdx === i ? "Copied" : "Copy"}</span>
                          </button>
                          <button
                            onClick={() => setSaveTarget(m.content)}
                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-150"
                            style={{ color: savedMsgKeys.has(m.content) ? C.accent : C.textTertiary }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; if (!savedMsgKeys.has(m.content)) (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; if (!savedMsgKeys.has(m.content)) (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                          >
                            {savedMsgKeys.has(m.content)
                              ? <><BookmarkCheck className="h-3 w-3" /><span>Saved</span></>
                              : <><Bookmark className="h-3 w-3" /><span>Save</span></>
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* ══════════ COMPOSER — the centerpiece ══════════ */}
        <div className="shrink-0 px-5 pb-5 pt-3">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="max-w-2xl mx-auto">
            <div
              className="rounded-2xl transition-all duration-200"
              style={{
                background: C.surface,
                border: `1px solid ${C.borderNormal}`,
                boxShadow: C.shadowComposer,
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = C.borderStrong;
                e.currentTarget.style.boxShadow = `inset 0 1px 0 oklch(1 0 0 / 18%), 0 12px 48px oklch(0 0 0 / 65%), 0 4px 12px oklch(0 0 0 / 50%), 0 0 0 1px oklch(1 0 0 / 6%)`;
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = C.borderNormal;
                e.currentTarget.style.boxShadow = C.shadowComposer;
              }}
            >
              <div className="px-4 pt-4 pb-1">
                <textarea
                  ref={textarea}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder="Ask your marketing strategist anything…"
                  rows={1}
                  className="w-full bg-transparent resize-none outline-none text-[14.5px] leading-relaxed placeholder:text-muted-foreground/28"
                  style={{ minHeight: 26, maxHeight: 160, color: C.textPrimary }}
                />
              </div>
              <div className="flex items-center px-3 pb-3 pt-1 gap-1">
                {([
                  { icon: Paperclip,      label: "Attach"       },
                  { icon: Search,         label: "Search"       },
                  { icon: Wand2,          label: "Create Image" },
                  { icon: MoreHorizontal, label: "More"         },
                ] as { icon: React.ComponentType<{ className?: string }>, label: string }[]).map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] transition-all duration-150"
                    style={{ color: C.textTertiary }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = C.raised;
                      (e.currentTarget as HTMLElement).style.color = C.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                      (e.currentTarget as HTMLElement).style.color = C.textTertiary;
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
                <button
                  type="submit"
                  disabled={streaming || !input.trim()}
                  className="ml-auto h-9 w-9 rounded-full flex-none flex items-center justify-center transition-all duration-150"
                  style={{
                    background: input.trim() && !streaming ? "oklch(0.95 0 0)" : C.raised,
                    border: `1px solid ${input.trim() && !streaming ? "transparent" : C.borderNormal}`,
                    boxShadow: input.trim() && !streaming ? "0 2px 8px oklch(0 0 0 / 50%)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (input.trim() && !streaming) {
                      (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px oklch(0 0 0 / 55%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (input.trim() && !streaming) {
                      (e.currentTarget as HTMLElement).style.background = "oklch(0.95 0 0)";
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px oklch(0 0 0 / 50%)";
                    }
                  }}
                >
                  <Send
                    className="h-3.5 w-3.5"
                    style={{ color: input.trim() && !streaming ? "oklch(0.06 0 0)" : C.textTertiary }}
                  />
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-[10.5px] text-center" style={{ color: C.textMuted }}>
              MRKT can make mistakes — verify before publishing.
            </p>
          </form>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR  — base panel, widgets elevated above it
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden xl:flex w-[272px] flex-none flex-col overflow-y-auto"
        style={{
          background: C.base,
          borderLeft: `1px solid ${C.borderSubtle}`,
          boxShadow: "-1px 0 0 oklch(1 0 0 / 5%)",
        }}
      >
        <div
          className="h-[56px] shrink-0 px-5 flex items-center"
          style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: C.textTertiary }}>
            Workspace
          </span>
        </div>

        <div className="p-4 space-y-3">

          {/* Creator performance summary */}
          {isCreator && creatorMetrics && (
            <div
              className="rounded-[18px] p-4"
              style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowWidget }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>Performance</span>
                <Link
                  to="/analytics"
                  className="text-[10.5px] transition-colors"
                  style={{ color: C.textMuted }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Profile Views",   value: creatorMetrics.profileViews },
                  { label: "Saved by Brands", value: creatorMetrics.savedByCount },
                  { label: "AI Matching",     value: creatorMetrics.matchAppearances },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11.5px]" style={{ color: C.textTertiary }}>{label}</span>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: C.chrome }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Projects */}
          <div
            className="rounded-[18px] p-4"
            style={{
              background: C.surface,
              border: `1px solid ${C.borderNormal}`,
              boxShadow: C.shadowWidget,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>Projects</span>
              <Link
                to="/projects"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] transition-all duration-150"
                style={{
                  background: C.raised,
                  color: C.textTertiary,
                  border: `1px solid ${C.borderNormal}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = C.textPrimary;
                  (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = C.textTertiary;
                  (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
                }}
              >
                <Plus className="h-2.5 w-2.5" /> New
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="py-1">
                <p className="text-[12px] leading-relaxed mb-3" style={{ color: C.textTertiary }}>
                  Organize campaigns, creators, and strategies in a project workspace.
                </p>
                <Link
                  to="/projects"
                  className="text-[11.5px] transition-colors"
                  style={{ color: C.accent }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  Create first project →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}` as "/"}
                    className="w-full text-left rounded-[14px] p-3 flex items-center gap-2.5 transition-all duration-150"
                    style={{
                      background: "oklch(1 0 0 / 4%)",
                      border: `1px solid ${C.borderSubtle}`,
                      display: "flex",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = C.raised;
                      (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)";
                      (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle;
                    }}
                  >
                    <Folder className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
                    <span className="text-[12.5px] font-medium truncate leading-snug flex-1" style={{ color: C.textSecondary }}>
                      {p.name}
                    </span>
                    <span className="text-[9.5px] shrink-0" style={{ color: C.textMuted }}>
                      {relativeTime(p.updated_at).replace(" ago", "")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {projects.length > 3 && (
              <Link
                to="/projects"
                className="mt-3 w-full text-center text-[11px] py-1.5 rounded-lg transition-all block"
                style={{ color: C.textTertiary }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
              >
                View all {projects.length} projects →
              </Link>
            )}
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-[18px] p-4"
            style={{
              background: C.surface,
              border: `1px solid ${C.borderNormal}`,
              boxShadow: C.shadowWidget,
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-3.5 w-3.5" style={{ color: C.textTertiary }} />
              <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>Activity</span>
            </div>
            {savedOutputs.length === 0 && chats.length === 0 && projects.length === 0 ? (
              <p className="text-[12px] leading-relaxed" style={{ color: C.textTertiary }}>
                Your strategies generated, outputs saved, and campaigns created will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {[
                  ...savedOutputs.slice(0, 2).map((s) => ({
                    Icon: Bookmark,
                    text: `Saved · ${s.output_type.replace(/_/g, " ")}`,
                    sub: s.title.slice(0, 30) + (s.title.length > 30 ? "…" : ""),
                    time: relativeTime(s.created_at),
                    color: TYPE_COLORS[s.output_type] ?? TYPE_COLORS.other,
                    ts: new Date(s.created_at).getTime(),
                  })),
                  ...chats.slice(0, 2).map((c) => ({
                    Icon: MessageSquare,
                    text: "AI session",
                    sub: c.title.slice(0, 30) + (c.title.length > 30 ? "…" : ""),
                    time: relativeTime(c.updated_at),
                    color: "oklch(0.65 0.14 250)",
                    ts: new Date(c.updated_at).getTime(),
                  })),
                  ...projects.slice(0, 1).map((p) => ({
                    Icon: Layers,
                    text: "Project",
                    sub: p.name.slice(0, 30) + (p.name.length > 30 ? "…" : ""),
                    time: relativeTime(p.updated_at),
                    color: C.chrome,
                    ts: new Date(p.updated_at).getTime(),
                  })),
                ]
                  .sort((a, b) => b.ts - a.ts)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div
                        className="mt-0.5 h-[22px] w-[22px] rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: C.raised,
                          border: `1px solid ${C.borderNormal}`,
                          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%)",
                        }}
                      >
                        <item.Icon className="h-2.5 w-2.5" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11.5px] font-medium" style={{ color: C.textSecondary }}>{item.text}</p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: C.textTertiary }}>{item.sub}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: C.textQuaternary }}>{item.time}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Pro Tip */}
          <div
            className="rounded-[18px] p-4"
            style={{
              background: C.surface,
              border: `1px solid ${C.borderNormal}`,
              boxShadow: C.shadowWidget,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-3.5 w-3.5" style={{ color: "oklch(0.78 0.12 60)" }} />
              <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>Pro Tip</span>
            </div>
            <p className="text-[12.5px] leading-relaxed" style={{ color: C.textTertiary }}>
              {PRO_TIPS[tipIndex]}
            </p>
            <div className="flex items-center gap-1.5 mt-3.5">
              {PRO_TIPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTipIndex(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    height: "4px",
                    width: tipIndex === i ? "18px" : "4px",
                    background: tipIndex === i ? "oklch(0.78 0.12 60 / 60%)" : C.raised,
                  }}
                />
              ))}
            </div>
          </div>

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
