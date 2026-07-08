// ─────────────────────────────────────────────────────────────────────────────
// /creators/$creatorId — Premium creator media kit page
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { BetaPioneerBadge } from "@/components/app/VerifiedBadge";
import {
  ArrowUpRight, ExternalLink, Instagram, Youtube, MapPin,
  FileText, Users, Bookmark, BookmarkCheck, Sparkles,
  X, Folder, Globe, Languages, Copy, RefreshCw, Check,
  PenLine, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { toast } from "sonner";
import {
  type CreatorProfile,
  CATEGORY_LABELS,
  formatFollowers,
  platformShort,
  platformColor,
} from "@/types/creator";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/creators/$creatorId")({
  head: () => ({ meta: [{ title: "Creator Profile — MRKT Connect" }] }),
  component: CreatorProfilePage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

const AVATAR_COLORS = [
  "oklch(0.68 0.12 25)",  "oklch(0.66 0.09 250)",
  "oklch(0.64 0.11 160)", "oklch(0.70 0.10 300)",
  "oklch(0.72 0.09 60)",  "oklch(0.65 0.10 190)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Local types ──────────────────────────────────────────────────────────────

type Project    = { id: string; name: string };
type ViewerProf = { account_type: string | null; onboarding_path: string | null };
type BizCtx     = { company_name: string | null; industry: string | null; campaign_goals: string[] | null };

function isBusiness(vp: ViewerProf | null): boolean {
  if (!vp) return false;
  return vp.account_type === "brand" || vp.account_type === "business" ||
    vp.onboarding_path === "business_creator" || vp.onboarding_path === "business_marketing";
}

// ─────────────────────────────────────────────────────────────────────────────
// Save to Project Modal
// ─────────────────────────────────────────────────────────────────────────────

function SaveCreatorModal({ profile, onClose, onSaved }: {
  profile: CreatorProfile;
  onClose: () => void;
  onSaved?: (ids: Set<string>, names: string[]) => void;
}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState<Set<string>>(new Set());
  const [note,     setNote]     = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("projects").select("id,name")
        .eq("user_id", user.id).eq("status", "active")
        .order("updated_at", { ascending: false }).limit(10),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("project_saved_creators").select("project_id")
        .eq("creator_profile_id", profile.id).eq("saved_by", user.id),
    ]).then(([pRes, sRes]) => {
      setProjects(pRes.data ?? []);
      if (sRes.data) setSaved(new Set((sRes.data as { project_id: string }[]).map(r => r.project_id)));
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user, profile.id, onClose]);

  async function save(projectId: string) {
    if (!user || saved.has(projectId)) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("project_saved_creators").insert({
        project_id: projectId, creator_profile_id: profile.id,
        saved_by: user.id, note: note.trim() || null,
      });
      if (error && error.code === "23505") {
        const next = new Set([...saved, projectId]);
        setSaved(next);
        onSaved?.(next, projects.filter(p => next.has(p.id)).map(p => p.name));
        toast("Already saved to this project.");
      } else if (error) {
        throw error;
      } else {
        const next = new Set([...saved, projectId]);
        setSaved(next);
        onSaved?.(next, projects.filter(p => next.has(p.id)).map(p => p.name));
        toast.success(`${profile.display_name} saved to project.`);
      }
    } catch { toast.error("Couldn't save. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 space-y-4 modal-in"
        style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowModal }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: avatarBg(profile.display_name), color: "oklch(0.1 0 0)" }}>
            {profile.display_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
              Save {profile.display_name}
            </div>
            <div className="text-[11px]" style={{ color: C.textTertiary }}>Choose a project</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: C.textMuted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.textQuaternary }}>
            Internal note (optional)
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Why are you interested in this creator?"
            rows={2}
            className="w-full rounded-xl px-3 py-2.5 text-[12.5px] bg-transparent resize-none outline-none placeholder:text-foreground/20"
            style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }} />
        </div>

        {projects.length === 0 ? (
          <div className="py-3 text-center">
            <p className="text-[12.5px] mb-3" style={{ color: C.textTertiary }}>You need a project to save creators.</p>
            <Link to="/projects"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px]"
              onClick={onClose}>
              Create a Project <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {projects.map(p => {
              const isSaved = saved.has(p.id);
              return (
                <button key={p.id} onClick={() => save(p.id)} disabled={saving || isSaved}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150"
                  style={{
                    background: isSaved ? "oklch(0.72 0.14 152 / 12%)" : C.raised,
                    border: `1px solid ${isSaved ? "oklch(0.72 0.14 152 / 35%)" : C.borderSubtle}`,
                    cursor: isSaved ? "default" : "pointer",
                  }}
                  onMouseEnter={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                  onMouseLeave={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
                  {isSaved
                    ? <BookmarkCheck className="h-3.5 w-3.5 shrink-0" style={{ color: C.accent }} />
                    : <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: C.textMuted }} />}
                  <span className="text-[13px] font-medium truncate"
                    style={{ color: isSaved ? C.accent : C.textSecondary }}>{p.name}</span>
                  {isSaved && (
                    <span className="ml-auto text-[10px] font-semibold shrink-0" style={{ color: C.accent }}>Saved ✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Outreach Modal — streams an AI-generated draft via the chat edge function
// ─────────────────────────────────────────────────────────────────────────────

function OutreachModal({ profile, bizCtx, onClose }: {
  profile: CreatorProfile;
  bizCtx: BizCtx | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [draft,      setDraft]      = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [saving,     setSaving]     = useState(false);

  function buildPrompt(): string {
    const collab = [
      profile.accepts_paid      && "paid collaborations",
      profile.accepts_gifted    && "product gifting",
      profile.accepts_affiliate && "affiliate partnerships",
    ].filter(Boolean).join(", ") || "collaborations";

    const biz  = bizCtx?.company_name ? `I represent ${bizCtx.company_name}` : "I'm a brand";
    const ind  = bizCtx?.industry ? `, a ${bizCtx.industry} brand` : "";
    const goal = bizCtx?.campaign_goals?.length ? ` Our focus: ${bizCtx.campaign_goals.slice(0, 2).join(" & ")}.` : "";

    return `Write a short, professional outreach DM to ${profile.display_name}, a ${profile.niche || profile.categories[0] || "content"} creator with ${formatFollowers(profile.follower_count)} followers on ${profile.platforms.slice(0, 2).join(" & ") || "social media"}. They're open to ${collab}${profile.rate_range ? ` (rate: ${profile.rate_range})` : ""}. ${biz}${ind}.${goal} Write it as the brand reaching out. Make it genuine, specific, under 150 words. Output only the message.`;
  }

  useEffect(() => {
    generate();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    if (!user) return;
    setGenerating(true); setDraft("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Session expired. Sign in again."); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: buildPrompt() }] }),
      });

      if (!res.ok || !res.body) {
        let msg = "Couldn't generate outreach.";
        try { const b = await res.clone().json(); if (b?.error) msg = b.error; } catch { /* */ }
        toast.error(msg); return;
      }

      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let buf = ""; let text = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const chunk = line.slice(6).trim();
          if (chunk === "[DONE]") break;
          try {
            const delta = JSON.parse(chunk).choices?.[0]?.delta?.content;
            if (delta) { text += delta; setDraft(text); }
          } catch { /* */ }
        }
      }
    } catch { toast.error("Connection failed. Try again."); }
    finally { setGenerating(false); }
  }

  async function copy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard.");
  }

  async function saveDraft() {
    if (!user || !draft) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("saved_outputs").insert({
        user_id: user.id,
        title: `Outreach: ${profile.display_name}`,
        output_type: "campaign_brief",
        content: draft,
      });
      if (error) throw error;
      toast.success("Draft saved to your outputs.");
    } catch { toast.error("Couldn't save. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div
        className="relative w-full max-w-lg rounded-2xl flex flex-col modal-in"
        style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowModal, maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.72 0.14 152 / 14%)" }}>
            <Sparkles className="h-4 w-4" style={{ color: C.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>Outreach Draft</div>
            <div className="text-[11px]" style={{ color: C.textTertiary }}>For {profile.display_name}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: C.textMuted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Draft area */}
        <div className="flex-1 overflow-y-auto p-5">
          {generating && !draft ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-5 w-5 rounded-full border-2 animate-spin"
                style={{ borderColor: `${C.accent} transparent transparent transparent` }} />
              <p className="text-[12.5px]" style={{ color: C.textTertiary }}>Writing your outreach…</p>
            </div>
          ) : (
            <div className="rounded-xl p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap"
              style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary, minHeight: 120 }}>
              {draft || <span style={{ color: C.textMuted }}>No draft yet.</span>}
              {generating && <span className="animate-pulse ml-0.5">▌</span>}
            </div>
          )}
          <p className="mt-3 text-[10.5px]" style={{ color: C.textQuaternary }}>
            Review before sending. AI-generated — personalise to your brand voice.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 flex-wrap px-5 py-4 shrink-0"
          style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-2 rounded-full px-4 h-9 text-[12.5px] font-medium transition-all duration-150"
            style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: generating ? C.textMuted : C.textSecondary, cursor: generating ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            Regenerate
          </button>
          <button onClick={copy} disabled={!draft || generating}
            className="flex items-center gap-2 rounded-full px-4 h-9 text-[12.5px] font-medium transition-all duration-150"
            style={{
              background: copied ? "oklch(0.72 0.14 152 / 12%)" : C.raised,
              border: `1px solid ${copied ? "oklch(0.72 0.14 152 / 35%)" : C.borderSubtle}`,
              color: copied ? C.accent : C.textSecondary,
            }}
            onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
            onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={saveDraft} disabled={!draft || generating || saving}
            className="ml-auto flex items-center gap-2 rounded-full px-4 h-9 text-[12.5px] font-medium transition-all duration-150"
            style={{
              background: "oklch(0.72 0.14 152 / 10%)",
              border: "1px solid oklch(0.72 0.14 152 / 30%)",
              color: C.accent,
              opacity: (!draft || generating || saving) ? 0.5 : 1,
              cursor: (!draft || generating || saving) ? "not-allowed" : "pointer",
            }}>
            <PenLine className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SocialRow({ platform, handle, href, icon }: {
  platform: string; handle: string; href: string; icon: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between group">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "oklch(1 0 0 / 7%)" }}>
          <span style={{ color: C.textTertiary }}>{icon}</span>
        </div>
        <div>
          <div className="text-[12px] font-medium" style={{ color: C.textSecondary }}>@{handle}</div>
          <div className="text-[10.5px]" style={{ color: C.textQuaternary }}>{platform}</div>
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
        style={{ color: C.textTertiary }} />
    </a>
  );
}

function AudienceRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "oklch(1 0 0 / 7%)" }}>
        <span style={{ color: C.textTertiary }}>{icon}</span>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-0.5" style={{ color: C.textQuaternary }}>{label}</div>
        <div className="text-[12.5px] font-medium" style={{ color: C.textSecondary }}>{value}</div>
      </div>
    </div>
  );
}

function PortfolioLink({ url, index }: { url: string; index: number }) {
  let display = url;
  try {
    const u = new URL(url);
    display = u.hostname.replace(/^www\./, "") + u.pathname;
    if (display.length > 65) display = display.slice(0, 62) + "…";
  } catch { /* use raw */ }

  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-3.5 rounded-2xl p-4 transition-all duration-150 group"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
    >
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "oklch(1 0 0 / 7%)" }}>
        <span className="text-[11.5px] font-bold tabular-nums" style={{ color: C.textQuaternary }}>
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: C.textSecondary }}>
        {display}
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ color: C.textTertiary }} />
    </a>
  );
}

function EmptyCard({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center py-11 text-center gap-3"
      style={{ background: "oklch(1 0 0 / 1.5%)", border: `1px dashed ${C.borderSubtle}` }}>
      <div className="h-11 w-11 rounded-2xl flex items-center justify-center"
        style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
        <span style={{ color: C.textMuted }}>{icon}</span>
      </div>
      <div>
        <div className="text-[13px] font-medium mb-1" style={{ color: C.textTertiary }}>{title}</div>
        <div className="text-[11.5px]" style={{ color: C.textMuted }}>{subtitle}</div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  const bar = (w: string, h = "h-4") => (
    <div className={`${h} rounded-full animate-pulse`} style={{ background: "oklch(1 0 0 / 8%)", width: w }} />
  );
  return (
    <div className="mx-auto max-w-[1200px] px-6">
      <div style={{ height: 280, background: "oklch(0.10 0 0)" }} />
      <div className="-mt-24 pb-8">
        <div className="flex items-end gap-5 mb-6">
          <div className="h-24 w-24 rounded-[1.5rem] shrink-0 animate-pulse" style={{ background: "oklch(1 0 0 / 10%)" }} />
          <div className="pb-1 space-y-2.5">
            {bar("180px", "h-8")}
            {bar("120px")}
            <div className="flex gap-2">{bar("40px","h-6")}{bar("40px","h-6")}{bar("40px","h-6")}</div>
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-[340px_1fr] gap-8 pb-24">
        <div className="space-y-4">
          {[160, 130, 110].map(h => (
            <div key={h} className="rounded-2xl animate-pulse" style={{ height: h, background: "oklch(0.10 0 0)" }} />
          ))}
        </div>
        <div className="space-y-5">
          {[140, 100, 90].map(h => (
            <div key={h} className="rounded-2xl animate-pulse" style={{ height: h, background: "oklch(0.10 0 0)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

function CreatorProfilePage() {
  const { creatorId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();

  const [profile,       setProfile]       = useState<CreatorProfile | null>(null);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [viewerProf,    setViewerProf]    = useState<ViewerProf | null>(null);
  const [bizCtx,        setBizCtx]        = useState<BizCtx | null>(null);
  const [showSave,      setShowSave]      = useState(false);
  const [showOutreach,  setShowOutreach]  = useState(false);
  const [savedIds,      setSavedIds]      = useState<Set<string>>(new Set());
  const [savedNames,    setSavedNames]    = useState<string[]>([]);

  // Load creator profile
  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("creator_profiles").select("*").eq("id", creatorId).single();
      if (error || !data) {
        setNotFound(true);
      } else {
        const p = data as CreatorProfile;
        setProfile(p);
        document.title = `${p.display_name} — Creator Profile on MRKT`;
      }
      setPageLoading(false);
    })();
  }, [creatorId]);

  // Load viewer's account type
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("account_type,onboarding_path")
      .eq("id", user.id).single()
      .then(({ data }) => setViewerProf((data as ViewerProf) ?? null));
  }, [user]);

  // Load business context for outreach
  useEffect(() => {
    if (!user || !isBusiness(viewerProf)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from("business_profiles")
      .select("company_name,industry,campaign_goals")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }: { data: BizCtx | null }) => setBizCtx(data));
  }, [user, viewerProf]);

  // Load saved status
  useEffect(() => {
    if (!user || !profile || user.id === profile.user_id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from("project_saved_creators")
      .select("project_id, projects(name)")
      .eq("creator_profile_id", profile.id)
      .eq("saved_by", user.id)
      .then(({ data }: { data: { project_id: string; projects: { name: string } | null }[] | null }) => {
        if (data) {
          setSavedIds(new Set(data.map(r => r.project_id)));
          setSavedNames(data.map(r => r.projects?.name).filter(Boolean) as string[]);
        }
      });
  }, [user, profile]);

  // Auto-open OutreachModal when arriving from Globe "Invite to Campaign"
  useEffect(() => {
    if (!profile || !isBusiness(viewerProf)) return;
    const inviteId = localStorage.getItem("mrkt_invite_creator");
    if (inviteId === profile.id) {
      localStorage.removeItem("mrkt_invite_creator");
      setTimeout(() => setShowOutreach(true), 600);
    }
  }, [profile, viewerProf]);

  // Track profile view — fires once per page load when a different authenticated user views this profile
  useEffect(() => {
    if (!user || !profile || user.id === profile.user_id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase
      .from("creator_analytics_events")
      .insert({ creator_profile_id: profile.id, event_type: "profile_viewed" })
      .then(() => { /* fire-and-forget */ });
  }, [user, profile]);

  const isOwner          = !!user && !!profile && user.id === profile.user_id;
  const showBizActions   = !!user && !isOwner && isBusiness(viewerProf);
  const isSaved          = savedIds.size > 0;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (pageLoading || authLoading) {
    return (
      <div className="min-h-screen" style={{ background: C.canvas }}>
        <Nav />
        <ProfileSkeleton />
        <Footer />
      </div>
    );
  }

  // ── Not found / private ──────────────────────────────────────────────────────
  if (notFound || !profile) {
    return (
      <div className="min-h-screen text-foreground" style={{ background: C.canvas }}>
        <Nav />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
            <Users className="h-7 w-7" style={{ color: C.textMuted }} />
          </div>
          <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4"
            style={{ color: C.textQuaternary }}>MRKT Connect</div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-3"
            style={{ color: C.textPrimary }}>Creator unavailable</h2>
          <p className="text-[14px] leading-relaxed max-w-sm mb-8 font-light"
            style={{ color: C.textTertiary }}>
            This profile doesn't exist, is set to private, or hasn't been published yet.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link to="/connect"
              className="inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm font-medium transition-all duration-150"
              style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}>
              Explore MRKT Connect
            </Link>
            {user && (
              <Link to={"/find-creators" as "/"}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm font-medium">
                Find Creators <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const featuredLinks = [
    profile.featured_link_1, profile.featured_link_2, profile.featured_link_3,
  ].filter(Boolean) as string[];

  const hasAudience = !!(
    profile.audience_location || profile.audience_age_range ||
    profile.audience_gender_split || profile.primary_language
  );

  const hasSocials = !!(profile.instagram_handle || profile.tiktok_handle || profile.youtube_handle);

  const hasCollabPrefs = profile.accepts_paid || profile.accepts_gifted ||
    profile.accepts_affiliate || !!profile.rate_range;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: C.canvas, color: C.textPrimary }}>
      <Nav />

      {/* ── Hero banner ─────────────────────────────────────────────────────── */}
      <div className="relative w-full" style={{ height: 280 }}>
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, oklch(0.14 0 0) 0%, oklch(0.06 0 0) 100%)" }} />
        {/* Subtle green glow — MRKT accent */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 55% at 50% -10%, oklch(0.55 0.10 152 / 18%) 0%, transparent 65%)" }} />
        {/* Fade to page background */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 45%, oklch(0 0 0) 100%)" }} />
      </div>

      <div className="mx-auto max-w-[1200px] px-6">

        {/* ── Identity overlap ─────────────────────────────────────────────── */}
        <div className="relative -mt-24 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">

            {/* Avatar + name */}
            <div className="flex items-end gap-5">
              {/* Avatar */}
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt={profile.display_name}
                  className="h-24 w-24 rounded-[1.5rem] shrink-0 object-cover img-fade"
                  style={{
                    border: "3px solid oklch(0 0 0)",
                    boxShadow: "0 12px 40px oklch(0 0 0 / 60%), 0 0 0 1px oklch(1 0 0 / 8%)",
                  }}
                  onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }} />
              ) : (
                <div className="h-24 w-24 rounded-[1.5rem] shrink-0 flex items-center justify-center text-3xl font-bold"
                  style={{
                    background: avatarBg(profile.display_name),
                    color: "oklch(0.065 0 0)",
                    border: "3px solid oklch(0 0 0)",
                    boxShadow: "0 12px 40px oklch(0 0 0 / 60%), 0 0 0 1px oklch(1 0 0 / 8%)",
                  }}>
                  {profile.display_name[0].toUpperCase()}
                </div>
              )}

              {/* Identity text */}
              <div className="pb-1 min-w-0">
                {/* Name + active badge */}
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                  <h1 className="font-display text-[1.85rem] font-bold tracking-[-0.035em]"
                    style={{ color: C.textPrimary, lineHeight: 1.1 }}>
                    {profile.display_name}
                  </h1>
                  {profile.is_beta_pioneer && (
                    <span
                      className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] rounded-full px-2.5 py-1 font-semibold"
                      style={{ background: "oklch(0.78 0.14 76 / 14%)", color: "oklch(0.78 0.14 76)", border: "1px solid oklch(0.78 0.14 76 / 28%)" }}
                      title="Beta Pioneer — one of MRKT's first creators"
                    >
                      <BetaPioneerBadge size="xs" />
                      Beta Pioneer
                    </span>
                  )}
                  {profile.status === "active" && (
                    <span className="text-[9px] uppercase tracking-[0.22em] rounded-full px-2.5 py-1 font-semibold"
                      style={{ background: "oklch(0.72 0.14 152 / 14%)", color: C.accent, border: "1px solid oklch(0.72 0.14 152 / 28%)" }}>
                      Active
                    </span>
                  )}
                </div>
                {/* Username + location + niche */}
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  {profile.username && (
                    <span className="text-[13px] font-medium" style={{ color: C.textTertiary }}>
                      @{profile.username}
                    </span>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-1.5 text-[13px]" style={{ color: C.textQuaternary }}>
                      <MapPin className="h-3.5 w-3.5 shrink-0" />{profile.location}
                    </div>
                  )}
                  {profile.niche && (
                    <span className="text-[10px] uppercase tracking-[0.2em] rounded-full px-2.5 py-1 font-medium"
                      style={{ background: "oklch(1 0 0 / 7%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}>
                      {profile.niche}
                    </span>
                  )}
                </div>
                {/* Platforms + followers */}
                <div className="flex items-center gap-2 flex-wrap">
                  {profile.platforms.slice(0, 6).map(p => (
                    <span key={p} className="text-[9.5px] font-bold rounded-full px-2.5 py-1"
                      style={{ background: "oklch(1 0 0 / 7%)", color: platformColor(p), border: `1px solid ${C.borderSubtle}` }}>
                      {platformShort(p)}
                    </span>
                  ))}
                  {profile.follower_count != null && profile.follower_count > 0 && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <Users className="h-3.5 w-3.5" style={{ color: C.textQuaternary }} />
                      <span className="text-[13px] font-semibold" style={{ color: C.textSecondary }}>
                        {formatFollowers(profile.follower_count)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-2.5 pb-1 flex-wrap">
              <Link to="/connect"
                className="inline-flex items-center gap-2 rounded-full px-4 h-9 text-[12.5px] font-medium transition-all duration-150"
                style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
                ← Back
              </Link>

              {/* Owner */}
              {isOwner && (
                <Link to={"/creator-onboarding" as "/"}
                  className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-medium transition-all duration-150"
                  style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}>
                  <PenLine className="h-3.5 w-3.5" /> Edit Profile
                </Link>
              )}

              {/* Business: Generate Outreach */}
              {showBizActions && (
                <button onClick={() => setShowOutreach(true)}
                  className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-medium transition-all duration-150"
                  style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}>
                  <Sparkles className="h-3.5 w-3.5" /> Generate Outreach
                </button>
              )}

              {/* Business: Save to Project */}
              {showBizActions && (
                <button onClick={() => setShowSave(true)}
                  className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-medium transition-all duration-150"
                  style={{
                    background: isSaved ? "oklch(0.72 0.14 152 / 12%)" : "oklch(1 0 0 / 8%)",
                    border: `1px solid ${isSaved ? "oklch(0.72 0.14 152 / 35%)" : C.borderNormal}`,
                    color: isSaved ? C.accent : C.textPrimary,
                  }}
                  onMouseEnter={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
                  onMouseLeave={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}>
                  {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {isSaved ? "Saved" : "Save to Project"}
                </button>
              )}

              {/* Unauthenticated */}
              {!user && !authLoading && (
                <Link to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-9 text-[12.5px] font-medium">
                  Sign in to Connect <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-5 max-w-2xl text-[14px] font-light leading-[1.8]" style={{ color: C.textSecondary }}>
              {profile.bio}
            </p>
          )}

          {/* Category chips */}
          {profile.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.categories.map(c => (
                <span key={c} className="text-[11px] rounded-full px-3.5 py-1.5 font-medium"
                  style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}>
                  {CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c}
                </span>
              ))}
            </div>
          )}

          {/* Saved project names */}
          {isSaved && savedNames.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[11px]" style={{ color: C.textMuted }}>Saved to:</span>
              {savedNames.map((n, i) => (
                <span key={i} className="text-[11px] rounded-full px-2.5 py-1"
                  style={{ background: "oklch(0.72 0.14 152 / 10%)", color: C.accent, border: "1px solid oklch(0.72 0.14 152 / 22%)" }}>
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mb-8" style={{ height: 1, background: C.borderSubtle }} />

        {/* ── Two-column layout ───────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[340px_1fr] gap-8 pb-24">

          {/* ─── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Reach */}
            <div className="rounded-2xl p-5"
              style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
              <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                style={{ color: C.textQuaternary }}>Reach</div>

              {profile.follower_count != null && profile.follower_count > 0 && (
                <div className="mb-4 pb-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <div className="font-display text-4xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                    {formatFollowers(profile.follower_count)}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: C.textQuaternary }}>Total followers</div>
                </div>
              )}

              {hasSocials ? (
                <div className="space-y-3.5">
                  {profile.instagram_handle && (
                    <SocialRow platform="Instagram" handle={profile.instagram_handle}
                      href={`https://instagram.com/${profile.instagram_handle}`}
                      icon={<Instagram className="h-3.5 w-3.5" />} />
                  )}
                  {profile.tiktok_handle && (
                    <SocialRow platform="TikTok" handle={profile.tiktok_handle}
                      href={`https://tiktok.com/@${profile.tiktok_handle}`}
                      icon={<span className="text-[11px] font-bold leading-none" style={{ fontFamily: "monospace" }}>TK</span>} />
                  )}
                  {profile.youtube_handle && (
                    <SocialRow platform="YouTube" handle={profile.youtube_handle}
                      href={`https://youtube.com/@${profile.youtube_handle}`}
                      icon={<Youtube className="h-3.5 w-3.5" />} />
                  )}
                </div>
              ) : (
                <p className="text-[12px]" style={{ color: C.textMuted }}>No social handles listed.</p>
              )}

              {profile.platforms.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {profile.platforms.map(p => (
                    <span key={p} className="text-[9.5px] font-bold rounded-full px-2.5 py-1"
                      style={{ background: "oklch(1 0 0 / 7%)", color: platformColor(p), border: `1px solid ${C.borderSubtle}` }}>
                      {platformShort(p)}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 text-[10px] leading-relaxed"
                style={{ color: C.textMuted, borderTop: `1px solid ${C.borderSubtle}` }}>
                Follower counts are self-reported. Click links to verify.
              </div>
            </div>

            {/* Audience */}
            <div className="rounded-2xl p-5"
              style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
              <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                style={{ color: C.textQuaternary }}>Audience</div>
              {hasAudience ? (
                <div className="space-y-3.5">
                  {profile.audience_location && (
                    <AudienceRow icon={<Globe className="h-3.5 w-3.5" />} label="Location" value={profile.audience_location} />
                  )}
                  {profile.audience_age_range && (
                    <AudienceRow icon={<Users className="h-3.5 w-3.5" />} label="Age Range" value={profile.audience_age_range} />
                  )}
                  {profile.audience_gender_split && (
                    <AudienceRow
                      icon={<span className="text-[11px] font-bold" style={{ fontFamily: "monospace", lineHeight: 1 }}>%</span>}
                      label="Gender Split" value={profile.audience_gender_split} />
                  )}
                  {profile.primary_language && (
                    <AudienceRow icon={<Languages className="h-3.5 w-3.5" />} label="Language" value={profile.primary_language} />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 text-center gap-2">
                  <Users className="h-5 w-5" style={{ color: C.textMuted }} />
                  <p className="text-[12px]" style={{ color: C.textMuted }}>
                    Audience data not yet provided.
                  </p>
                </div>
              )}
            </div>

            {/* Collaboration */}
            {hasCollabPrefs && (
              <div className="rounded-2xl p-5"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                  style={{ color: C.textQuaternary }}>Collaboration</div>
                <div className="space-y-2.5">
                  {profile.accepts_paid && (
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "oklch(0.72 0.14 152)" }} />
                      <span className="text-[12.5px]" style={{ color: C.textSecondary }}>Paid collaborations</span>
                    </div>
                  )}
                  {profile.accepts_gifted && (
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "oklch(0.65 0.14 250)" }} />
                      <span className="text-[12.5px]" style={{ color: C.textSecondary }}>Product gifting / seeding</span>
                    </div>
                  )}
                  {profile.accepts_affiliate && (
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "oklch(0.78 0.12 60)" }} />
                      <span className="text-[12.5px]" style={{ color: C.textSecondary }}>Affiliate partnerships</span>
                    </div>
                  )}
                  {profile.rate_range && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>
                        Rate range
                      </div>
                      <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>
                        {profile.rate_range}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Media Kit */}
            {profile.media_kit_url && (
              <a href={profile.media_kit_url} target="_blank" rel="noreferrer"
                className="flex items-center justify-between rounded-2xl p-5 transition-all duration-150 group"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(1 0 0 / 7%)" }}>
                    <FileText className="h-4 w-4" style={{ color: C.textTertiary }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: C.textPrimary }}>Media Kit</div>
                    <div className="text-[11px] mt-0.5" style={{ color: C.textTertiary }}>PDF · Download</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ color: C.textQuaternary }} />
              </a>
            )}

            {/* Business Actions card */}
            {showBizActions && (
              <div className="rounded-2xl p-5"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                  style={{ color: C.textQuaternary }}>Your Actions</div>

                {isSaved && savedNames.length > 0 && (
                  <div className="mb-4 pb-4 space-y-1.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                    <div className="text-[10.5px]" style={{ color: C.textMuted }}>Saved in:</div>
                    {savedNames.map((n, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <BookmarkCheck className="h-3 w-3 shrink-0" style={{ color: C.accent }} />
                        <span className="text-[12px]" style={{ color: C.accent }}>{n}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <button onClick={() => setShowSave(true)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150"
                    style={{
                      background: isSaved ? "oklch(0.72 0.14 152 / 10%)" : C.raised,
                      border: `1px solid ${isSaved ? "oklch(0.72 0.14 152 / 30%)" : C.borderSubtle}`,
                    }}
                    onMouseEnter={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                    onMouseLeave={e => { if (!isSaved) (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
                    {isSaved
                      ? <BookmarkCheck className="h-4 w-4 shrink-0" style={{ color: C.accent }} />
                      : <Bookmark className="h-4 w-4 shrink-0" style={{ color: C.textTertiary }} />}
                    <span className="text-[12.5px] font-medium"
                      style={{ color: isSaved ? C.accent : C.textSecondary }}>
                      {isSaved ? "Saved to Project" : "Save to Project"}
                    </span>
                    {isSaved && (
                      <span className="ml-auto text-[10px] rounded-full px-2 py-0.5 font-semibold"
                        style={{ background: "oklch(0.72 0.14 152 / 15%)", color: C.accent }}>
                        {savedIds.size}
                      </span>
                    )}
                  </button>

                  <button onClick={() => setShowOutreach(true)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150"
                    style={{ background: C.raised, border: `1px solid ${C.borderSubtle}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
                    <Sparkles className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.10 290)" }} />
                    <span className="text-[12.5px] font-medium" style={{ color: C.textSecondary }}>
                      Generate Outreach
                    </span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: C.textMuted }} />
                  </button>
                </div>
              </div>
            )}

            {/* Sign-in prompt for guests */}
            {!user && !authLoading && (
              <div className="rounded-2xl p-5 text-center"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-3"
                  style={{ color: C.textQuaternary }}>Connect</div>
                <p className="text-[12.5px] mb-4 font-light" style={{ color: C.textTertiary }}>
                  Sign in to save this creator to a project and generate personalised outreach.
                </p>
                <Link to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] font-medium w-full justify-center">
                  Sign in to MRKT <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* ─── RIGHT MAIN ──────────────────────────────────────────────────── */}
          <div className="space-y-7">

            {/* Featured Work */}
            <section>
              <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                style={{ color: C.textQuaternary }}>Featured Work</div>
              {featuredLinks.length > 0 ? (
                <div className="space-y-2.5">
                  {featuredLinks.map((url, i) => <PortfolioLink key={i} url={url} index={i} />)}
                </div>
              ) : profile.creator_stage === "beginner" ? (
                /* Emerging creator — intentional, not broken */
                <div className="rounded-2xl px-5 py-5 flex items-center gap-4"
                  style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(1 0 0 / 6%)" }}>
                    <span className="text-[15px]">✦</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>
                      Emerging Creator
                    </div>
                    <div className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: C.textTertiary }}>
                      Building their portfolio — follow their journey on MRKT.
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyCard
                  icon={<ExternalLink className="h-5 w-5" />}
                  title="No portfolio links yet"
                  subtitle="This creator hasn't added featured work to their profile."
                />
              )}
            </section>

            {/* Previous Collaborations */}
            {profile.creator_stage !== "beginner" && (
            <section>
              <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                style={{ color: C.textQuaternary }}>Previous Collaborations</div>
              {profile.previous_collaborations ? (
                <div className="rounded-2xl p-5"
                  style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                  <p className="text-[13.5px] font-light leading-relaxed" style={{ color: C.textSecondary }}>
                    {profile.previous_collaborations}
                  </p>
                </div>
              ) : (
                <EmptyCard
                  icon={<Users className="h-5 w-5" />}
                  title="No previous collaborations listed"
                  subtitle="This creator hasn't listed past brand work yet."
                />
              )}
            </section>
            )}

            {/* Content Types */}
            {profile.preferred_content_types.length > 0 && (
              <section>
                <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4"
                  style={{ color: C.textQuaternary }}>Content Types</div>
                <div className="rounded-2xl p-5"
                  style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_content_types.map(ct => (
                      <span key={ct} className="text-[12px] rounded-full px-3.5 py-1.5 font-medium"
                        style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}>
                        {ct}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Connect CTA — shown to guests and non-business users who aren't the owner */}
            {!showBizActions && !isOwner && (
              <section className="rounded-2xl p-6"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-2"
                  style={{ color: C.textQuaternary }}>MRKT Connect</div>
                <div className="font-display text-[1.1rem] font-semibold mb-2 tracking-tight"
                  style={{ color: C.textPrimary }}>
                  Interested in working with {profile.display_name}?
                </div>
                <p className="text-[13px] font-light leading-relaxed mb-5" style={{ color: C.textTertiary }}>
                  Direct outreach and campaign management are available to MRKT Connect businesses.
                  In the meantime, you can reach this creator directly.
                </p>
                <div className="flex flex-wrap gap-3">
                  {profile.instagram_handle && (
                    <a href={`https://instagram.com/${profile.instagram_handle}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] transition-all duration-150"
                      style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  )}
                  {profile.tiktok_handle && (
                    <a href={`https://tiktok.com/@${profile.tiktok_handle}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px] transition-all duration-150"
                      style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}>
                      <span className="text-[11px] font-bold" style={{ fontFamily: "monospace" }}>TK</span> TikTok
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  )}
                  {!user && (
                    <Link to="/login"
                      className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px]">
                      Join MRKT <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Modals */}
      {showSave && (
        <SaveCreatorModal
          profile={profile}
          onClose={() => setShowSave(false)}
          onSaved={(ids, names) => { setSavedIds(ids); setSavedNames(names); }}
        />
      )}
      {showOutreach && (
        <OutreachModal
          profile={profile}
          bizCtx={bizCtx}
          onClose={() => setShowOutreach(false)}
        />
      )}
    </div>
  );
}
