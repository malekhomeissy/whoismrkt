import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import {
  ArrowUpRight, Folder, MessageSquare,
  Bookmark, Clock, Sparkles, Trash2, ChevronRight,
  Edit2, Check, X, Users, MapPin,
  Wand2, ChevronDown, DollarSign, SlidersHorizontal,
  Target, Calendar, FileText, Search, BadgeCheck,
  TrendingUp, Zap, Copy, Send, Mail,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  formatFollowers,
  platformShort,
  platformColor,
  type CreatorCategory,
} from "@/types/creator";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({ meta: [{ title: "Project — MRKT" }] }),
  component: ProjectDetailPage,
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Chat = {
  id: string;
  title: string;
  updated_at: string;
};

type SavedOutput = {
  id: string;
  title: string;
  content: string;
  output_type: string;
  created_at: string;
};

type CampaignBrief = {
  id: string;
  project_id: string;
  user_id: string;
  campaign_name: string | null;
  campaign_goal: string | null;
  target_audience: string | null;
  audience_location: string | null;
  budget_range: string | null;
  campaign_deadline: string | null;
  platforms: string[];
  content_types: string[];
  creator_categories: string[];
  preferred_creator_size: string | null;
  brand_notes: string | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
};

type BriefFormState = {
  campaign_name: string;
  campaign_goal: string;
  target_audience: string;
  audience_location: string;
  budget_range: string;
  campaign_deadline: string;
  platforms: string[];
  content_types: string[];
  creator_categories: string[];
  preferred_creator_size: string;
  brand_notes: string;
  additional_notes: string;
};

type CreatorStatus = "saved" | "shortlisted" | "contacted" | "interested" | "negotiating" | "confirmed" | "rejected";
type CreatorPriority = "high" | "medium" | "low";

type SavedCreator = {
  id: string;
  note: string | null;
  status: CreatorStatus;
  internal_note: string | null;
  why_fits: string | null;
  estimated_rate: string | null;
  priority: CreatorPriority;
  outreach_draft: string | null;
  created_at: string;
  updated_at: string;
  creator_profiles: {
    id: string;
    display_name: string;
    username: string | null;
    niche: string | null;
    categories: string[];
    platforms: string[];
    profile_image_url: string | null;
    location: string | null;
    follower_count: number | null;
    bio: string | null;
    rate_range: string | null;
    accepts_paid: boolean;
    accepts_gifted: boolean;
    accepts_affiliate: boolean;
  } | null;
};

type SavedCreatorPatch = Partial<Pick<SavedCreator,
  "status" | "internal_note" | "why_fits" | "estimated_rate" | "priority" | "outreach_draft" | "note"
>>;

type OutreachDraft = {
  id: string;
  creator_profile_id: string;
  draft_type: string;
  subject: string | null;
  short_version: string | null;
  full_version: string | null;
  created_at: string;
};

type BusinessProfile = {
  company_name: string | null;
  industry: string | null;
  preferred_platforms: string[] | null;
  campaign_goals: string[] | null;
  target_audience: string | null;
};

type MatchCreator = {
  id: string;
  display_name: string;
  username: string | null;
  niche: string | null;
  categories: string[];
  platforms: string[];
  preferred_content_types: string[];
  location: string | null;
  audience_location: string | null;
  follower_count: number | null;
  profile_image_url: string | null;
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
};

type MatchResult = {
  creator: MatchCreator;
  score: number;
  label: string;
  reason: string;
};

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

const TYPE_COLORS: Record<string, string> = {
  strategy:       "oklch(0.75 0.005 0)",
  content_plan:   "oklch(0.84 0 0)",
  campaign_brief: "oklch(0.78 0.005 0)",
  hooks:          "oklch(0.78 0.005 0)",
  captions:       "oklch(0.72 0.005 0)",
  calendar:       "oklch(0.72 0.005 0)",
  other:          "oklch(1 0 0 / 35%)",
};

const AVATAR_COLORS = [
  "oklch(0.78 0.005 0)",  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)", "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 2)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─────────────────────────────────────────────────────────────
// Status & priority config — includes "saved"
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CreatorStatus, { label: string; color: string; bg: string; border: string }> = {
  saved:       { label: "Saved",       color: "oklch(1 0 0 / 46%)",    bg: "oklch(1 0 0 / 5%)",           border: "oklch(1 0 0 / 12%)"          },
  shortlisted: { label: "Shortlisted", color: "oklch(0.72 0.10 224)",  bg: "oklch(0.62 0.10 224 / 12%)",  border: "oklch(0.62 0.10 224 / 26%)"  },
  contacted:   { label: "Contacted",   color: "oklch(0.70 0.08 68)",   bg: "oklch(0.78 0.14 76 / 12%)",   border: "oklch(0.78 0.14 76 / 26%)"   },
  interested:  { label: "Interested",  color: "oklch(0.72 0.10 224)",  bg: "oklch(0.62 0.10 224 / 12%)",  border: "oklch(0.62 0.10 224 / 26%)"  },
  negotiating: { label: "Negotiating", color: "oklch(0.70 0.08 68)",   bg: "oklch(0.78 0.14 76 / 12%)",   border: "oklch(0.78 0.14 76 / 26%)"   },
  confirmed:   { label: "Confirmed",   color: "oklch(0.62 0.12 158)",  bg: "oklch(0.72 0.18 152 / 14%)",  border: "oklch(0.72 0.18 152 / 30%)"  },
  rejected:    { label: "Rejected",    color: "oklch(0.52 0.15 24)",   bg: "oklch(0.52 0.15 24 / 10%)",   border: "oklch(0.52 0.15 24 / 24%)"   },
};

const PRIORITY_CONFIG: Record<CreatorPriority, { label: string; color: string }> = {
  high:   { label: "High",   color: "oklch(0.52 0.15 24)"  },
  medium: { label: "Medium", color: "oklch(0.78 0.005 0)"  },
  low:    { label: "Low",    color: "oklch(1 0 0 / 38%)"   },
};

const NEXT_ACTIONS: Record<CreatorStatus, { label: string; type: "outreach" | "confirm" | null }> = {
  saved:       { label: "Generate Outreach", type: "outreach" },
  shortlisted: { label: "Generate Outreach", type: "outreach" },
  contacted:   { label: "Follow Up Draft",   type: "outreach" },
  interested:  { label: "Send Proposal",     type: "outreach" },
  negotiating: { label: "Confirm Deal",      type: "confirm"  },
  confirmed:   { label: "Brief Creator",     type: "outreach" },
  rejected:    { label: "",                  type: null        },
};

// ─────────────────────────────────────────────────────────────
// Campaign brief constants
// ─────────────────────────────────────────────────────────────

const BRIEF_GOALS = [
  "Brand Awareness", "Sales", "Product Launch", "UGC Creation",
  "Community Growth", "Website Traffic", "App Downloads", "Other",
];

const BRIEF_PLATFORMS = ["Instagram", "TikTok", "YouTube", "X", "Other"];

const BRIEF_CONTENT_TYPES = ["Reel", "Story", "Post", "TikTok", "UGC", "YouTube Short"];

const BRIEF_CATEGORIES = [
  { value: "fashion",   label: "Fashion"   },
  { value: "beauty",    label: "Beauty"    },
  { value: "fitness",   label: "Fitness"   },
  { value: "food",      label: "Food"      },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "tech",      label: "Tech"      },
  { value: "travel",    label: "Travel"    },
  { value: "luxury",    label: "Luxury"    },
  { value: "business",  label: "Business"  },
  { value: "gaming",    label: "Gaming"    },
  { value: "music",     label: "Music"     },
  { value: "other",     label: "Other"     },
];

const BRIEF_SIZES = ["Nano", "Micro", "Mid-tier", "Macro", "Celebrity"];

const EMPTY_BRIEF_FORM: BriefFormState = {
  campaign_name: "",
  campaign_goal: "",
  target_audience: "",
  audience_location: "",
  budget_range: "",
  campaign_deadline: "",
  platforms: [],
  content_types: [],
  creator_categories: [],
  preferred_creator_size: "",
  brand_notes: "",
  additional_notes: "",
};

function briefToForm(b: CampaignBrief | null): BriefFormState {
  if (!b) return { ...EMPTY_BRIEF_FORM };
  return {
    campaign_name:          b.campaign_name          ?? "",
    campaign_goal:          b.campaign_goal          ?? "",
    target_audience:        b.target_audience        ?? "",
    audience_location:      b.audience_location      ?? "",
    budget_range:           b.budget_range           ?? "",
    campaign_deadline:      b.campaign_deadline      ?? "",
    platforms:              b.platforms              ?? [],
    content_types:          b.content_types          ?? [],
    creator_categories:     b.creator_categories     ?? [],
    preferred_creator_size: b.preferred_creator_size ?? "",
    brand_notes:            b.brand_notes            ?? "",
    additional_notes:       b.additional_notes       ?? "",
  };
}

// ─────────────────────────────────────────────────────────────
// Matching algorithm
// ─────────────────────────────────────────────────────────────

const MATCH_LABEL_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  "Best Fit":     { color: "oklch(0.84 0 0)", bg: "oklch(1 0 0 / 14%)", border: "oklch(1 0 0 / 35%)" },
  "Strong Fit":   { color: "oklch(0.75 0.005 0)",  bg: "oklch(0.75 0.005 0 / 14%)",  border: "oklch(0.75 0.005 0 / 35%)"  },
  "Possible Fit": { color: "oklch(0.68 0.005 0)",  bg: "oklch(0.68 0.005 0 / 14%)",  border: "oklch(0.68 0.005 0 / 35%)"  },
  "Low Fit":      { color: "oklch(1 0 0 / 42%)",   bg: "oklch(1 0 0 / 6%)",           border: "oklch(1 0 0 / 14%)"         },
};

const CONTENT_TYPE_MAP: Record<string, string[]> = {
  "reel":          ["reels", "short video", "reel"],
  "story":         ["stories", "story"],
  "post":          ["static posts", "post", "photography"],
  "tiktok":        ["tiktok", "short video", "reels"],
  "ugc":           ["ugc videos", "ugc"],
  "youtube short": ["long-form video", "short video"],
};

function normPlatform(p: string): string {
  return p.toLowerCase().replace("twitter/x", "x").replace("twitter", "x");
}

function getCreatorTier(followers: number | null): string | null {
  if (!followers) return null;
  if (followers < 10_000)    return "nano";
  if (followers < 100_000)   return "micro";
  if (followers < 500_000)   return "mid-tier";
  if (followers < 1_000_000) return "macro";
  return "celebrity";
}

