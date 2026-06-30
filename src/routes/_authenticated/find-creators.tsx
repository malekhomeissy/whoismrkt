import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { toast } from "sonner";
import {
  Search, ArrowUpRight, Users, MapPin,
  Bookmark, BookmarkCheck, Filter,
  X, ChevronDown, Sparkles, Folder, Zap, MessageSquare,
} from "lucide-react";
import {
  type CreatorCategory,
  CATEGORY_LABELS,
  formatFollowers,
  platformShort,
  platformColor,
  PLATFORMS,
} from "@/types/creator";
import { computeMatchScore, type CampaignInput, type CreatorTrustScore } from "@/lib/matchScore";
import { MatchScoreBadge } from "@/components/ui/MatchScoreBadge";
import { findOrCreateConversation } from "@/lib/messaging";
import { VerifiedBadge, BetaPioneerBadge } from "@/components/app/VerifiedBadge";
import { RatingsDisplay } from "@/components/app/RatingsDisplay";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";

export const Route = createFileRoute("/_authenticated/find-creators")({
  head: () => ({ meta: [{ title: "Find Creators — MRKT Connect" }] }),
  component: FindCreatorsPage,
});

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Creator = {
  id: string;
  user_id: string | null;
  display_name: string;
  username: string | null;
  niche: string | null;
  categories: string[];
  platforms: string[];
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  follower_count: number | null;
  audience_location: string | null;
  primary_language: string | null;
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
  preferred_content_types: string[];
  is_verified?: boolean;
  is_beta_pioneer?: boolean;
  avg_rating?: number | null;
  review_count?: number;
  created_at: string;
};

type Project = { id: string; name: string };

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

const AVATAR_COLORS = [
  "oklch(0.78 0.005 0)",
  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)",
  "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",
  "oklch(0.30 0 0)",
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
        if (user && creator.user_id) {
          trackMarketplaceEvent({
            actorUserId: user.id,
            eventType: "creator_saved",
            creatorId: creator.user_id,
            businessId: user.id,
          });
        }
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
                    background: isSaved ? "oklch(1 0 0 / 12%)" : C.raised,
                    border: `1px solid ${isSaved ? "oklch(1 0 0 / 35%)" : C.borderSubtle}`,
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

