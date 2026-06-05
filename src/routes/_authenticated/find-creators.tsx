import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { toast } from "sonner";
import {
  Search, ArrowUpRight, Users, MapPin,
  Bookmark, BookmarkCheck, Filter,
  X, ChevronDown, Sparkles, Folder, Zap, BadgeCheck,
} from "lucide-react";
import {
  type CreatorCategory,
  CATEGORY_LABELS,
  formatFollowers,
  platformShort,
  platformColor,
  PLATFORMS,
} from "@/types/creator";

export const Route = createFileRoute("/_authenticated/find-creators")({
  head: () => ({ meta: [{ title: "Find Creators — MRKT Connect" }] }),
  component: FindCreatorsPage,
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Creator = {
  id: string;
  display_name: string;
  username: string | null;
  niche: string | null;
  categories: string[];
  platforms: string[];
  location: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  follower_count: number | null;
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
  created_at: string;
};

type Project = { id: string; name: string };

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────

const C = {
  canvas:         "#000",
  base:           "oklch(0.075 0 0)",
  surface:        "oklch(0.11 0 0)",
  raised:         "oklch(0.15 0 0)",
  high:           "oklch(0.19 0 0)",
  borderSubtle:   "oklch(1 0 0 / 9%)",
  borderNormal:   "oklch(1 0 0 / 13%)",
  borderStrong:   "oklch(1 0 0 / 20%)",
  shadowCard:     "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  shadowModal:    "inset 0 1px 0 oklch(1 0 0 / 14%), 0 8px 40px oklch(0 0 0 / 60%), 0 2px 8px oklch(0 0 0 / 45%)",
  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",
  chrome:         "oklch(0.82 0.005 250)",
  accent:         "oklch(0.72 0.14 152)",
} as const;

const AVATAR_COLORS = [
  "oklch(0.68 0.12 25)",
  "oklch(0.66 0.09 250)",
  "oklch(0.64 0.11 160)",
  "oklch(0.70 0.10 300)",
  "oklch(0.72 0.09 60)",
  "oklch(0.65 0.10 190)",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const NICHE_OPTIONS: { value: CreatorCategory; label: string }[] = Object.entries(CATEGORY_LABELS)
  .map(([value, label]) => ({ value: value as CreatorCategory, label }));

// ─────────────────────────────────────────────────────────────
// Save to Project modal
// ─────────────────────────────────────────────────────────────

function SaveCreatorModal({ creator, onClose, onSaved }: {
  creator: Creator;
  onClose: () => void;
  onSaved?: (creatorId: string) => void;
}) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState<Set<string>>(new Set());
  const [note,     setNote]     = useState("");

  useEffect(() => {
    if (!user) return;

    // Load projects + pre-check which ones already have this creator
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("projects")
        .select("id,name")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(10),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("project_saved_creators")
        .select("project_id")
        .eq("creator_profile_id", creator.id)
        .eq("saved_by", user.id),
    ]).then(([projRes, savedRes]) => {
      setProjects(projRes.data ?? []);
      if (savedRes.data) {
        setSaved(new Set((savedRes.data as { project_id: string }[]).map((r) => r.project_id)));
      }
    });

    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user, creator.id, onClose]);

  async function save(projectId: string) {
    if (!user || saved.has(projectId)) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_saved_creators")
        .insert({
          project_id:         projectId,
          creator_profile_id: creator.id,
          saved_by:           user.id,
          note:               note.trim() || null,
        });
      if (error && error.code === "23505") {
        setSaved((s) => new Set([...s, projectId]));
        toast("Already saved to this project.");
      } else if (error) {
        throw error;
      } else {
        setSaved((s) => new Set([...s, projectId]));
        onSaved?.(creator.id);
        toast.success(`${creator.display_name} saved to project.`);
      }
    } catch { toast.error("Couldn't save. Try again."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowModal }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: avatarColor(creator.display_name), color: "oklch(0.1 0 0)" }}
          >
            {creator.display_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
              Save {creator.display_name}
            </div>
            <div className="text-[11px]" style={{ color: C.textTertiary }}>Choose a project</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Optional note */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.textQuaternary }}>
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you saving this creator?"
            rows={2}
            className="w-full rounded-xl px-3 py-2.5 text-[12.5px] bg-transparent resize-none outline-none placeholder:text-foreground/20"
            style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
          />
        </div>

        {projects.length === 0 ? (
          <div className="py-3 text-center">
            <p className="text-[12.5px] mb-3" style={{ color: C.textTertiary }}>
              You need a project to save creators to.
            </p>
            <Link
              to="/projects"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12.5px]"
              onClick={onClose}
            >
              Create a Project <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {projects.map((p) => {
              const isSaved = saved.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => save(p.id)}
                  disabled={saving || isSaved}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150"
                  style={{
                    background: isSaved ? "oklch(0.72 0.14 152 / 12%)" : C.raised,
                    border: `1px solid ${isSaved ? "oklch(0.72 0.14 152 / 35%)" : C.borderSubtle}`,
                    cursor: isSaved ? "default" : "pointer",
                  }}
                  onMouseEnter={(e) => { if (!isSaved) (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                  onMouseLeave={(e) => { if (!isSaved) (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
                >
                  {isSaved
                    ? <BookmarkCheck className="h-3.5 w-3.5 shrink-0" style={{ color: C.accent }} />
                    : <Folder        className="h-3.5 w-3.5 shrink-0" style={{ color: C.textMuted }} />
                  }
                  <span className="text-[13px] font-medium truncate" style={{ color: isSaved ? C.accent : C.textSecondary }}>
                    {p.name}
                  </span>
                  {isSaved && <span className="ml-auto text-[10px] font-semibold shrink-0" style={{ color: C.accent }}>Saved ✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Creator card
// ─────────────────────────────────────────────────────────────

function CreatorCard({ creator, onSave, isSaved }: { creator: Creator; onSave: (c: Creator) => void; isSaved?: boolean }) {
  const initial = creator.display_name?.[0]?.toUpperCase() ?? "C";

  return (
    <div
      className="group rounded-[18px] overflow-hidden flex flex-col transition-all duration-200"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 14%), 0 8px 28px oklch(0 0 0 / 60%), 0 2px 8px oklch(0 0 0 / 45%)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = C.shadowCard;
      }}
    >
      {/* Card header */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar with active dot */}
          <div className="relative shrink-0">
            {creator.profile_image_url ? (
              <img
                src={creator.profile_image_url}
                alt={creator.display_name}
                className="h-12 w-12 rounded-2xl object-cover"
                style={{ border: `1px solid ${C.borderNormal}` }}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  (el.nextSibling as HTMLElement).style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="h-12 w-12 rounded-2xl items-center justify-center text-[16px] font-bold"
              style={{
                display: creator.profile_image_url ? "none" : "flex",
                background: avatarColor(creator.display_name),
                color: "oklch(0.1 0 0)",
              }}
            >
              {initial}
            </div>
            {/* Active indicator — all cards here are status='active' */}
            <div
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
              style={{
                background: "oklch(0.72 0.14 152)",
                border: `2px solid ${C.surface}`,
                boxShadow: "0 0 5px oklch(0.72 0.14 152 / 50%)",
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold leading-snug" style={{ color: C.textPrimary }}>
                {creator.display_name}
              </span>
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: C.chrome }} aria-label="Verified Creator" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {creator.username && (
                <span className="text-[10.5px]" style={{ color: C.textQuaternary }}>@{creator.username}</span>
              )}
              {creator.niche && (
                <span
                  className="text-[9.5px] uppercase tracking-[0.18em] font-medium rounded-full px-2 py-0.5"
                  style={{ background: "oklch(1 0 0 / 8%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}
                >
                  {creator.niche}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(creator); }}
          className="p-2 rounded-xl transition-all duration-150 shrink-0"
          style={{
            background: isSaved ? "oklch(0.72 0.14 152 / 10%)" : C.raised,
            border: `1px solid ${isSaved ? "oklch(0.72 0.14 152 / 35%)" : C.borderSubtle}`,
            color: isSaved ? C.accent : C.textMuted,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = C.accent;
            (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.72 0.14 152 / 35%)";
            (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 10%)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = isSaved ? C.accent : C.textMuted;
            (e.currentTarget as HTMLElement).style.borderColor = isSaved ? "oklch(0.72 0.14 152 / 35%)" : C.borderSubtle;
            (e.currentTarget as HTMLElement).style.background = isSaved ? "oklch(0.72 0.14 152 / 10%)" : C.raised;
          }}
          title={isSaved ? "Already saved to a project (click to save to another)" : "Save to Project"}
        >
          {isSaved
            ? <BookmarkCheck className="h-3.5 w-3.5" />
            : <Bookmark className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {/* Location + bio */}
      <div className="px-5 pb-4 space-y-2.5 flex-1">
        {creator.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" style={{ color: C.textQuaternary }} />
            <span className="text-[12px]" style={{ color: C.textTertiary }}>{creator.location}</span>
          </div>
        )}

        {creator.bio && (
          <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: C.textTertiary }}>
            {creator.bio}
          </p>
        )}

        {/* Niche / category pills */}
        {creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {creator.categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="text-[10px] uppercase tracking-[0.16em] rounded-full px-2.5 py-0.5"
                style={{ background: "oklch(1 0 0 / 5%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}
              >
                {CATEGORY_LABELS[c as CreatorCategory] ?? c}
              </span>
            ))}
            {creator.categories.length > 3 && (
              <span className="text-[10px] rounded-full px-2 py-0.5" style={{ color: C.textMuted }}>
                +{creator.categories.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Platform + follower row */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
        {creator.platforms.length > 0 ? (
          <>
            {creator.platforms.slice(0, 4).map((p) => (
              <span
                key={p}
                className="text-[9px] font-bold rounded-full px-2 py-0.5"
                style={{ background: "oklch(1 0 0 / 8%)", color: platformColor(p), border: `1px solid ${C.borderSubtle}` }}
              >
                {platformShort(p)}
              </span>
            ))}
            {creator.follower_count != null && creator.follower_count > 0 && (
              <div className="ml-auto flex items-center gap-1">
                <Users className="h-3 w-3" style={{ color: C.textQuaternary }} />
                <span className="text-[11px] font-medium" style={{ color: C.textSecondary }}>
                  {formatFollowers(creator.follower_count)}
                </span>
              </div>
            )}
          </>
        ) : (
          <span className="text-[11px]" style={{ color: C.textMuted }}>No platforms listed</span>
        )}
      </div>

      {/* Collab badges */}
      {(creator.accepts_paid || creator.accepts_gifted || creator.accepts_affiliate) && (
        <div className="px-5 pb-3.5 flex flex-wrap gap-1.5">
          {creator.accepts_paid && (
            <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: "oklch(0.72 0.14 152 / 10%)", color: "oklch(0.72 0.14 152)", border: "1px solid oklch(0.72 0.14 152 / 22%)" }}>
              Paid
            </span>
          )}
          {creator.accepts_gifted && (
            <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: "oklch(0.65 0.14 250 / 10%)", color: "oklch(0.65 0.14 250)", border: "1px solid oklch(0.65 0.14 250 / 22%)" }}>
              Gifted
            </span>
          )}
          {creator.accepts_affiliate && (
            <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: "oklch(0.78 0.12 60 / 10%)", color: "oklch(0.78 0.12 60)", border: "1px solid oklch(0.78 0.12 60 / 22%)" }}>
              Affiliate
            </span>
          )}
        </div>
      )}

      {/* View profile */}
      <div className="px-5 pb-5">
        <Link
          to={`/creators/${creator.id}` as "/"}
          className="flex items-center justify-center gap-2 w-full rounded-full h-9 text-[12.5px] font-medium transition-all duration-150"
          style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.high;
            (e.currentTarget as HTMLElement).style.color = C.textPrimary;
            (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = C.raised;
            (e.currentTarget as HTMLElement).style.color = C.textSecondary;
            (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
          }}
          onClick={(e) => e.stopPropagation()}
        >
          View Profile <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter pill
// ─────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3.5 py-2 rounded-full text-[12px] font-medium transition-all duration-150"
      style={{
        background: active ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 3.5%)",
        border: `1px solid ${active ? "oklch(0.84 0 0 / 45%)" : C.borderSubtle}`,
        color: active ? C.textPrimary : C.textTertiary,
      }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-[18px] p-5 space-y-4 animate-pulse" style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl" style={{ background: C.raised }} />
        <div className="space-y-2 flex-1">
          <div className="h-4 rounded-full w-2/3" style={{ background: C.raised }} />
          <div className="h-3 rounded-full w-1/3" style={{ background: C.raised }} />
        </div>
      </div>
      <div className="h-3 rounded-full w-1/2" style={{ background: C.raised }} />
      <div className="h-12 rounded-xl" style={{ background: C.raised }} />
      <div className="flex gap-2">
        <div className="h-5 w-14 rounded-full" style={{ background: C.raised }} />
        <div className="h-5 w-14 rounded-full" style={{ background: C.raised }} />
      </div>
      <div className="h-9 rounded-full" style={{ background: C.raised }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function FindCreatorsPage() {
  const { user } = useAuth();

  const [creators,          setCreators]          = useState<Creator[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedNiches,    setSelectedNiches]    = useState<CreatorCategory[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showFilters,       setShowFilters]       = useState(false);
  const [saveTarget,        setSaveTarget]        = useState<Creator | null>(null);
  const [savedCreatorIds,   setSavedCreatorIds]   = useState<Set<string>>(new Set());
  const [isCreatorAccount,  setIsCreatorAccount]  = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadCreators();
    // Pre-load which creator IDs this user has already saved (to any project)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("project_saved_creators")
      .select("creator_profile_id")
      .eq("saved_by", user.id)
      .then(({ data }: { data: { creator_profile_id: string }[] | null }) => {
        if (data) setSavedCreatorIds(new Set(data.map((r) => r.creator_profile_id)));
      });
    // Check user role — show contextual banner if creator visits a business tool
    supabase
      .from("profiles")
      .select("account_type, onboarding_path")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type === "creator" || data?.onboarding_path === "creator") {
          setIsCreatorAccount(true);
        }
      });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSaveTarget(null); setShowFilters(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function loadCreators() {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("creator_profiles")
        .select(
          "id,display_name,username,niche,categories,platforms,location,bio," +
          "profile_image_url,instagram_handle,tiktok_handle,youtube_handle," +
          "follower_count,accepts_paid,accepts_gifted,accepts_affiliate,created_at"
        )
        .eq("is_public", true)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCreators(data ?? []);
    } catch { toast.error("Couldn't load creators."); }
    finally { setLoading(false); }
  }

  // Client-side filtering
  const filtered = creators.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName     = c.display_name.toLowerCase().includes(q);
      const matchUsername = (c.username ?? "").toLowerCase().includes(q);
      const matchNiche    = (c.niche ?? "").toLowerCase().includes(q);
      const matchLocation = (c.location ?? "").toLowerCase().includes(q);
      const matchCats     = c.categories.some((cat) => cat.toLowerCase().includes(q));
      if (!matchName && !matchUsername && !matchNiche && !matchLocation && !matchCats) return false;
    }
    if (selectedNiches.length > 0) {
      if (!selectedNiches.some((n) => c.categories.includes(n))) return false;
    }
    if (selectedPlatforms.length > 0) {
      if (!selectedPlatforms.every((p) => c.platforms.includes(p))) return false;
    }
    return true;
  });

  function toggleNiche(n: CreatorCategory) {
    setSelectedNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  }
  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  const hasActiveFilters = selectedNiches.length > 0 || selectedPlatforms.length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* Page top bar */}
      <div className="h-[52px] px-6 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: C.textMuted }}>Campaigns</span>
          <span className="text-[12px]" style={{ color: C.textMuted }}>/</span>
          <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>Find Creators</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: C.textMuted }}>
          <Users className="h-3.5 w-3.5" />
          <span className="text-[11px]">{loading ? "—" : `${filtered.length} creator${filtered.length !== 1 ? "s" : ""}`}</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10">

          {/* Page heading */}
          <div className="mb-8">
            <div className="text-[9.5px] uppercase tracking-[0.35em] mb-4 font-medium" style={{ color: C.textQuaternary }}>
              MRKT Connect
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-2">
              Find Creators.
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: C.textTertiary }}>
              Browse creators ready for brand partnerships — filter by niche, platform, and location.
            </p>
          </div>

          {/* Creator account — contextual redirect banner */}
          {isCreatorAccount && (
            <div
              className="mb-8 rounded-2xl p-4 flex items-center justify-between gap-4"
              style={{ background: "oklch(0.72 0.14 152 / 6%)", border: "1px solid oklch(0.72 0.14 152 / 20%)" }}
            >
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 shrink-0" style={{ color: "oklch(0.72 0.14 152)" }} />
                <div>
                  <div className="text-[12.5px] font-semibold mb-0.5" style={{ color: C.textSecondary }}>
                    This is a business discovery tool.
                  </div>
                  <div className="text-[11.5px]" style={{ color: C.textTertiary }}>
                    As a creator, you can browse open campaigns and opportunities instead.
                  </div>
                </div>
              </div>
              <Link
                to="/opportunities"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 h-8 text-[12px] font-medium transition-all duration-150"
                style={{ background: "oklch(0.72 0.14 152 / 15%)", border: "1px solid oklch(0.72 0.14 152 / 30%)", color: "oklch(0.72 0.14 152)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 24%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 15%)"; }}
              >
                Browse Campaigns <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Search + filter bar */}
          <div className="flex flex-col gap-3 mb-8">
            <div className="flex gap-2">
              <div
                className="flex-1 flex items-center gap-2.5 rounded-xl px-3.5 h-11"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: C.textQuaternary }} />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, username, niche, or location…"
                  className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-foreground/20"
                  style={{ color: C.textPrimary }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-4 h-11 text-[13px] font-medium transition-all duration-150"
                style={{
                  background: showFilters || hasActiveFilters ? "oklch(1 0 0 / 8%)" : C.surface,
                  border: `1px solid ${showFilters || hasActiveFilters ? C.borderStrong : C.borderNormal}`,
                  color: hasActiveFilters ? C.textPrimary : C.textSecondary,
                }}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: C.accent, color: "#000" }}>
                    {selectedNiches.length + selectedPlatforms.length}
                  </span>
                )}
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform duration-150"
                  style={{ transform: showFilters ? "rotate(180deg)" : "" }}
                />
              </button>
            </div>

            {showFilters && (
              <div className="rounded-[18px] p-5 space-y-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                {/* Platform */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] mb-2.5" style={{ color: C.textQuaternary }}>Platform</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map((p) => (
                      <Pill key={p} label={p} active={selectedPlatforms.includes(p)} onClick={() => togglePlatform(p)} />
                    ))}
                  </div>
                </div>

                {/* Niche */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] mb-2.5" style={{ color: C.textQuaternary }}>Niche / Category</div>
                  <div className="flex flex-wrap gap-1.5">
                    {NICHE_OPTIONS.map((n) => (
                      <Pill key={n.value} label={n.label} active={selectedNiches.includes(n.value)} onClick={() => toggleNiche(n.value)} />
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={() => { setSelectedNiches([]); setSelectedPlatforms([]); }}
                    className="text-[12px] transition-colors"
                    style={{ color: C.textTertiary }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
                  >
                    Clear all filters ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters || !!searchQuery}
              onClear={() => { setSearchQuery(""); setSelectedNiches([]); setSelectedPlatforms([]); }}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <CreatorCard key={c.id} creator={c} onSave={setSaveTarget} isSaved={savedCreatorIds.has(c.id)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {saveTarget && (
        <SaveCreatorModal
          creator={saveTarget}
          onClose={() => setSaveTarget(null)}
          onSaved={(creatorId) => setSavedCreatorIds((prev) => new Set([...prev, creatorId]))}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Search className="h-8 w-8 mb-4" style={{ color: "oklch(1 0 0 / 18%)" }} />
        <p className="text-[0.9375rem] mb-2" style={{ color: C.textTertiary }}>No creators match your filters.</p>
        <button onClick={onClear} className="text-sm mt-2 transition-colors" style={{ color: C.textTertiary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
        >
          Clear filters →
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <Sparkles className="h-6 w-6" style={{ color: C.chrome }} />
      </div>
      <h2 className="font-display text-[1.5rem] font-semibold tracking-tight mb-3" style={{ color: C.textPrimary }}>
        No creators yet.
      </h2>
      <p className="text-[0.9375rem] leading-relaxed max-w-sm mb-8" style={{ color: C.textTertiary }}>
        Creators appear here once they complete and publish their profile. Check back soon — the marketplace is growing.
      </p>
      <Link to="/chat" className="btn-primary inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm">
        Back to AI Strategist <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