function scoreCreator(
  creator: MatchCreator,
  brief: BriefFormState,
): { score: number; reason: string; label: string } {
  let score = 0;
  const matchedCats: string[]  = [];
  const matchedPlats: string[] = [];
  let audLocMatch   = false;
  let creatLocMatch = false;

  // 1. Category overlap — max 35 pts
  const briefCats = brief.creator_categories.map((c) => c.toLowerCase());
  if (briefCats.length > 0) {
    const matched = creator.categories.filter((c) => briefCats.includes(c.toLowerCase()));
    if (matched.length > 0) {
      score += Math.min(35, Math.round((matched.length / briefCats.length) * 35));
      matchedCats.push(...matched);
    }
  }

  // 2. Platform overlap — max 30 pts
  const briefPlats = brief.platforms.map(normPlatform);
  if (briefPlats.length > 0) {
    const matched = creator.platforms.filter((p) => briefPlats.includes(normPlatform(p)));
    if (matched.length > 0) {
      score += Math.min(30, Math.round((matched.length / briefPlats.length) * 30));
      matchedPlats.push(...matched);
    }
  }

  // 3. Location match — max 20 pts (audience_location = 20, creator location = 10)
  const briefLoc = (brief.audience_location ?? "").toLowerCase().trim();
  if (briefLoc) {
    const audLoc   = (creator.audience_location ?? "").toLowerCase();
    const creatLoc = (creator.location ?? "").toLowerCase();
    if (audLoc && (audLoc.includes(briefLoc) || briefLoc.includes(audLoc))) {
      score += 20;
      audLocMatch = true;
    } else if (creatLoc && (creatLoc.includes(briefLoc) || briefLoc.includes(creatLoc))) {
      score += 10;
      creatLocMatch = true;
    }
  }

  // 4. Content type overlap — max 10 pts
  const briefTypes = brief.content_types.map((t) => t.toLowerCase());
  if (briefTypes.length > 0 && creator.preferred_content_types.length > 0) {
    const creatorTypes = creator.preferred_content_types.map((t) => t.toLowerCase());
    let hits = 0;
    for (const bt of briefTypes) {
      const keywords = CONTENT_TYPE_MAP[bt] ?? [bt];
      if (creatorTypes.some((ct) => keywords.some((kw) => ct.includes(kw) || kw.includes(ct)))) hits++;
    }
    if (hits > 0) score += Math.min(10, Math.round((hits / briefTypes.length) * 10));
  }

  // 5. Creator size match — max 5 pts
  if (brief.preferred_creator_size) {
    if (getCreatorTier(creator.follower_count) === brief.preferred_creator_size.toLowerCase()) {
      score += 5;
    }
  }

  score = Math.min(100, Math.max(0, score));
  const label  = score >= 90 ? "Best Fit" : score >= 70 ? "Strong Fit" : score >= 50 ? "Possible Fit" : "Low Fit";
  const reason = buildMatchReason(label, matchedCats, matchedPlats, audLocMatch, creatLocMatch, creator);
  return { score, reason, label };
}

function buildMatchReason(
  label: string,
  matchedCats: string[],
  matchedPlats: string[],
  audLocMatch: boolean,
  creatLocMatch: boolean,
  creator: MatchCreator,
): string {
  const catLabel = (c: string) => BRIEF_CATEGORIES.find((b) => b.value === c.toLowerCase())?.label ?? c;
  const parts: string[] = [];
  if (matchedCats.length > 0)  parts.push(`focuses on ${matchedCats.map(catLabel).join(", ")}`);
  if (matchedPlats.length > 0) parts.push(`posts on ${matchedPlats.join(" and ")}`);
  if (audLocMatch && creator.audience_location) parts.push(`targets audiences in ${creator.audience_location}`);
  else if (creatLocMatch && creator.location)   parts.push(`is based in ${creator.location}`);
  if (parts.length === 0) return "Profile partially aligns with your campaign requirements.";
  const body = parts.length === 1
    ? parts[0]
    : parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
  return `${label} — this creator ${body}.`;
}

// ─────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────