function CreatorCard({ creator, onSave, isSaved, matchScore }: { creator: Creator; onSave: (c: Creator) => void; isSaved?: boolean; matchScore?: number }) {
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const [messaging, setMessaging] = useState(false);
  const initial = creator.display_name?.[0]?.toUpperCase() ?? "C";

  async function handleMessage(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user || !creator.user_id || creator.user_id === user.id || messaging) return;
    setMessaging(true);
    try {
      const convId = await findOrCreateConversation(creator.user_id);
      trackMarketplaceEvent({
        actorUserId: user.id,
        eventType: "conversation_started",
        creatorId: creator.user_id,
        businessId: user.id,
      });
      navigate({ to: `/messages/${convId}` as "/" });
    } catch {
      toast.error("Couldn't start conversation");
    } finally {
      setMessaging(false);
    }
  }

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
                loading="lazy"
                className="h-12 w-12 rounded-2xl object-cover img-fade"
                style={{ border: `1px solid ${C.borderNormal}` }}
                onLoad={e => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
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
                background: C.green,
                border: `2px solid ${C.surface}`,
                boxShadow: "0 0 5px oklch(0.72 0.18 152 / 50%)",
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] font-semibold leading-snug" style={{ color: C.textPrimary }}>
                {creator.display_name}
              </span>
              {creator.is_verified && (
                <VerifiedBadge type="creator" size="sm" />
              )}
              {creator.is_beta_pioneer && (
                <BetaPioneerBadge size="sm" aria-label="Beta Pioneer" />
              )}
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

        {/* Match score + Bookmark */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {matchScore !== undefined && matchScore > 0 && (
            <MatchScoreBadge score={matchScore} size="xs" />
          )}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(creator); }}
          className="p-2 rounded-xl transition-all duration-150 shrink-0"
          style={{
            background: isSaved ? "oklch(1 0 0 / 10%)" : C.raised,
            border: `1px solid ${isSaved ? "oklch(1 0 0 / 35%)" : C.borderSubtle}`,
            color: isSaved ? C.accent : C.textMuted,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = C.accent;
            (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 35%)";
            (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = isSaved ? C.accent : C.textMuted;
            (e.currentTarget as HTMLElement).style.borderColor = isSaved ? "oklch(1 0 0 / 35%)" : C.borderSubtle;
            (e.currentTarget as HTMLElement).style.background = isSaved ? "oklch(1 0 0 / 10%)" : C.raised;
          }}
          title={isSaved ? "Already saved to a project (click to save to another)" : "Save to Project"}
        >
          {isSaved
            ? <BookmarkCheck className="h-3.5 w-3.5" />
            : <Bookmark className="h-3.5 w-3.5" />
          }
        </button>
        </div>
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
            {(creator.avg_rating ?? 0) > 0 && (creator.review_count ?? 0) > 0 && (
              <RatingsDisplay avgRating={creator.avg_rating} reviewCount={creator.review_count} />
            )}
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
            <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: C.greenMuted, color: C.green, border: `1px solid ${C.greenBorder}` }}>
              Paid
            </span>
          )}
          {creator.accepts_gifted && (
            <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: C.blueBg, color: C.aiBlue, border: `1px solid ${C.blueBorder}` }}>
              Gifted
            </span>
          )}
          {creator.accepts_affiliate && (
            <span className="text-[9.5px] rounded-full px-2 py-0.5" style={{ background: C.amberMuted, color: C.amber, border: `1px solid ${C.amberBorder}` }}>
              Affiliate
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        {creator.user_id && creator.user_id !== user?.id && (
          <button
            onClick={handleMessage}
            disabled={messaging}
            className="flex items-center justify-center gap-1.5 rounded-full h-9 px-4 text-[12.5px] font-medium transition-all duration-150 shrink-0"
            style={{
              background: "oklch(1 0 0 / 10%)",
              border:     "1px solid oklch(1 0 0 / 25%)",
              color:      C.chrome,
              fontFamily: "inherit",
              cursor:     messaging ? "wait" : "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 18%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {messaging ? "…" : "Message"}
          </button>
        )}
        {/* WhatsApp share — opens with pre-filled intro */}
        {creator.user_id && creator.user_id !== user?.id && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hi! I found your profile on MRKT and I'd love to collaborate. Check it out: https://usemrkt.app/creators/${creator.id}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full transition-all duration-150"
            style={{
              background: "oklch(0.52 0.16 145 / 12%)",
              border:     "1px solid oklch(0.52 0.16 145 / 28%)",
              color:      "oklch(0.72 0.16 145)",
            }}
            title="Contact via WhatsApp"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.16 145 / 22%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.16 145 / 12%)"; }}
          >
            {/* WhatsApp icon (SVG) */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        )}
        <Link
          to={`/creators/${creator.id}` as "/"}
          className="flex items-center justify-center gap-2 flex-1 rounded-full h-9 text-[12.5px] font-medium transition-all duration-150"
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
          onClick={(e) => {
            e.stopPropagation();
            if (user && creator.user_id) {
              trackMarketplaceEvent({
                actorUserId: user.id,
                eventType: "creator_profile_viewed",
                creatorId: creator.user_id,
                businessId: user.id,
              });
            }
          }}
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

const MENA_COUNTRIES = ["UAE", "Saudi Arabia", "Lebanon", "Egypt", "Jordan", "Qatar", "Kuwait", "Bahrain"];

function FindCreatorsPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [creators,          setCreators]          = useState<Creator[]>([]);
  const [trustScores,       setTrustScores]       = useState<Record<string, CreatorTrustScore>>({});
  const [loading,           setLoading]           = useState(true);
  const [loadingMore,       setLoadingMore]       = useState(false);
  const [totalCount,        setTotalCount]        = useState(0);
  const [page,              setPage]              = useState(0);
  const [searchQuery,       setSearchQuery]       = useState("");
  const [debouncedQuery,    setDebouncedQuery]    = useState("");
  const [selectedNiches,    setSelectedNiches]    = useState<CreatorCategory[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedLanguage,  setSelectedLanguage]  = useState<string>("");
  const [showFilters,       setShowFilters]       = useState(false);
  const [saveTarget,        setSaveTarget]        = useState<Creator | null>(null);
  const [savedCreatorIds,   setSavedCreatorIds]   = useState<Set<string>>(new Set());
  const [isCreatorAccount,  setIsCreatorAccount]  = useState(false);
  const [activeCampaign,    setActiveCampaign]    = useState<CampaignInput | null>(null);

  const PAGE_SIZE = 48;
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    // Pre-load saved creator IDs
    (supabase as any)
      .from("project_saved_creators")
      .select("creator_profile_id")
      .eq("saved_by", user.id)
      .then(({ data }: { data: { creator_profile_id: string }[] | null }) => {
        if (data) setSavedCreatorIds(new Set(data.map((r) => r.creator_profile_id)));
      });
    supabase
      .from("profiles")
      .select("account_type, onboarding_path")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.account_type === "creator" || data?.onboarding_path === "creator") setIsCreatorAccount(true);
      });
    (supabase as any)
      .from("campaigns")
      .select("required_platforms,required_niches,business_industry,required_country,required_language,min_followers,compensation_type")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: CampaignInput | null }) => { if (data) setActiveCampaign(data); });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when filters or debounced query changes
  useEffect(() => {
    if (!user) return;
    setPage(0);
    setCreators([]);
    loadPage(0);
  }, [debouncedQuery, selectedNiches, selectedPlatforms, selectedCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSaveTarget(null); setShowFilters(false); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function loadPage(p: number, append = false) {
    if (p === 0) setLoading(true); else setLoadingMore(true);
    try {
      const isSearching = debouncedQuery.trim().length > 0 || selectedNiches.length > 0 || selectedPlatforms.length > 0 || selectedCountries.length > 0;

      let loaded: Creator[] = [];

      if (isSearching) {
        // Server-side search via RPC
        const { data: rpcData, error } = await (supabase as any).rpc("search_creators", {
          p_query:     debouncedQuery.trim() || null,
          p_platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
          p_categories: selectedNiches.length > 0 ? selectedNiches : null,
          p_country:   selectedCountries.length > 0 ? selectedCountries[0] : null,
          p_limit:     PAGE_SIZE,
          p_offset:    p * PAGE_SIZE,
        });
        if (error) throw error;
        const rows: Array<Record<string, unknown>> = rpcData ?? [];
        if (rows.length > 0) setTotalCount(Number(rows[0]?.total_count ?? 0));
        else if (p === 0) setTotalCount(0);
        // Map RPC result to Creator shape (fill missing fields with defaults)
        loaded = rows.map((r) => ({
          id:                     String(r.id ?? ""),
          user_id:                r.user_id ? String(r.user_id) : null,
          display_name:           String(r.display_name ?? ""),
          username:               r.username ? String(r.username) : null,
          niche:                  r.niche ? String(r.niche) : null,
          categories:             Array.isArray(r.categories) ? r.categories as string[] : [],
          platforms:              Array.isArray(r.platforms) ? r.platforms as string[] : [],
          location:               r.location ? String(r.location) : null,
          location_city:          null,
          location_country:       r.location_country ? String(r.location_country) : null,
          bio:                    r.bio ? String(r.bio) : null,
          profile_image_url:      r.profile_image_url ? String(r.profile_image_url) : null,
          instagram_handle:       null,
          tiktok_handle:          null,
          youtube_handle:         null,
          follower_count:         r.follower_count != null ? Number(r.follower_count) : null,
          audience_location:      null,
          primary_language:       null,
          accepts_paid:           true,
          accepts_gifted:         false,
          accepts_affiliate:      false,
          preferred_content_types: [],
          is_verified:            Boolean(r.is_verified),
          is_beta_pioneer:        Boolean(r.is_beta_pioneer),
          avg_rating:             r.avg_rating != null ? Number(r.avg_rating) : null,
          review_count:           0,
          created_at:             String(r.created_at ?? ""),
        }));
      } else {
        // Paginated view load (no search, no filters)
        const from = p * PAGE_SIZE;
        const to   = from + PAGE_SIZE - 1;
        const { data, error, count } = await (supabase as any)
          .from("creator_discovery_ranked")
          .select(
            "id,user_id,display_name,username,niche,categories,platforms,location,location_city,location_country,bio," +
            "profile_image_url,instagram_handle,tiktok_handle,youtube_handle," +
            "follower_count,audience_location,primary_language," +
            "accepts_paid,accepts_gifted,accepts_affiliate,preferred_content_types,is_verified,is_beta_pioneer,avg_rating,review_count,created_at,discovery_rank",
            { count: "exact" }
          )
          .order("discovery_rank", { ascending: false })
          .range(from, to);
        if (error) throw error;
        if (p === 0) setTotalCount(count ?? 0);
        loaded = data ?? [];
      }

      setCreators(prev => append ? [...prev, ...loaded] : loaded);
      setPage(p);

      // Fetch trust scores for loaded creators
      const userIds = loaded.map((c) => c.user_id).filter(Boolean) as string[];
      if (userIds.length > 0) {
        const { data: trustData } = await (supabase as any)
          .from("creator_trust_scores")
          .select("*")
          .in("user_id", userIds);
        if (trustData) {
          const map: Record<string, CreatorTrustScore> = {};
          for (const ts of trustData) map[ts.user_id] = ts as CreatorTrustScore;
          setTrustScores(prev => ({ ...prev, ...map }));
        }
      }
    } catch { toast.error("Couldn't load creators."); }
    finally { setLoading(false); setLoadingMore(false); }
  }

  const filtered = creators; // filtering is now server-side

  // Match scores — computed once per filter change, sorted highest first
  const scoredCreators = useMemo(() => {
    if (!activeCampaign) return filtered.map((c) => ({ creator: c, score: 0 }));
    return filtered
      .map((c) => {
        const trust = c.user_id ? trustScores[c.user_id] ?? null : null;
        return {
          creator: c,
          score: computeMatchScore(
            {
              platforms:              c.platforms ?? [],
              niche:                  c.niche,
              categories:             c.categories ?? [],
              audience_location:      c.audience_location,
              location:               c.location,
              location_city:          c.location_city,
              location_country:       c.location_country,
              follower_count:         c.follower_count,
              primary_language:       c.primary_language,
              accepts_paid:           c.accepts_paid ?? false,
              accepts_gifted:         c.accepts_gifted ?? false,
              accepts_affiliate:      c.accepts_affiliate ?? false,
              preferred_content_types: c.preferred_content_types ?? [],
            },
            activeCampaign,
            trust,
          ).total,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [filtered, activeCampaign, trustScores]);

  function toggleNiche(n: CreatorCategory) {
    setSelectedNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  }
  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  const hasActiveFilters = selectedNiches.length > 0 || selectedPlatforms.length > 0 || selectedCountries.length > 0 || selectedLanguage !== "";

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
          <span className="text-[11px]">{loading ? "—" : `${totalCount > 0 ? totalCount : filtered.length} creator${(totalCount || filtered.length) !== 1 ? "s" : ""}`}</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-6 py-5">

          {/* Page heading */}
          <div className="mb-4">
            <div className="text-[9.5px] uppercase tracking-[0.35em] mb-2 font-medium" style={{ color: C.textQuaternary }}>
              MRKT Connect
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-[-0.04em] leading-[1.06] mb-1.5">
              Find Creators.
            </h1>
            <p className="text-[0.9rem] font-light leading-relaxed" style={{ color: C.textTertiary }}>
              Browse creators ready for brand partnerships — filter by niche, platform, and location.
            </p>
          </div>

          {/* Creator account — contextual redirect banner */}
          {isCreatorAccount && (
            <div
              className="mb-4 rounded-2xl p-4 flex items-center justify-between gap-4"
              style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 20%)" }}
            >
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 shrink-0" style={{ color: C.accent }} />
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
                style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 24%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 15%)"; }}
              >
                Browse Campaigns <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Search + filter bar */}
          <div className="flex flex-col gap-3 mb-4">
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

                {/* MENA — Country */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] mb-2.5 flex items-center gap-2" style={{ color: C.textQuaternary }}>
                    {t("filter.country")}
                    <span className="text-[9px] normal-case tracking-normal rounded-full px-1.5 py-0.5" style={{ background: "oklch(0.72 0.10 224 / 12%)", color: "oklch(0.72 0.10 224)" }}>MENA</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MENA_COUNTRIES.map((country) => (
                      <Pill
                        key={country}
                        label={country}
                        active={selectedCountries.includes(country)}
                        onClick={() => setSelectedCountries((prev) => prev.includes(country) ? prev.filter((x) => x !== country) : [...prev, country])}
                      />
                    ))}
                  </div>
                </div>

                {/* MENA — Language */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] mb-2.5" style={{ color: C.textQuaternary }}>{t("filter.language")}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: "arabic",   label: t("filter.arabic_speaking") },
                      { value: "english",  label: t("filter.english_speaking") },
                      { value: "bilingual",label: t("filter.bilingual") },
                    ].map(({ value, label }) => (
                      <Pill
                        key={value}
                        label={label}
                        active={selectedLanguage === value}
                        onClick={() => setSelectedLanguage((prev) => prev === value ? "" : value)}
                      />
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={() => { setSelectedNiches([]); setSelectedPlatforms([]); setSelectedCountries([]); setSelectedLanguage(""); }}
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
          ) : scoredCreators.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters || !!searchQuery}
              onClear={() => { setSearchQuery(""); setSelectedNiches([]); setSelectedPlatforms([]); setSelectedCountries([]); setSelectedLanguage(""); }}
            />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoredCreators.map(({ creator: c, score }) => (
                  <CreatorCard key={c.id} creator={c} onSave={setSaveTarget} isSaved={savedCreatorIds.has(c.id)} matchScore={activeCampaign ? score : undefined} />
                ))}
              </div>
              {creators.length < totalCount && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => loadPage(page + 1, true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full px-6 h-10 text-[12.5px] font-medium transition-all"
                    style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textSecondary, opacity: loadingMore ? 0.6 : 1 }}
                  >
                    {loadingMore ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" /> : null}
                    {loadingMore ? "Loading…" : `Load more (${totalCount - creators.length} remaining)`}
                  </button>
                </div>
              )}
            </>
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
        <Sparkles className="h-6 w-6" style={{ color: C.accent }} />
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