type Tab = "overview" | "brief" | "creators" | "outreach" | "sessions" | "outputs";

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [project,         setProject]         = useState<Project | null>(null);
  const [chats,           setChats]           = useState<Chat[]>([]);
  const [savedOutputs,    setSavedOutputs]    = useState<SavedOutput[]>([]);
  const [savedCreators,   setSavedCreators]   = useState<SavedCreator[]>([]);
  const [campaignBrief,   setCampaignBrief]   = useState<CampaignBrief | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [outreachDrafts,  setOutreachDrafts]  = useState<OutreachDraft[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState<Tab>("overview");
  const [expandedOutput,  setExpandedOutput]  = useState<string | null>(null);

  const [editing,  setEditing]  = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (!user || !projectId) return;
    loadAll();
  }, [user, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true);
    try {
      // ── Core data — must succeed for the page to render ──────────────────
      const [projRes, chatsRes, savedRes, creatorsRes, bizRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("projects").select("*").eq("id", projectId).eq("user_id", user!.id).maybeSingle(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("chats").select("id,title,updated_at").eq("project_id", projectId).order("updated_at", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("saved_outputs").select("id,title,content,output_type,created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("project_saved_creators")
          .select("id,note,status,internal_note,why_fits,estimated_rate,priority,outreach_draft,created_at,updated_at,creator_profiles(id,display_name,username,niche,categories,platforms,profile_image_url,location,follower_count,bio,rate_range,accepts_paid,accepts_gifted,accepts_affiliate)")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("business_profiles").select("company_name,industry,preferred_platforms,campaign_goals,target_audience").eq("user_id", user!.id).maybeSingle(),
      ]);

      if (!projRes.data) {
        toast.error("Project not found.");
        nav({ to: "/projects" as "/" });
        return;
      }

      setProject(projRes.data as Project);
      setChats(chatsRes.data ?? []);
      setSavedOutputs(savedRes.data ?? []);
      setSavedCreators((creatorsRes.data ?? []).map((sc: SavedCreator) => ({
        ...sc,
        status:   (sc.status   as CreatorStatus) ?? "saved",
        priority: (sc.priority as CreatorPriority) ?? "medium",
      })));
      setBusinessProfile(bizRes.data ?? null);

      // ── Campaign brief — isolated: table may not exist yet ───────────────
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: briefData } = await (supabase as any)
          .from("project_campaign_briefs")
          .select("*")
          .eq("project_id", projectId)
          .maybeSingle();
        setCampaignBrief(briefData ?? null);
      } catch {
        setCampaignBrief(null);
      }

      // ── Outreach drafts — isolated: table may not exist yet ──────────────
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: draftsData } = await (supabase as any)
          .from("project_outreach_drafts")
          .select("id,creator_profile_id,draft_type,subject,short_version,full_version,created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        setOutreachDrafts(draftsData ?? []);
      } catch {
        setOutreachDrafts([]);
      }
    } catch (err) {
      console.error("[loadAll]", err);
      toast.error("Couldn't load project. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProjectEdits() {
    if (!project || !editName.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("projects")
      .update({ name: editName.trim(), description: editDesc.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", project.id);
    if (error) { toast.error("Couldn't save."); return; }
    setProject((p) => p ? { ...p, name: editName.trim(), description: editDesc.trim() || null } : p);
    setEditing(false);
    toast.success("Saved.");
  }

  async function archiveProject() {
    if (!project) return;
    if (!confirm(`Archive "${project.name}"? You can restore it later.`)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("projects").update({ status: "archived" }).eq("id", project.id);
    toast.success("Project archived.");
    nav({ to: "/projects" as "/" });
  }

  async function removeSavedCreator(savedCreatorId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("project_saved_creators")
      .delete()
      .eq("id", savedCreatorId);
    if (error) { toast.error("Couldn't remove."); return; }
    setSavedCreators((prev) => prev.filter((sc) => sc.id !== savedCreatorId));
    toast.success("Creator removed.");
  }

  async function updateSavedCreator(id: string, patch: SavedCreatorPatch): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("project_saved_creators")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Couldn't save."); return false; }
    setSavedCreators((prev) =>
      prev.map((sc) =>
        sc.id === id
          ? { ...sc, ...patch, updated_at: new Date().toISOString() }
          : sc
      )
    );
    return true;
  }

  async function addToPipeline(creatorProfileId: string, creatorName: string): Promise<boolean> {
    if (savedCreators.some((sc) => sc.creator_profiles?.id === creatorProfileId)) {
      toast(`${creatorName} is already in the pipeline.`);
      return false;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("project_saved_creators")
        .insert({ project_id: projectId, creator_profile_id: creatorProfileId, saved_by: user!.id, status: "saved" })
        .select(
          "id,note,status,internal_note,why_fits,estimated_rate,priority,outreach_draft,created_at,updated_at," +
          "creator_profiles(id,display_name,username,niche,categories,platforms,profile_image_url,location,follower_count,bio,rate_range,accepts_paid,accepts_gifted,accepts_affiliate)"
        )
        .maybeSingle();
      if (error?.code === "23505") { toast(`${creatorName} is already saved.`); return false; }
      if (error) throw error;
      setSavedCreators((prev) => [{ ...data, status: data.status ?? "saved", priority: data.priority ?? "medium" }, ...prev]);
      toast.success(`${creatorName} added to pipeline.`);
      return true;
    } catch { toast.error("Couldn't add to pipeline."); return false; }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.canvas }}>
        <div className="h-5 w-5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  if (!project) return null;

  const TABS: { id: Tab; label: string; count: number | null }[] = [
    { id: "overview",  label: "Overview",       count: null },
    { id: "brief",     label: "Campaign Brief", count: null },
    { id: "creators",  label: "Creators",       count: savedCreators.length },
    { id: "outreach",  label: "Outreach",       count: outreachDrafts.length || null },
    { id: "sessions",  label: "AI Sessions",    count: chats.length },
    { id: "outputs",   label: "Saved Outputs",  count: savedOutputs.length },
  ];

  // creator_profile_id → number of saved outreach drafts (for pipeline badges)
  const outreachCountByCreator = new Map<string, number>();
  for (const d of outreachDrafts) {
    outreachCountByCreator.set(d.creator_profile_id, (outreachCountByCreator.get(d.creator_profile_id) ?? 0) + 1);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* Page top bar — breadcrumb + actions */}
      <div className="h-[52px] px-6 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/projects" className="text-[12px] transition-colors duration-150 shrink-0" style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            Projects
          </Link>
          <span className="text-[12px]" style={{ color: C.textMuted }}>/</span>
          <span className="text-[12px] font-medium truncate" style={{ color: C.textSecondary }}>{project?.name ?? "…"}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={archiveProject}
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 h-8 text-[12px] transition-colors duration-150"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <Trash2 className="h-3 w-3" /> Archive
          </button>
          <Link to="/chat" className="btn-primary inline-flex items-center gap-2 rounded-full px-4 h-8 text-[12px]">
            <Sparkles className="h-3.5 w-3.5" /> AI Strategist
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 py-12">

          {/* Project title */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
                <Folder className="h-3.5 w-3.5" style={{ color: C.chrome }} />
              </div>
              <span className="text-[9.5px] uppercase tracking-[0.32em] font-medium" style={{ color: C.textQuaternary }}>Project</span>
            </div>

            {editing ? (
              <div className="space-y-3">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveProjectEdits(); if (e.key === "Escape") setEditing(false); }}
                  className="w-full bg-transparent rounded-xl px-4 py-3 font-display text-3xl font-bold tracking-[-0.04em] outline-none"
                  style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description…"
                  rows={2}
                  className="w-full bg-transparent rounded-xl px-4 py-3 text-sm resize-none outline-none"
                  style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                />
                <div className="flex items-center gap-2">
                  <button onClick={saveProjectEdits} className="btn-primary inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[12.5px]">
                    <Check className="h-3 w-3" /> Save
                  </button>
                  <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[12.5px] transition-colors" style={{ background: C.raised, color: C.textTertiary }}>
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group flex items-start gap-3">
                <div className="flex-1">
                  <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-2" style={{ color: C.textPrimary }}>
                    {project.name}
                  </h1>
                  {project.description ? (
                    <p className="text-[1rem] font-light leading-relaxed" style={{ color: C.textTertiary }}>{project.description}</p>
                  ) : (
                    <button
                      onClick={() => { setEditName(project.name); setEditDesc(project.description ?? ""); setEditing(true); }}
                      className="text-[13px] transition-colors"
                      style={{ color: C.textMuted }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                    >
                      + Add description
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setEditName(project.name); setEditDesc(project.description ?? ""); setEditing(true); }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all"
                  style={{ color: C.textMuted }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.background = C.surface; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit overflow-x-auto" style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 whitespace-nowrap"
                style={{
                  background: tab === t.id ? C.raised : "transparent",
                  color: tab === t.id ? C.textPrimary : C.textTertiary,
                  boxShadow: tab === t.id ? "inset 0 1px 0 oklch(1 0 0 / 12%)" : "none",
                }}
              >
                {t.label}
                {t.count !== null && t.count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{
                      background: tab === t.id ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 5%)",
                      color: tab === t.id ? C.textSecondary : C.textMuted,
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "overview" && (
            <OverviewTab
              project={project}
              campaignBrief={campaignBrief}
              savedCreators={savedCreators}
              chatCount={chats.length}
              savedCount={savedOutputs.length}
              onNavigate={setTab}
            />
          )}
          {tab === "brief" && (
            <CampaignBriefTab
              brief={campaignBrief}
              projectId={projectId}
              userId={user!.id}
              onBriefSaved={setCampaignBrief}
              pipelineCreatorIds={new Set(savedCreators.map((sc) => sc.creator_profiles?.id).filter((id): id is string => Boolean(id)))}
              onAddToPipeline={addToPipeline}
            />
          )}
          {tab === "sessions"  && <SessionsTab chats={chats} projectId={projectId} />}
          {tab === "outputs"   && <SavedTab saved={savedOutputs} expandedId={expandedOutput} onExpand={setExpandedOutput} />}
          {tab === "outreach"  && (
            <OutreachTab
              drafts={outreachDrafts}
              savedCreators={savedCreators}
              onDelete={(id) => setOutreachDrafts((prev) => prev.filter((d) => d.id !== id))}
              onNavigateCreators={() => setTab("creators")}
            />
          )}
          {tab === "creators"  && (
            <CreatorsTab
              savedCreators={savedCreators}
              businessProfile={businessProfile}
              projectName={project.name}
              projectId={projectId}
              userId={user!.id}
              outreachCountByCreator={outreachCountByCreator}
              onRemove={removeSavedCreator}
              onUpdate={updateSavedCreator}
              onOutreachSaved={(draft) => setOutreachDrafts((prev) => [draft, ...prev])}
            />
          )}

        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview tab — updated with brief summary + pipeline breakdown
// ─────────────────────────────────────────────────────────────

function OverviewTab({ project, campaignBrief, savedCreators, chatCount, savedCount, onNavigate }: {
  project: Project;
  campaignBrief: CampaignBrief | null;
  savedCreators: SavedCreator[];
  chatCount: number;
  savedCount: number;
  onNavigate: (tab: Tab) => void;
}) {
  // Pipeline breakdown — count per status
  const pipelineCounts: Partial<Record<CreatorStatus, number>> = {};
  for (const sc of savedCreators) {
    pipelineCounts[sc.status] = (pipelineCounts[sc.status] ?? 0) + 1;
  }

  const hasBriefContent = campaignBrief && (
    campaignBrief.campaign_name ||
    campaignBrief.campaign_goal ||
    campaignBrief.platforms.length > 0 ||
    campaignBrief.creator_categories.length > 0
  );

  const stats = [
    { label: "AI Sessions",    value: chatCount,              icon: MessageSquare },
    { label: "Saved Outputs",  value: savedCount,             icon: Bookmark },
    { label: "Saved Creators", value: savedCreators.length,   icon: Users },
  ];

  return (
    <div className="space-y-6">

      {/* Campaign Brief Summary Card */}
      <div
        className="rounded-[18px] p-5"
        style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5" style={{ color: C.textQuaternary }} />
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.textQuaternary }}>Campaign Brief</span>
          </div>
          <button
            onClick={() => onNavigate("brief")}
            className="text-[11.5px] transition-colors"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            {hasBriefContent ? "Edit →" : "Set up →"}
          </button>
        </div>

        {hasBriefContent ? (
          <div className="space-y-4">
            {/* Key fields row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {campaignBrief!.campaign_goal && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] mb-1" style={{ color: C.textMuted }}>Goal</div>
                  <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>{campaignBrief!.campaign_goal}</div>
                </div>
              )}
              {campaignBrief!.budget_range && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] mb-1" style={{ color: C.textMuted }}>Budget</div>
                  <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>{campaignBrief!.budget_range}</div>
                </div>
              )}
              {campaignBrief!.campaign_deadline && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] mb-1" style={{ color: C.textMuted }}>Deadline</div>
                  <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>
                    {new Date(campaignBrief!.campaign_deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              )}
            </div>

            {/* Platforms */}
            {campaignBrief!.platforms.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] mb-2" style={{ color: C.textMuted }}>Platforms</div>
                <div className="flex flex-wrap gap-1.5">
                  {campaignBrief!.platforms.map((p) => (
                    <span key={p} className="text-[10px] font-medium rounded-full px-2.5 py-0.5"
                      style={{ background: "oklch(1 0 0 / 7%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {campaignBrief!.creator_categories.length > 0 && (
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] mb-2" style={{ color: C.textMuted }}>Creator Categories</div>
                <div className="flex flex-wrap gap-1.5">
                  {campaignBrief!.creator_categories.map((cat) => (
                    <span key={cat} className="text-[10px] uppercase tracking-[0.14em] rounded-full px-2.5 py-0.5"
                      style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}>
                      {BRIEF_CATEGORIES.find(b => b.value === cat)?.label ?? cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Find Matches CTA */}
            <button
              onClick={() => onNavigate("brief")}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-medium transition-all duration-150"
              style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: C.accent }} />
              Find Matching Creators
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-[13px] mb-3" style={{ color: C.textTertiary }}>
              Define your campaign to unlock creator matching.
            </p>
            <button
              onClick={() => onNavigate("brief")}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px]"
            >
              <FileText className="h-3.5 w-3.5" /> Create Campaign Brief
            </button>
          </div>
        )}
      </div>

      {/* Pipeline Breakdown */}
      {savedCreators.length > 0 && (
        <div
          className="rounded-[18px] p-5"
          style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-3.5 w-3.5" style={{ color: C.textQuaternary }} />
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.textQuaternary }}>Pipeline Breakdown</span>
          </div>
          <div className="space-y-2.5">
            {(Object.entries(STATUS_CONFIG) as [CreatorStatus, typeof STATUS_CONFIG[CreatorStatus]][]).map(([status, cfg]) => {
              const count = pipelineCounts[status] ?? 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="h-[6px] w-[6px] rounded-full shrink-0" style={{ background: cfg.color }} />
                  <span className="text-[12px] flex-1" style={{ color: C.textTertiary }}>{cfg.label}</span>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ color: count > 0 ? C.textSecondary : C.textMuted }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[18px] p-4" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
            <div className="flex items-center gap-1.5 mb-3">
              <Icon className="h-3 w-3" style={{ color: C.textQuaternary }} />
              <span className="text-[9.5px] uppercase tracking-[0.22em]" style={{ color: C.textTertiary }}>{label}</span>
            </div>
            <div className="font-display text-[1.75rem] font-semibold tracking-tight leading-none" style={{ color: C.textPrimary }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2" style={{ color: C.textMuted }}>
        <Clock className="h-3 w-3" />
        <span className="text-[11px]">
          Created {new Date(project.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Quick actions */}
      <div className="rounded-[18px] p-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="text-[10px] uppercase tracking-[0.28em] mb-4" style={{ color: C.textQuaternary }}>Quick actions</div>
        <div className="space-y-2">
          {[
            { label: "Start an AI strategy session",   sub: "Chat with MRKT and save outputs to this project", to: "/chat",          icon: Sparkles },
            { label: "Find creators for this project", sub: "Browse active creators on MRKT Connect",          to: "/find-creators", icon: Users },
          ].map(({ label, sub, to, icon: Icon }) => (
            <Link
              key={label}
              to={to as "/"}
              className="group flex items-center gap-4 rounded-xl p-3.5 transition-all duration-150"
              style={{ background: C.raised, border: `1px solid ${C.borderSubtle}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
            >
              <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.high, border: `1px solid ${C.borderNormal}` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: C.chrome }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>{label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: C.textTertiary }}>{sub}</div>
              </div>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.textSecondary }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Campaign Brief tab — full form, save/edit
// ─────────────────────────────────────────────────────────────

function CampaignBriefTab({ brief, projectId, userId, onBriefSaved, pipelineCreatorIds, onAddToPipeline }: {
  brief: CampaignBrief | null;
  projectId: string;
  userId: string;
  onBriefSaved: (b: CampaignBrief) => void;
  pipelineCreatorIds: Set<string>;
  onAddToPipeline: (creatorId: string, creatorName: string) => Promise<boolean>;
}) {
  const [form,         setForm]         = useState<BriefFormState>(() => briefToForm(brief));
  const [saving,       setSaving]       = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null);
  const [matchFilter,  setMatchFilter]  = useState<string>("all");
  const matchSectionRef = useRef<HTMLDivElement>(null);

  // Sync form when brief prop changes (e.g. first load after initial null)
  useEffect(() => {
    if (brief) setForm(briefToForm(brief));
  }, [brief?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof BriefFormState>(key: K, value: BriefFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleArray(key: "platforms" | "content_types" | "creator_categories", val: string) {
    setForm((f) => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  }

  function toggleSingle(key: "campaign_goal" | "preferred_creator_size", val: string) {
    setForm((f) => ({ ...f, [key]: f[key] === val ? "" : val }));
  }

  async function saveBriefSilent(): Promise<void> {
    const payload = {
      project_id: projectId, user_id: userId,
      campaign_name:          form.campaign_name.trim()     || null,
      campaign_goal:          form.campaign_goal             || null,
      target_audience:        form.target_audience.trim()   || null,
      audience_location:      form.audience_location.trim() || null,
      budget_range:           form.budget_range.trim()      || null,
      campaign_deadline:      form.campaign_deadline        || null,
      platforms:              form.platforms,
      content_types:          form.content_types,
      creator_categories:     form.creator_categories,
      preferred_creator_size: form.preferred_creator_size   || null,
      brand_notes:            form.brand_notes.trim()       || null,
      additional_notes:       form.additional_notes.trim()  || null,
      updated_at:             new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("project_campaign_briefs")
      .upsert(payload, { onConflict: "project_id" })
      .select().maybeSingle();
    if (!error && data) onBriefSaved(data as CampaignBrief);
  }

  async function findMatches() {
    setMatchLoading(true);
    setMatchResults(null);
    try {
      await saveBriefSilent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("creator_profiles")
        .select("id,display_name,username,niche,categories,platforms,preferred_content_types,location,audience_location,follower_count,profile_image_url,accepts_paid,accepts_gifted,accepts_affiliate")
        .eq("is_public", true)
        .eq("status", "active");
      if (error) throw error;
      const creators: MatchCreator[] = data ?? [];
      const results: MatchResult[] = creators
        .map((c) => ({ creator: c, ...scoreCreator(c, form) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);
      setMatchResults(results);
      setTimeout(() => matchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

      // Track matching appearances — batch insert, fire-and-forget
      if (results.length > 0) {
        const projectName = form.campaign_name?.trim() || "Untitled project";
        const events = results.map((r) => ({
          creator_profile_id: r.creator.id,
          event_type:         "appeared_in_matching",
          meta:               { project_id: projectId, project_name: projectName },
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("creator_analytics_events").insert(events).then(() => { /* fire-and-forget */ });
      }
    } catch { toast.error("Couldn't run matching. Try again."); }
    finally { setMatchLoading(false); }
  }

  async function saveBrief() {
    setSaving(true);
    try {
      const payload = {
        project_id:             projectId,
        user_id:                userId,
        campaign_name:          form.campaign_name.trim()      || null,
        campaign_goal:          form.campaign_goal             || null,
        target_audience:        form.target_audience.trim()    || null,
        audience_location:      form.audience_location.trim()  || null,
        budget_range:           form.budget_range.trim()       || null,
        campaign_deadline:      form.campaign_deadline         || null,
        platforms:              form.platforms,
        content_types:          form.content_types,
        creator_categories:     form.creator_categories,
        preferred_creator_size: form.preferred_creator_size    || null,
        brand_notes:            form.brand_notes.trim()        || null,
        additional_notes:       form.additional_notes.trim()   || null,
        updated_at:             new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("project_campaign_briefs")
        .upsert(payload, { onConflict: "project_id" })
        .select()
        .maybeSingle();

      if (error) throw error;
      onBriefSaved(data as CampaignBrief);
      toast.success("Campaign brief saved.");
    } catch {
      toast.error("Couldn't save brief. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: C.surface,
    border: `1px solid ${C.borderNormal}`,
    color: C.textSecondary,
    outline: "none",
    width: "100%",
    borderRadius: "0.75rem",
    padding: "0.75rem 1rem",
    fontSize: "0.8125rem",
  } as const;

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4" style={{ color: C.textQuaternary }} />
          <h2 className="font-display text-[1.375rem] font-bold tracking-[-0.03em]" style={{ color: C.textPrimary }}>
            Campaign Brief
          </h2>
        </div>
        <p className="text-[13px]" style={{ color: C.textTertiary }}>
          Define your campaign so MRKT can match the right creators.
        </p>
      </div>

      {/* ── Campaign Info ── */}
      <div className="rounded-[18px] p-5 space-y-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="text-[9.5px] uppercase tracking-[0.3em] font-medium" style={{ color: C.textQuaternary }}>Campaign Info</div>

        {/* Campaign Name */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Campaign Name</label>
          <input
            type="text"
            value={form.campaign_name}
            onChange={(e) => setField("campaign_name", e.target.value)}
            placeholder="e.g. Summer Collection 2026"
            onFocus={focusStyle}
            onBlur={blurStyle}
            style={inputStyle}
            className="placeholder:text-foreground/20"
          />
        </div>

        {/* Campaign Goal */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Campaign Goal</label>
          <div className="flex flex-wrap gap-1.5">
            {BRIEF_GOALS.map((g) => {
              const active = form.campaign_goal === g;
              return (
                <button
                  key={g}
                  onClick={() => toggleSingle("campaign_goal", g)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: active ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 3.5%)",
                    border: `1px solid ${active ? "oklch(0.84 0 0 / 45%)" : C.borderSubtle}`,
                    color: active ? C.textPrimary : C.textTertiary,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Targeting ── */}
      <div className="rounded-[18px] p-5 space-y-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="text-[9.5px] uppercase tracking-[0.3em] font-medium" style={{ color: C.textQuaternary }}>Targeting</div>

        {/* Target Audience */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Target Audience</label>
          <textarea
            value={form.target_audience}
            onChange={(e) => setField("target_audience", e.target.value)}
            placeholder="Describe your ideal customer (age, interests, lifestyle…)"
            rows={2}
            onFocus={focusStyle}
            onBlur={blurStyle}
            className="resize-none placeholder:text-foreground/20"
            style={{ ...inputStyle }}
          />
        </div>

        {/* Audience Location */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Audience Location</label>
          <input
            type="text"
            value={form.audience_location}
            onChange={(e) => setField("audience_location", e.target.value)}
            placeholder="e.g. Lebanon, UAE, Saudi Arabia"
            onFocus={focusStyle}
            onBlur={blurStyle}
            style={inputStyle}
            className="placeholder:text-foreground/20"
          />
        </div>

        {/* Budget + Deadline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.24em] flex items-center gap-1.5" style={{ color: C.textMuted }}>
              <DollarSign className="h-2.5 w-2.5" /> Budget Range
            </label>
            <input
              type="text"
              value={form.budget_range}
              onChange={(e) => setField("budget_range", e.target.value)}
              placeholder="e.g. $2,000 – $8,000"
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={inputStyle}
              className="placeholder:text-foreground/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.24em] flex items-center gap-1.5" style={{ color: C.textMuted }}>
              <Calendar className="h-2.5 w-2.5" /> Campaign Deadline
            </label>
            <input
              type="date"
              value={form.campaign_deadline}
              onChange={(e) => setField("campaign_deadline", e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              style={{ ...inputStyle, colorScheme: "dark" }}
            />
          </div>
        </div>
      </div>

      {/* ── Platforms & Content ── */}
      <div className="rounded-[18px] p-5 space-y-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="text-[9.5px] uppercase tracking-[0.3em] font-medium" style={{ color: C.textQuaternary }}>Platforms & Content</div>

        {/* Platforms */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Platforms</label>
          <div className="flex flex-wrap gap-1.5">
            {BRIEF_PLATFORMS.map((p) => {
              const active = form.platforms.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => toggleArray("platforms", p)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: active ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 3.5%)",
                    border: `1px solid ${active ? "oklch(0.84 0 0 / 45%)" : C.borderSubtle}`,
                    color: active ? C.textPrimary : C.textTertiary,
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Types */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Content Types</label>
          <div className="flex flex-wrap gap-1.5">
            {BRIEF_CONTENT_TYPES.map((ct) => {
              const active = form.content_types.includes(ct);
              return (
                <button
                  key={ct}
                  onClick={() => toggleArray("content_types", ct)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: active ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 3.5%)",
                    border: `1px solid ${active ? "oklch(0.84 0 0 / 45%)" : C.borderSubtle}`,
                    color: active ? C.textPrimary : C.textTertiary,
                  }}
                >
                  {ct}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Creator Preferences ── */}
      <div className="rounded-[18px] p-5 space-y-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="text-[9.5px] uppercase tracking-[0.3em] font-medium" style={{ color: C.textQuaternary }}>Creator Preferences</div>

        {/* Creator Categories */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Creator Categories</label>
          <div className="flex flex-wrap gap-1.5">
            {BRIEF_CATEGORIES.map(({ value, label }) => {
              const active = form.creator_categories.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleArray("creator_categories", value)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: active ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 3.5%)",
                    border: `1px solid ${active ? "oklch(0.84 0 0 / 45%)" : C.borderSubtle}`,
                    color: active ? C.textPrimary : C.textTertiary,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Creator Size */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Preferred Creator Size</label>
          <div className="flex flex-wrap gap-1.5">
            {BRIEF_SIZES.map((s) => {
              const active = form.preferred_creator_size === s;
              return (
                <button
                  key={s}
                  onClick={() => toggleSingle("preferred_creator_size", s)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: active ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 3.5%)",
                    border: `1px solid ${active ? "oklch(0.84 0 0 / 45%)" : C.borderSubtle}`,
                    color: active ? C.textPrimary : C.textTertiary,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <p className="text-[10.5px]" style={{ color: C.textMuted }}>
            Nano &lt;10K · Micro 10K–100K · Mid-tier 100K–500K · Macro 500K–1M · Celebrity 1M+
          </p>
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="rounded-[18px] p-5 space-y-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="text-[9.5px] uppercase tracking-[0.3em] font-medium" style={{ color: C.textQuaternary }}>Notes</div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Brand Notes</label>
          <textarea
            value={form.brand_notes}
            onChange={(e) => setField("brand_notes", e.target.value)}
            placeholder="Brand tone, visual requirements, dos and don'ts…"
            rows={3}
            onFocus={focusStyle}
            onBlur={blurStyle}
            className="resize-none placeholder:text-foreground/20"
            style={{ ...inputStyle }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Additional Notes</label>
          <textarea
            value={form.additional_notes}
            onChange={(e) => setField("additional_notes", e.target.value)}
            placeholder="Anything else the matching engine should know…"
            rows={2}
            onFocus={focusStyle}
            onBlur={blurStyle}
            className="resize-none placeholder:text-foreground/20"
            style={{ ...inputStyle }}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pb-2">
        <button
          onClick={saveBrief}
          disabled={saving}
          className="btn-primary flex items-center gap-2 rounded-full px-6 h-10 text-[13px] font-medium"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Saving…" : brief ? "Update Brief" : "Save Brief"}
        </button>
        <button
          onClick={findMatches}
          disabled={matchLoading}
          className="flex items-center gap-2 rounded-full px-6 h-10 text-[13px] font-medium transition-all duration-150"
          style={{
            background: "oklch(1 0 0 / 14%)",
            border: "1px solid oklch(1 0 0 / 35%)",
            color: "oklch(0.84 0 0)",
            opacity: matchLoading ? 0.7 : 1,
          }}
        >
          <Zap className="h-3.5 w-3.5" />
          {matchLoading ? "Matching…" : "Find Matches"}
        </button>
      </div>
      {brief && (
        <p className="text-[11px] pb-6" style={{ color: C.textMuted }}>
          Last saved {relativeTime(brief.updated_at)}
        </p>
      )}

      {/* ── Match Results ── */}
      {(matchLoading || matchResults !== null) && (
        <div ref={matchSectionRef} className="space-y-4 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: C.accent }} />
              <h3 className="font-display text-[1.125rem] font-bold tracking-[-0.03em]" style={{ color: C.textPrimary }}>
                {matchLoading ? "Finding matches…" : `${matchResults!.length} Creators Matched`}
              </h3>
            </div>
            {!matchLoading && matchResults && matchResults.length > 0 && (
              <div className="flex gap-1">
                {["all", "Best Fit", "Strong Fit", "Possible Fit"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setMatchFilter(f)}
                    className="px-2.5 py-1 rounded-full text-[10.5px] font-medium transition-all duration-150"
                    style={{
                      background: matchFilter === f ? "oklch(1 0 0 / 10%)" : "transparent",
                      border: `1px solid ${matchFilter === f ? "oklch(1 0 0 / 22%)" : "oklch(1 0 0 / 7%)"}`,
                      color: matchFilter === f ? C.textSecondary : C.textMuted,
                    }}
                  >
                    {f === "all" ? "All" : f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {matchLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-[18px] p-4 animate-pulse" style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl shrink-0" style={{ background: C.raised }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded-full w-1/3" style={{ background: C.raised }} />
                      <div className="h-3 rounded-full w-1/2" style={{ background: C.raised }} />
                    </div>
                    <div className="h-7 w-20 rounded-full" style={{ background: C.raised }} />
                  </div>
                </div>
              ))}
            </div>
          ) : matchResults && matchResults.length === 0 ? (
            <div className="py-12 text-center rounded-[18px]" style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
              <Users className="h-8 w-8 mx-auto mb-3" style={{ color: "oklch(1 0 0 / 18%)" }} />
              <p className="text-[0.9375rem] mb-1" style={{ color: C.textTertiary }}>No matches found.</p>
              <p className="text-[12.5px]" style={{ color: C.textMuted }}>
                Try selecting categories or platforms in the brief to improve results.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchResults!
                .filter((r) => matchFilter === "all" || r.label === matchFilter)
                .map((r) => (
                  <MatchResultCard
                    key={r.creator.id}
                    result={r}
                    inPipeline={pipelineCreatorIds.has(r.creator.id)}
                    onAddToPipeline={onAddToPipeline}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Match result card
// ─────────────────────────────────────────────────────────────

function MatchResultCard({ result, inPipeline, onAddToPipeline }: {
  result: MatchResult;
  inPipeline: boolean;
  onAddToPipeline: (creatorId: string, creatorName: string) => Promise<boolean>;
}) {
  const { creator, score, label, reason } = result;
  const [adding, setAdding] = useState(false);
  const labelCfg = MATCH_LABEL_CONFIG[label] ?? MATCH_LABEL_CONFIG["Low Fit"];

  async function handleAdd() {
    if (inPipeline || adding) return;
    setAdding(true);
    await onAddToPipeline(creator.id, creator.display_name);
    setAdding(false);
  }

  return (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="h-11 w-11 rounded-xl shrink-0 flex items-center justify-center text-[15px] font-bold"
            style={{
              background: creator.profile_image_url
                ? `url(${creator.profile_image_url}) center/cover`
                : avatarColor(creator.display_name),
              color: "oklch(0.1 0 0)",
              border: `1px solid ${C.borderNormal}`,
            }}
          >
            {!creator.profile_image_url && creator.display_name[0]}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>{creator.display_name}</span>
              <VerificationBadge />
              {creator.username && (
                <span className="text-[11px]" style={{ color: C.textQuaternary }}>@{creator.username}</span>
              )}
            </div>

            {/* Location + followers */}
            <div className="flex items-center gap-3 flex-wrap mb-2">
              {creator.location && (
                <div className="flex items-center gap-1 text-[11px]" style={{ color: C.textQuaternary }}>
                  <MapPin className="h-2.5 w-2.5 shrink-0" />{creator.location}
                </div>
              )}
              {creator.follower_count != null && creator.follower_count > 0 && (
                <div className="flex items-center gap-1 text-[11px]" style={{ color: C.textQuaternary }}>
                  <Users className="h-2.5 w-2.5 shrink-0" />{formatFollowers(creator.follower_count)}
                </div>
              )}
            </div>

            {/* Platforms */}
            {creator.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {creator.platforms.slice(0, 5).map((p) => (
                  <span key={p} className="text-[9px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: "oklch(1 0 0 / 7%)", color: platformColor(p), border: `1px solid ${C.borderSubtle}` }}>
                    {platformShort(p)}
                  </span>
                ))}
              </div>
            )}

            {/* Categories */}
            {creator.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {creator.categories.slice(0, 3).map((cat) => (
                  <span key={cat} className="text-[9px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
                    style={{ background: "oklch(1 0 0 / 5%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}>
                    {CATEGORY_LABELS[cat as CreatorCategory] ?? cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Score badge */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: labelCfg.bg, border: `1px solid ${labelCfg.border}`, color: labelCfg.color }}
            >
              <span className="text-[13px] font-extrabold tabular-nums">{score}</span>
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em]">{label}</span>
            </div>
          </div>
        </div>

        {/* Reason */}
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: C.textTertiary }}>
          {reason}
        </p>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
        <Link
          to={`/creators/${creator.id}` as "/"}
          className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] font-medium transition-all duration-150"
          style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
        >
          <ArrowUpRight className="h-3 w-3" /> View Profile
        </Link>

        <button
          onClick={handleAdd}
          disabled={inPipeline || adding}
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] font-medium transition-all duration-150"
          style={{
            background: inPipeline ? "oklch(1 0 0 / 12%)" : "oklch(1 0 0 / 6%)",
            border: `1px solid ${inPipeline ? "oklch(1 0 0 / 35%)" : C.borderNormal}`,
            color: inPipeline ? C.accent : C.textSecondary,
            opacity: adding ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!inPipeline) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
          onMouseLeave={(e) => { if (!inPipeline) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
        >
          {inPipeline ? (
            <><Check className="h-3 w-3" /> In Pipeline</>
          ) : adding ? (
            <>Adding…</>
          ) : (
            <><Users className="h-3 w-3" /> Add to Pipeline</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sessions tab
// ─────────────────────────────────────────────────────────────

function SessionsTab({ chats, projectId }: { chats: Chat[]; projectId: string }) {
  void projectId;
  if (chats.length === 0) {
    return (
      <div className="py-16 text-center">
        <MessageSquare className="h-8 w-8 mx-auto mb-4" style={{ color: "oklch(1 0 0 / 18%)" }} />
        <p className="text-[0.9375rem] mb-2" style={{ color: C.textTertiary }}>No AI sessions linked to this project yet.</p>
        <p className="text-[12.5px] mb-8" style={{ color: C.textMuted }}>Start a chat in the AI Strategist and save outputs to this project.</p>
        <Link to="/chat" className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm">
          <Sparkles className="h-3.5 w-3.5" /> Open AI Strategist
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {chats.map((c) => (
        <Link
          key={c.id}
          to="/chat"
          className="group flex items-center gap-4 rounded-[14px] px-4 py-3.5 transition-all duration-150"
          style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.raised; (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
        >
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.raised, border: `1px solid ${C.borderNormal}` }}>
            <MessageSquare className="h-3.5 w-3.5" style={{ color: C.textTertiary }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium truncate" style={{ color: C.textSecondary }}>{c.title}</div>
            <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: C.textMuted }}>
              <Clock className="h-2.5 w-2.5" /> {relativeTime(c.updated_at)}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: C.textSecondary }} />
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Saved outputs tab
// ─────────────────────────────────────────────────────────────

function SavedTab({ saved, expandedId, onExpand }: {
  saved: SavedOutput[];
  expandedId: string | null;
  onExpand: (id: string | null) => void;
}) {
  if (saved.length === 0) {
    return (
      <div className="py-16 text-center">
        <Bookmark className="h-8 w-8 mx-auto mb-4" style={{ color: "oklch(1 0 0 / 18%)" }} />
        <p className="text-[0.9375rem] mb-2" style={{ color: C.textTertiary }}>No saved outputs in this project yet.</p>
        <p className="text-[12.5px] mb-8" style={{ color: C.textMuted }}>After generating an AI response, use Save and choose this project.</p>
        <Link to="/chat" className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm">
          <Sparkles className="h-3.5 w-3.5" /> Open AI Strategist
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {saved.map((s) => {
        const isOpen = expandedId === s.id;
        return (
          <div
            key={s.id}
            className="rounded-[14px] overflow-hidden transition-all duration-200"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          >
            <button onClick={() => onExpand(isOpen ? null : s.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="h-[7px] w-[7px] rounded-full shrink-0" style={{ background: TYPE_COLORS[s.output_type] ?? TYPE_COLORS.other }} />
              <span className="flex-1 text-[13.5px] font-medium truncate" style={{ color: C.textSecondary }}>{s.title}</span>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[10.5px]" style={{ color: C.textMuted }}>{relativeTime(s.created_at)}</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200" style={{ color: C.textMuted, transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                <div className="pt-4 prose prose-invert prose-sm max-w-none leading-[1.8] prose-headings:font-display prose-headings:tracking-tight prose-p:text-foreground/80 prose-li:text-foreground/80 prose-code:text-foreground/80 prose-code:bg-white/5 prose-code:rounded prose-code:px-1">
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{s.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status picker
// ─────────────────────────────────────────────────────────────

function StatusPicker({ status, onSelect }: { status: CreatorStatus; onSelect: (s: CreatorStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status];

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-all duration-150"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
      >
        {cfg.label}
        <ChevronDown className="h-2.5 w-2.5" style={{ opacity: 0.7 }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-36 rounded-xl overflow-hidden z-30"
          style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowModal }}
        >
          {(Object.keys(STATUS_CONFIG) as CreatorStatus[]).map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => { onSelect(s); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-medium text-left transition-all duration-100"
                style={{
                  background: status === s ? "oklch(1 0 0 / 7%)" : "transparent",
                  color: c.color,
                }}
                onMouseEnter={(e) => { if (status !== s) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
                onMouseLeave={(e) => { if (status !== s) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span className="h-[6px] w-[6px] rounded-full shrink-0" style={{ background: c.color }} />
                {c.label}
                {status === s && <Check className="h-3 w-3 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Priority picker
// ─────────────────────────────────────────────────────────────

function PriorityPicker({ priority, onSelect }: { priority: CreatorPriority; onSelect: (p: CreatorPriority) => void }) {
  const CYCLE: CreatorPriority[] = ["high", "medium", "low"];
  const cfg = PRIORITY_CONFIG[priority];

  function next() {
    const idx = CYCLE.indexOf(priority);
    onSelect(CYCLE[(idx + 1) % CYCLE.length]);
  }

  return (
    <button
      onClick={next}
      className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150"
      style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: cfg.color }}
      title={`Priority: ${cfg.label} (click to change)`}
    >
      {cfg.label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Verification badge — shown for all active creators
// ─────────────────────────────────────────────────────────────

function VerificationBadge() {
  return (
    <span title="Verified Creator" className="inline-flex items-center shrink-0">
      <BadgeCheck className="h-3.5 w-3.5" style={{ color: C.chrome }} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Notes panel
// ─────────────────────────────────────────────────────────────

function NotesPanel({ sc, onUpdate }: {
  sc: SavedCreator;
  onUpdate: (id: string, patch: SavedCreatorPatch) => Promise<boolean>;
}) {
  const [open,         setOpen]         = useState(false);
  const [internalNote, setInternalNote] = useState(sc.internal_note ?? "");
  const [whyFits,      setWhyFits]      = useState(sc.why_fits ?? "");
  const [estRate,      setEstRate]      = useState(sc.estimated_rate ?? "");
  const [saving,       setSaving]       = useState(false);

  async function save() {
    setSaving(true);
    await onUpdate(sc.id, {
      internal_note:  internalNote.trim() || null,
      why_fits:       whyFits.trim()      || null,
      estimated_rate: estRate.trim()      || null,
    });
    setSaving(false);
  }

  const hasContent = sc.internal_note || sc.why_fits || sc.estimated_rate;

  return (
    <div style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors duration-150"
        style={{ color: C.textQuaternary }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textQuaternary; }}
      >
        <SlidersHorizontal className="h-3 w-3 shrink-0" />
        <span className="text-[10.5px] font-medium flex-1">
          {hasContent ? "Notes & details" : "Add notes & details"}
        </span>
        {hasContent && (
          <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ background: C.accent }} />
        )}
        <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-150" style={{ transform: open ? "rotate(180deg)" : "" }} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[9.5px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Internal Note</label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Private notes about this creator…"
              rows={2}
              className="w-full bg-transparent rounded-xl px-3 py-2.5 text-[12.5px] resize-none outline-none placeholder:text-foreground/20"
              style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
              onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderNormal; }}
              onBlur={(e)  => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderSubtle; }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9.5px] uppercase tracking-[0.24em]" style={{ color: C.textMuted }}>Why They Fit</label>
            <textarea
              value={whyFits}
              onChange={(e) => setWhyFits(e.target.value)}
              placeholder="Why this creator is a good fit for the campaign…"
              rows={2}
              className="w-full bg-transparent rounded-xl px-3 py-2.5 text-[12.5px] resize-none outline-none placeholder:text-foreground/20"
              style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
              onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderNormal; }}
              onBlur={(e)  => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderSubtle; }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9.5px] uppercase tracking-[0.24em] flex items-center gap-1.5" style={{ color: C.textMuted }}>
              <DollarSign className="h-2.5 w-2.5" /> Estimated Rate
            </label>
            <input
              type="text"
              value={estRate}
              onChange={(e) => setEstRate(e.target.value)}
              placeholder="e.g. $500–$1,500 per post"
              className="w-full bg-transparent rounded-xl px-3 py-2.5 text-[12.5px] outline-none placeholder:text-foreground/20"
              style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderNormal; }}
              onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderSubtle; }}
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] font-medium transition-all duration-150"
            style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}
          >
            <Check className="h-3 w-3" />
            {saving ? "Saving…" : "Save notes"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Outreach modal — typed drafts with subject / short / full
// ─────────────────────────────────────────────────────────────

const OUTREACH_TYPES = [
  { id: "instagram_dm",         label: "Instagram DM",           icon: "📱", hint: "casual, ≤150 words" },
  { id: "email",                label: "Email Outreach",         icon: "✉️", hint: "professional, 200-300 words" },
  { id: "campaign_invitation",  label: "Campaign Invitation",    icon: "🎯", hint: "campaign-focused" },
  { id: "product_launch",       label: "Product Launch",         icon: "🚀", hint: "launch excitement" },
  { id: "ugc_request",          label: "UGC Request",            icon: "🎬", hint: "content creation ask" },
  { id: "collaboration",        label: "Collaboration Proposal", icon: "🤝", hint: "full pitch" },
] as const;

type OutreachTypeId = typeof OUTREACH_TYPES[number]["id"];

function parseOutreach(text: string): { subject: string; short: string; full: string } {
  const subjectM = text.match(/SUBJECT:\s*([\s\S]*?)(?=\nSHORT:|$)/i);
  const shortM   = text.match(/SHORT:\s*([\s\S]*?)(?=\nFULL:|$)/i);
  const fullM    = text.match(/FULL:\s*([\s\S]*)/i);
  return {
    subject: subjectM?.[1]?.trim() ?? "",
    short:   shortM?.[1]?.trim()   ?? "",
    full:    fullM?.[1]?.trim()    ?? text.trim(),
  };
}

function OutreachModal({ sc, businessProfile, projectName, projectId, userId, onClose, onSaved, onDraftSaved }: {
  sc: SavedCreator;
  businessProfile: BusinessProfile | null;
  projectName: string;
  projectId: string;
  userId: string;
  onClose: () => void;
  onSaved: (draft: string) => void;
  onDraftSaved: (draft: OutreachDraft) => void;
}) {
  const cp = sc.creator_profiles!;
  const [draftType,  setDraftType]  = useState<OutreachTypeId>("instagram_dm");
  const [rawText,    setRawText]    = useState("");
  const [subject,    setSubject]    = useState("");
  const [shortVer,   setShortVer]   = useState("");
  const [fullVer,    setFullVer]    = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [copiedKey,  setCopiedKey]  = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    generate();
    return () => document.removeEventListener("keydown", onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-generate when type changes (but only after first mount)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    generate();
  }, [draftType]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildPrompt(type: OutreachTypeId): string {
    const biz = businessProfile;
    const typeLabel = OUTREACH_TYPES.find((t) => t.id === type)?.label ?? type;
    const typeSections: Record<OutreachTypeId, string> = {
      instagram_dm:        "Keep it conversational and natural — max 120 words for the full version. No formal salutation.",
      email:               "Write a professional email. Include a clear subject line. Full version 200–280 words.",
      campaign_invitation: "Focus on the campaign opportunity and why this creator is the perfect fit. Full version 180–250 words.",
      product_launch:      "Create excitement around a new product launch. Make the creator feel like an exclusive insider. Full version 180–250 words.",
      ugc_request:         "Request authentic user-generated content. Be clear about deliverables and creative freedom. Full version 150–200 words.",
      collaboration:       "Write a comprehensive collaboration pitch. Cover the vision, deliverables, compensation, and why this is a win-win. Full version 250–320 words.",
    };

    return `You are a creator partnership manager at MRKT. Generate a personalized outreach for a brand reaching out to a creator.

OUTREACH TYPE: ${typeLabel}
TONE GUIDANCE: ${typeSections[type]}

BRAND CONTEXT:
Company: ${biz?.company_name || "Our brand"}
Industry: ${biz?.industry || "consumer goods"}
Campaign goals: ${biz?.campaign_goals?.join(", ") || "brand awareness"}
Target audience: ${biz?.target_audience || "our customers"}
Project: ${projectName}

CREATOR CONTEXT:
Name: ${cp.display_name}${cp.niche ? `\nNiche: ${cp.niche}` : ""}
Platforms: ${cp.platforms.join(", ")}${cp.follower_count ? `\nFollowers: ${formatFollowers(cp.follower_count)}` : ""}${cp.location ? `\nLocation: ${cp.location}` : ""}${cp.bio ? `\nBio: ${cp.bio.slice(0, 200)}` : ""}
Categories: ${cp.categories.map((c) => CATEGORY_LABELS[c as CreatorCategory] ?? c).join(", ")}
Accepts: ${[cp.accepts_paid && "Paid", cp.accepts_gifted && "Gifted", cp.accepts_affiliate && "Affiliate"].filter(Boolean).join(", ") || "open to discussion"}${sc.why_fits ? `\nMatch reason: ${sc.why_fits}` : ""}${sc.estimated_rate ? `\nBudget range: ${sc.estimated_rate}` : ""}

Respond ONLY in this exact format — no extra commentary before or after:
SUBJECT: [subject line or DM opening line]
SHORT: [2–3 sentence casual hook version]
FULL: [complete outreach message]`;
  }

  async function generate() {
    setGenerating(true);
    setRawText(""); setSubject(""); setShortVer(""); setFullVer("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Session expired."); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt(draftType) }] }),
      });
      if (!res.ok || !res.body) { toast.error("Generation failed — try again."); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let text = ""; let done = false;
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
            if (delta) { text += delta; setRawText(text); }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      const parsed = parseOutreach(text);
      setSubject(parsed.subject);
      setShortVer(parsed.short);
      setFullVer(parsed.full);
    } catch { toast.error("Generation failed — try again."); }
    finally { setGenerating(false); }
  }

  async function saveDraft() {
    const fullText = fullVer.trim() || rawText.trim();
    if (!fullText) return;
    setSaving(true);
    try {
      // Save structured draft to project_outreach_drafts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newDraft, error: draftErr } = await (supabase as any)
        .from("project_outreach_drafts")
        .insert({
          project_id:         projectId,
          creator_profile_id: cp.id,
          user_id:            userId,
          draft_type:         draftType,
          subject:            subject.trim() || null,
          short_version:      shortVer.trim() || null,
          full_version:       fullText || null,
        })
        .select()
        .single();
      if (draftErr) throw draftErr;

      // Also update the legacy outreach_draft field for the "Draft saved" badge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("project_saved_creators")
        .update({ outreach_draft: fullText, updated_at: new Date().toISOString() })
        .eq("id", sc.id);

      onSaved(fullText);
      onDraftSaved(newDraft as OutreachDraft);
      toast.success("Outreach draft saved.");
      onClose();
    } catch { toast.error("Couldn't save draft."); }
    finally { setSaving(false); }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  const isReady = !generating && (fullVer || rawText);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-xl rounded-2xl overflow-hidden flex flex-col modal-in"
        style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowModal, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(1 0 0 / 14%)", border: "1px solid oklch(1 0 0 / 25%)" }}>
            <Mail className="h-3.5 w-3.5" style={{ color: C.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>Generate Outreach</div>
            <div className="text-[11px]" style={{ color: C.textTertiary }}>For {cp.display_name}</div>
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-full px-3 h-8 text-[11.5px] transition-all duration-150"
            style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
            onMouseEnter={(e) => { if (!generating) (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            <Wand2 className="h-3 w-3" />{generating ? "Generating…" : "Regenerate"}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Type selector */}
        <div className="px-5 py-3 shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="flex gap-2 min-w-max">
            {OUTREACH_TYPES.map((t) => {
              const active = draftType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setDraftType(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 whitespace-nowrap"
                  style={{
                    background: active ? "oklch(1 0 0 / 16%)" : "oklch(1 0 0 / 5%)",
                    border: `1px solid ${active ? "oklch(1 0 0 / 40%)" : C.borderSubtle}`,
                    color: active ? C.accent : C.textTertiary,
                  }}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">
          {generating && !rawText ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 28%)", animationDelay: `${delay}s` }} />
                ))}
              </div>
              <span className="text-[12px]" style={{ color: C.textMuted }}>Generating personalized outreach…</span>
            </div>
          ) : (
            <>
              {/* Subject */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase tracking-[0.28em] font-semibold" style={{ color: C.textQuaternary }}>Subject</span>
                  {subject && (
                    <button onClick={() => copyText(subject, "subject")} className="flex items-center gap-1 text-[10.5px] transition-colors"
                      style={{ color: copiedKey === "subject" ? C.accent : C.textMuted }}
                      onMouseEnter={(e) => { if (copiedKey !== "subject") (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                      onMouseLeave={(e) => { if (copiedKey !== "subject") (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                    >
                      <Copy className="h-3 w-3" />{copiedKey === "subject" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={generating ? "Generating…" : "Subject line will appear here"}
                  className="w-full bg-transparent rounded-xl px-4 py-2.5 text-[13px] outline-none placeholder:opacity-30"
                  style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                  onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderStrong; }}
                  onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderNormal; }}
                />
              </div>

              {/* Short version */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase tracking-[0.28em] font-semibold" style={{ color: C.textQuaternary }}>Short Version</span>
                  {shortVer && (
                    <button onClick={() => copyText(shortVer, "short")} className="flex items-center gap-1 text-[10.5px] transition-colors"
                      style={{ color: copiedKey === "short" ? C.accent : C.textMuted }}
                      onMouseEnter={(e) => { if (copiedKey !== "short") (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                      onMouseLeave={(e) => { if (copiedKey !== "short") (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                    >
                      <Copy className="h-3 w-3" />{copiedKey === "short" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <textarea
                  value={shortVer}
                  onChange={(e) => setShortVer(e.target.value)}
                  placeholder={generating ? "Generating…" : "Short version will appear here"}
                  rows={3}
                  className="w-full bg-transparent rounded-xl px-4 py-3 text-[13px] leading-relaxed resize-none outline-none placeholder:opacity-30"
                  style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                  onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderStrong; }}
                  onBlur={(e)  => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderNormal; }}
                />
              </div>

              {/* Full version */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase tracking-[0.28em] font-semibold" style={{ color: C.textQuaternary }}>Full Version</span>
                  {(fullVer || rawText) && (
                    <button onClick={() => copyText(fullVer || rawText, "full")} className="flex items-center gap-1 text-[10.5px] transition-colors"
                      style={{ color: copiedKey === "full" ? C.accent : C.textMuted }}
                      onMouseEnter={(e) => { if (copiedKey !== "full") (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                      onMouseLeave={(e) => { if (copiedKey !== "full") (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                    >
                      <Copy className="h-3 w-3" />{copiedKey === "full" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <textarea
                  value={fullVer || rawText}
                  onChange={(e) => { setFullVer(e.target.value); setRawText(e.target.value); }}
                  placeholder={generating ? "Generating…" : "Full version will appear here"}
                  rows={9}
                  className="w-full bg-transparent rounded-xl px-4 py-3 text-[13px] leading-relaxed resize-none outline-none placeholder:opacity-30"
                  style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                  onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderStrong; }}
                  onBlur={(e)  => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderNormal; }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
          <button
            onClick={saveDraft}
            disabled={saving || !isReady || generating}
            className="btn-primary flex-1 h-9 rounded-full text-[13px] flex items-center justify-center gap-2"
            style={{ opacity: isReady && !generating ? 1 : 0.4 }}
          >
            <Bookmark className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={onClose}
            className="px-4 h-9 rounded-full text-[13px] transition-colors"
            style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Creator shortlist card
// ─────────────────────────────────────────────────────────────

function CreatorShortlistCard({ sc, businessProfile, projectName, projectId, userId, outreachCount, onRemove, onUpdate, onOutreachSaved }: {
  sc: SavedCreator;
  businessProfile: BusinessProfile | null;
  projectName: string;
  projectId: string;
  userId: string;
  outreachCount: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: SavedCreatorPatch) => Promise<boolean>;
  onOutreachSaved: (draft: OutreachDraft) => void;
}) {
  const cp = sc.creator_profiles;
  if (!cp) return null;

  const [showOutreach, setShowOutreach] = useState(false);
  const nextAction = NEXT_ACTIONS[sc.status];

  async function handleStatusChange(s: CreatorStatus) {
    await onUpdate(sc.id, { status: s });
  }

  async function handlePriorityChange(p: CreatorPriority) {
    await onUpdate(sc.id, { priority: p });
  }

  async function handleConfirm() {
    await onUpdate(sc.id, { status: "confirmed" });
    toast.success(`${cp?.display_name ?? "Creator"} marked as confirmed.`);
  }

  function handleOutreachSaved(draft: string) {
    onUpdate(sc.id, { outreach_draft: draft });
  }

  return (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="h-11 w-11 rounded-xl shrink-0 flex items-center justify-center text-[14px] font-bold"
            style={{
              background: cp.profile_image_url ? `url(${cp.profile_image_url}) center/cover` : avatarColor(cp.display_name),
              color: "oklch(0.1 0 0)",
              border: `1px solid ${C.borderNormal}`,
            }}
          >
            {!cp.profile_image_url && cp.display_name[0]}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>{cp.display_name}</span>
              <VerificationBadge />
              {cp.username && (
                <span className="text-[11px]" style={{ color: C.textQuaternary }}>@{cp.username}</span>
              )}
              {cp.niche && (
                <span className="text-[9px] uppercase tracking-[0.18em] rounded-full px-2 py-0.5" style={{ background: "oklch(1 0 0 / 7%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}>
                  {cp.niche}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {cp.location && (
                <div className="flex items-center gap-1 text-[11px]" style={{ color: C.textQuaternary }}>
                  <MapPin className="h-2.5 w-2.5 shrink-0" />{cp.location}
                </div>
              )}
              {cp.follower_count != null && cp.follower_count > 0 && (
                <div className="flex items-center gap-1 text-[11px]" style={{ color: C.textQuaternary }}>
                  <Users className="h-2.5 w-2.5 shrink-0" />{formatFollowers(cp.follower_count)}
                </div>
              )}
            </div>

            {cp.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {cp.platforms.slice(0, 5).map((p) => (
                  <span key={p} className="text-[9px] font-bold rounded-full px-2 py-0.5" style={{ background: "oklch(1 0 0 / 7%)", color: platformColor(p), border: `1px solid ${C.borderSubtle}` }}>
                    {platformShort(p)}
                  </span>
                ))}
              </div>
            )}

            {cp.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {cp.categories.slice(0, 3).map((cat) => (
                  <span key={cat} className="text-[9px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5" style={{ background: "oklch(1 0 0 / 5%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}>
                    {CATEGORY_LABELS[cat as CreatorCategory] ?? cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right badges */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusPicker status={sc.status} onSelect={handleStatusChange} />
            <PriorityPicker priority={sc.priority} onSelect={handlePriorityChange} />
          </div>
        </div>
      </div>

      <NotesPanel sc={sc} onUpdate={onUpdate} />

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-wrap"
        style={{ borderTop: `1px solid ${C.borderSubtle}` }}
      >
        <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}>
          <Clock className="h-2.5 w-2.5" />
          Saved {relativeTime(sc.created_at)}
        </div>
        {sc.updated_at !== sc.created_at && (
          <span className="text-[10px]" style={{ color: C.textMuted }}>
            · Updated {relativeTime(sc.updated_at)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {(sc.outreach_draft || outreachCount > 0) && (
            <span
              className="flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
              style={{ background: "oklch(1 0 0 / 10%)", color: C.accent, border: "1px solid oklch(1 0 0 / 20%)" }}
            >
              <Send className="h-2.5 w-2.5" />
              {outreachCount > 0 ? `${outreachCount} draft${outreachCount > 1 ? "s" : ""}` : "Draft saved"}
            </span>
          )}

          {nextAction.type === "outreach" && (
            <button
              onClick={() => setShowOutreach(true)}
              className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] font-medium transition-all duration-150"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
            >
              <Wand2 className="h-3 w-3" />{nextAction.label}
            </button>
          )}
          {nextAction.type === "confirm" && (
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] font-medium transition-all duration-150"
              style={{ background: "oklch(1 0 0 / 12%)", border: "1px solid oklch(1 0 0 / 30%)", color: C.accent }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 18%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
            >
              <Check className="h-3 w-3" />{nextAction.label}
            </button>
          )}

          <Link
            to={`/creators/${cp.id}` as "/"}
            className="p-1.5 rounded-lg transition-all duration-150"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.background = C.raised; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = ""; }}
            title="View profile"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={() => onRemove(sc.id)}
            className="p-1.5 rounded-lg transition-all duration-150"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.52 0.15 24)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 8%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = ""; }}
            title="Remove from project"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showOutreach && (
        <OutreachModal
          sc={sc}
          businessProfile={businessProfile}
          projectName={projectName}
          projectId={projectId}
          userId={userId}
          onClose={() => setShowOutreach(false)}
          onSaved={handleOutreachSaved}
          onDraftSaved={onOutreachSaved}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter bar
// ─────────────────────────────────────────────────────────────

function FilterBar({ statusFilter, platformFilter, categoryFilter, priorityFilter, searchQuery, onChange, count, total }: {
  statusFilter: string;
  platformFilter: string;
  categoryFilter: string;
  priorityFilter: string;
  searchQuery: string;
  onChange: (key: string, value: string) => void;
  count: number;
  total: number;
}) {
  const statuses: Array<CreatorStatus | "all"> = ["all", "saved", "shortlisted", "contacted", "interested", "negotiating", "confirmed", "rejected"];

  return (
    <div className="space-y-3 mb-6">
      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3.5 h-10"
        style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}
      >
        <Search className="h-3.5 w-3.5 shrink-0" style={{ color: C.textQuaternary }} />
        <input
          value={searchQuery}
          onChange={(e) => onChange("search", e.target.value)}
          placeholder="Search by name or username…"
          className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-foreground/20"
          style={{ color: C.textPrimary }}
        />
        {searchQuery && (
          <button onClick={() => onChange("search", "")}>
            <X className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
          </button>
        )}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[9.5px] uppercase tracking-[0.28em] mr-1 shrink-0" style={{ color: C.textMuted }}>Status</span>
        {statuses.map((s) => {
          const cfg = s === "all" ? null : STATUS_CONFIG[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => onChange("status", s)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150"
              style={{
                background: active ? (cfg ? cfg.bg : "oklch(1 0 0 / 10%)") : "oklch(1 0 0 / 3%)",
                border: `1px solid ${active ? (cfg ? cfg.border : "oklch(1 0 0 / 22%)") : "oklch(1 0 0 / 8%)"}`,
                color: active ? (cfg ? cfg.color : "oklch(1 0 0 / 80%)") : "oklch(1 0 0 / 35%)",
              }}
            >
              {s === "all" ? "All" : cfg?.label}
            </button>
          );
        })}
      </div>

      {/* Priority + Platform + Category */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9.5px] uppercase tracking-[0.28em] mr-1 shrink-0" style={{ color: C.textMuted }}>Priority</span>
        {(["all", "high", "medium", "low"] as const).map((p) => {
          const cfg = p === "all" ? null : PRIORITY_CONFIG[p];
          const active = priorityFilter === p;
          return (
            <button
              key={p}
              onClick={() => onChange("priority", p)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150"
              style={{
                background: active ? "oklch(1 0 0 / 8%)" : "transparent",
                border: `1px solid ${active ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 7%)"}`,
                color: active ? (cfg ? cfg.color : "oklch(1 0 0 / 80%)") : "oklch(1 0 0 / 35%)",
              }}
            >
              {p === "all" ? "Any" : cfg?.label}
            </button>
          );
        })}

        <div className="h-4 w-px mx-1 shrink-0" style={{ background: C.borderSubtle }} />

        <select
          value={platformFilter}
          onChange={(e) => onChange("platform", e.target.value)}
          className="rounded-full text-[11px] outline-none px-3 py-1.5 cursor-pointer"
          style={{
            background: platformFilter !== "all" ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 3%)",
            border: `1px solid ${platformFilter !== "all" ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 8%)"}`,
            color: platformFilter !== "all" ? "oklch(1 0 0 / 80%)" : "oklch(1 0 0 / 35%)",
          }}
        >
          <option value="all" style={{ background: "#111" }}>All platforms</option>
          {["Instagram","TikTok","YouTube","Twitter/X","LinkedIn","Pinterest","Snapchat","Twitch","Facebook"].map((p) => (
            <option key={p} value={p} style={{ background: "#111" }}>{p}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => onChange("category", e.target.value)}
          className="rounded-full text-[11px] outline-none px-3 py-1.5 cursor-pointer"
          style={{
            background: categoryFilter !== "all" ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 3%)",
            border: `1px solid ${categoryFilter !== "all" ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 8%)"}`,
            color: categoryFilter !== "all" ? "oklch(1 0 0 / 80%)" : "oklch(1 0 0 / 35%)",
          }}
        >
          <option value="all" style={{ background: "#111" }}>All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value} style={{ background: "#111" }}>{label}</option>
          ))}
        </select>

        {count !== total && (
          <span className="ml-auto text-[11px]" style={{ color: C.textMuted }}>
            {count} of {total}
          </span>
        )}

        {(statusFilter !== "all" || platformFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" || searchQuery) && (
          <button
            onClick={() => { onChange("status","all"); onChange("platform","all"); onChange("category","all"); onChange("priority","all"); onChange("search",""); }}
            className="flex items-center gap-1 text-[10.5px] transition-colors"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <X className="h-2.5 w-2.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Outreach tab — list of saved outreach drafts
// ─────────────────────────────────────────────────────────────

const DRAFT_TYPE_LABELS: Record<string, string> = {
  instagram_dm:        "Instagram DM",
  email:               "Email",
  campaign_invitation: "Campaign Invitation",
  product_launch:      "Product Launch",
  ugc_request:         "UGC Request",
  collaboration:       "Collaboration",
};

function OutreachTab({ drafts, savedCreators, onDelete, onNavigateCreators }: {
  drafts: OutreachDraft[];
  savedCreators: SavedCreator[];
  onDelete: (id: string) => void;
  onNavigateCreators: () => void;
}) {
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const creatorMap = new Map<string, { display_name: string; profile_image_url: string | null }>();
  for (const sc of savedCreators) {
    if (sc.creator_profiles) {
      creatorMap.set(sc.creator_profiles.id, sc.creator_profiles);
    }
  }

  async function deleteDraft(id: string) {
    setDeleting(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("project_outreach_drafts").delete().eq("id", id);
      if (error) throw error;
      onDelete(id);
      toast.success("Draft deleted.");
    } catch { toast.error("Couldn't delete draft."); }
    finally { setDeleting(null); }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  }

  if (drafts.length === 0) {
    return (
      <div className="py-16 text-center">
        <Mail className="h-8 w-8 mx-auto mb-4" style={{ color: "oklch(1 0 0 / 18%)" }} />
        <p className="text-[0.9375rem] mb-2" style={{ color: C.textTertiary }}>No outreach drafts yet.</p>
        <p className="text-[12.5px] mb-8" style={{ color: C.textMuted }}>
          Go to the Creators tab and click "Generate Outreach" on a saved creator.
        </p>
        <button
          onClick={onNavigateCreators}
          className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm"
        >
          <Users className="h-3.5 w-3.5" /> Go to Creators
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold" style={{ color: C.textQuaternary }}>
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={onNavigateCreators}
          className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] transition-all duration-150"
          style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
        >
          <Wand2 className="h-3 w-3" /> Generate New
        </button>
      </div>

      {drafts.map((d) => {
        const creator = creatorMap.get(d.creator_profile_id);
        const isOpen  = expanded === d.id;
        const typeLabel = DRAFT_TYPE_LABELS[d.draft_type] ?? d.draft_type;
        const preview = d.subject || d.short_version?.slice(0, 80) || d.full_version?.slice(0, 80) || "";

        return (
          <div
            key={d.id}
            className="rounded-[18px] overflow-hidden transition-all duration-150"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          >
            {/* Row header — always visible */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : d.id)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-3"
            >
              {/* Creator avatar */}
              <div
                className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: creator?.profile_image_url
                    ? `url(${creator.profile_image_url}) center/cover`
                    : avatarColor(creator?.display_name ?? "?"),
                  color: "oklch(0.1 0 0)",
                  border: `1px solid ${C.borderNormal}`,
                }}
              >
                {!creator?.profile_image_url && (creator?.display_name[0] ?? "?")}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
                    {creator?.display_name ?? "Unknown creator"}
                  </span>
                  <span
                    className="text-[9.5px] uppercase tracking-[0.2em] rounded-full px-2 py-0.5 font-medium"
                    style={{ background: "oklch(1 0 0 / 12%)", color: C.accent, border: "1px solid oklch(1 0 0 / 25%)" }}
                  >
                    {typeLabel}
                  </span>
                </div>
                {preview && (
                  <p className="text-[11.5px] truncate" style={{ color: C.textTertiary }}>
                    {preview}{preview.length >= 80 ? "…" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10.5px]" style={{ color: C.textMuted }}>
                  {relativeTime(d.created_at)}
                </span>
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform duration-200"
                  style={{ color: C.textMuted, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                <div className="pt-3 space-y-3">
                  {d.subject && (
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase tracking-[0.26em] font-semibold" style={{ color: C.textQuaternary }}>Subject</div>
                      <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>{d.subject}</div>
                    </div>
                  )}
                  {d.short_version && (
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase tracking-[0.26em] font-semibold" style={{ color: C.textQuaternary }}>Short Version</div>
                      <div className="text-[12.5px] leading-relaxed" style={{ color: C.textTertiary }}>{d.short_version}</div>
                    </div>
                  )}
                  {d.full_version && (
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase tracking-[0.26em] font-semibold" style={{ color: C.textQuaternary }}>Full Version</div>
                      <div
                        className="text-[12.5px] leading-relaxed rounded-xl px-4 py-3"
                        style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary, whiteSpace: "pre-wrap" }}
                      >
                        {d.full_version}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {d.full_version && (
                    <button
                      onClick={() => copyText(d.full_version!, `full-${d.id}`)}
                      className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] transition-all duration-150"
                      style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: copiedKey === `full-${d.id}` ? C.accent : C.textSecondary }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedKey === `full-${d.id}` ? "Copied!" : "Copy Full"}
                    </button>
                  )}
                  {d.short_version && (
                    <button
                      onClick={() => copyText(d.short_version!, `short-${d.id}`)}
                      className="flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] transition-all duration-150"
                      style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderNormal}`, color: copiedKey === `short-${d.id}` ? C.accent : C.textSecondary }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
                    >
                      <Copy className="h-3 w-3" />
                      {copiedKey === `short-${d.id}` ? "Copied!" : "Copy Short"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteDraft(d.id)}
                    disabled={deleting === d.id}
                    className="ml-auto flex items-center gap-1.5 rounded-full px-3 h-7 text-[11.5px] transition-all duration-150"
                    style={{ color: C.textMuted }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.52 0.15 24)"; (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 8%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.background = ""; }}
                  >
                    <Trash2 className="h-3 w-3" />
                    {deleting === d.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Creators tab (pipeline)
// ─────────────────────────────────────────────────────────────

function CreatorsTab({ savedCreators, businessProfile, projectName, projectId, userId, outreachCountByCreator, onRemove, onUpdate, onOutreachSaved }: {
  savedCreators: SavedCreator[];
  businessProfile: BusinessProfile | null;
  projectName: string;
  projectId: string;
  userId: string;
  outreachCountByCreator: Map<string, number>;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: SavedCreatorPatch) => Promise<boolean>;
  onOutreachSaved: (draft: OutreachDraft) => void;
}) {
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");

  function handleFilterChange(key: string, value: string) {
    if (key === "status")   setStatusFilter(value);
    if (key === "platform") setPlatformFilter(value);
    if (key === "category") setCategoryFilter(value);
    if (key === "priority") setPriorityFilter(value);
    if (key === "search")   setSearchQuery(value);
  }

  const filtered = savedCreators.filter((sc) => {
    const cp = sc.creator_profiles;
    if (!cp) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cp.display_name.toLowerCase().includes(q);
      const matchUser = (cp.username ?? "").toLowerCase().includes(q);
      if (!matchName && !matchUser) return false;
    }
    if (statusFilter   !== "all" && sc.status   !== statusFilter)                              return false;
    if (priorityFilter !== "all" && sc.priority !== priorityFilter)                            return false;
    if (platformFilter !== "all" && !cp.platforms.includes(platformFilter))                    return false;
    if (categoryFilter !== "all" && !cp.categories.includes(categoryFilter as CreatorCategory)) return false;
    return true;
  });

  if (savedCreators.length === 0) {
    return (
      <div className="py-16 text-center">
        <Users className="h-8 w-8 mx-auto mb-4" style={{ color: "oklch(1 0 0 / 18%)" }} />
        <p className="text-[0.9375rem] mb-2" style={{ color: C.textTertiary }}>No creators saved to this project yet.</p>
        <p className="text-[12.5px] mb-8" style={{ color: C.textMuted }}>
          Browse Find Creators and click the bookmark icon to add creators to this pipeline.
        </p>
        <Link to="/find-creators" className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm">
          <Users className="h-3.5 w-3.5" /> Find Creators
        </Link>
      </div>
    );
  }

  return (
    <div>
      <FilterBar
        statusFilter={statusFilter}
        platformFilter={platformFilter}
        categoryFilter={categoryFilter}
        priorityFilter={priorityFilter}
        searchQuery={searchQuery}
        onChange={handleFilterChange}
        count={filtered.length}
        total={savedCreators.length}
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[0.9375rem] mb-2" style={{ color: C.textTertiary }}>No creators match these filters.</p>
          <button
            onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setCategoryFilter("all"); setPriorityFilter("all"); setSearchQuery(""); }}
            className="text-[12.5px] transition-colors"
            style={{ color: C.accent }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sc) => (
            <CreatorShortlistCard
              key={sc.id}
              sc={sc}
              businessProfile={businessProfile}
              projectName={projectName}
              projectId={projectId}
              userId={userId}
              outreachCount={outreachCountByCreator.get(sc.creator_profiles?.id ?? "") ?? 0}
              onRemove={onRemove}
              onUpdate={onUpdate}
              onOutreachSaved={onOutreachSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
