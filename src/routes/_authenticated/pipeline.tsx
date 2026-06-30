import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import { createNotification } from "@/lib/notifications";
import { formatFollowers } from "@/types/creator";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { RatingsDisplay } from "@/components/app/RatingsDisplay";
import { ReviewModal } from "@/components/app/ReviewModal";
import { computeMatchScore, type CreatorInput, type CampaignInput, scoreBg, scoreColor } from "@/lib/matchScore";
import {
  Users, MapPin, ChevronDown, Briefcase, Star,
  X, Check, Pencil, ExternalLink, MessageSquare,
  Mail, Phone, MoreHorizontal, Sparkles, Copy, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — MRKT" }] }),
  component: PipelinePage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Stage config ─────────────────────────────────────────────────────────────

type Stage = "discovered" | "saved" | "contacted" | "negotiating" | "booked" | "completed" | "rejected";

const STAGES: { id: Stage; label: string; color: string; dotColor: string }[] = [
  { id: "discovered",  label: "Discovered",  color: "oklch(1 0 0 / 6%)",           dotColor: "oklch(1 0 0 / 36%)"   },
  { id: "saved",       label: "Saved",       color: "oklch(1 0 0 / 8%)",           dotColor: "oklch(1 0 0 / 46%)"   },
  { id: "contacted",   label: "Contacted",   color: "oklch(0.78 0.14 76 / 12%)",   dotColor: "oklch(0.70 0.08 68)"  },
  { id: "negotiating", label: "Negotiating", color: "oklch(0.78 0.14 76 / 10%)",   dotColor: "oklch(0.70 0.08 68)"  },
  { id: "booked",      label: "Booked",      color: "oklch(0.62 0.10 224 / 12%)",  dotColor: "oklch(0.72 0.10 224)" },
  { id: "completed",   label: "Completed",   color: "oklch(0.72 0.18 152 / 12%)",  dotColor: "oklch(0.62 0.12 158)" },
];

// ─── Platform chip map ────────────────────────────────────────────────────────

const PLATFORM_SHORT: Record<string, string> = {
  instagram: "IG", tiktok: "TK", youtube: "YT",
  twitter: "X",   facebook: "FB", linkedin: "LI",
  pinterest: "PI", snapchat: "SC", threads: "TH",
};

// ─── Contact method config ────────────────────────────────────────────────────

const CONTACT_METHODS = [
  { id: "instagram_dm", label: "Instagram DM", icon: MessageSquare },
  { id: "email",        label: "Email",         icon: Mail         },
  { id: "mrkt_message", label: "MRKT Message",  icon: MessageSquare},
  { id: "phone",        label: "Phone",         icon: Phone        },
  { id: "other",        label: "Other",         icon: MoreHorizontal},
] as const;

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CYCLE: Array<"high" | "medium" | "low" | null> = ["high", "medium", "low", null];

function nextPriority(p: "high" | "medium" | "low" | null): "high" | "medium" | "low" | null {
  const idx = PRIORITY_CYCLE.indexOf(p);
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
}

function priorityColor(p: "high" | "medium" | "low" | null): string {
  if (p === "high")   return C.red;
  if (p === "medium") return C.amber;
  if (p === "low")    return C.chrome;
  return C.textMuted;
}

function priorityLabel(p: "high" | "medium" | "low" | null): string {
  if (p === "high")   return "High";
  if (p === "medium") return "Med";
  if (p === "low")    return "Low";
  return "—";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CreatorProfile = {
  id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  niche: string | null;
  categories: string[];
  platforms: string[];
  profile_image_url: string | null;
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  follower_count: number | null;
  audience_location: string | null;
  primary_language: string | null;
  accepts_paid: boolean;
  accepts_gifted: boolean;
  accepts_affiliate: boolean;
  preferred_content_types: string[];
  is_verified?: boolean;
  avg_rating?: number | null;
  review_count?: number;
};

type Project = { id: string; name: string };

type PipelineEntry = {
  id: string;
  project_id: string;
  status: Stage;
  estimated_rate: string | null;
  priority: "high" | "medium" | "low" | null;
  internal_note: string | null;
  contacted_at: string | null;
  booked_at: string | null;
  completed_at: string | null;
  contact_method: string | null;
  campaign_id: string | null;
  created_at: string;
  creator_profiles: CreatorProfile | null;
  projects: Project | null;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "oklch(0.78 0.005 0)",  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)", "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ─── Outreach Modal ───────────────────────────────────────────────────────────

type OutreachType = "initial" | "followup" | "negotiation" | "proposal";
interface OutreachMessage { tone: string; subject: string; body: string }

function OutreachModal({
  entry, campaign, businessName, onClose,
}: {
  entry:        PipelineEntry;
  campaign:     { title: string; description: string; budget: string; platforms: string[] } | null;
  businessName: string;
  onClose:      () => void;
}) {
  const [type,     setType]     = useState<OutreachType>("initial");
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(0);
  const [copied,   setCopied]   = useState(false);

  const cp = entry.creator_profiles!;

  async function generate(t: OutreachType) {
    setLoading(true);
    setMessages([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/outreach-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: t,
          creator: {
            name:      cp.display_name,
            niche:     cp.niche ?? "content creator",
            followers: cp.follower_count ?? 0,
            platforms: cp.platforms ?? [],
          },
          campaign: campaign ?? { title: "Partnership Opportunity", description: "", budget: "TBD", platforms: [] },
          businessName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setSelected(0);
      } else {
        toast.error("Generation failed — try again");
      }
    } catch {
      toast.error("Generation failed");
    }
    setLoading(false);
  }

  useEffect(() => { generate("initial"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const msg = messages[selected];

  function copyMessage() {
    if (!msg) return;
    navigator.clipboard.writeText(`Subject: ${msg.subject}\n\n${msg.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const TYPES: { id: OutreachType; label: string }[] = [
    { id: "initial",     label: "Initial" },
    { id: "followup",    label: "Follow-up" },
    { id: "negotiation", label: "Negotiation" },
    { id: "proposal",    label: "Proposal" },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "oklch(0 0 0 / 72%)", backdropFilter: "blur(6px)",
        }}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", zIndex: 510,
        width: "min(600px, calc(100vw - 32px))",
        maxHeight: "90vh",
        background: C.surface, border: `1px solid ${C.borderNormal}`,
        borderRadius: 24, display: "flex", flexDirection: "column",
        boxShadow: C.shadowModal, overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.borderSubtle}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Sparkles size={15} style={{ color: C.aiBlue }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>
                AI Outreach
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.textTertiary }}>
              For {cp.display_name} · {cp.niche ?? "Creator"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textMuted }}>
            <X size={13} />
          </button>
        </div>

        {/* Type selector */}
        <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.borderSubtle}`, display: "flex", gap: 6, flexShrink: 0 }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setType(t.id); generate(t.id); }}
              style={{
                padding: "6px 14px", borderRadius: 9,
                border: `1px solid ${type === t.id ? C.aiBlueBorder : C.borderSubtle}`,
                background: type === t.id ? C.accentMuted : "transparent",
                color: type === t.id ? C.aiBlue : C.textTertiary,
                fontSize: 12.5, fontWeight: type === t.id ? 600 : 500, cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: i === 1 ? 48 : 160, borderRadius: 12, background: C.raised, animation: "pulse 1.6s ease-in-out infinite", opacity: 1 - i * 0.12 }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 13 }}>
              Failed to generate — try again
            </div>
          ) : (
            <div>
              {/* Tone tabs */}
              {messages.length > 1 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {messages.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      style={{
                        padding: "5px 12px", borderRadius: 8,
                        border: `1px solid ${i === selected ? C.borderNormal : C.borderFaint}`,
                        background: i === selected ? C.raised : "transparent",
                        color: i === selected ? C.textPrimary : C.textTertiary,
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      {m.tone}
                    </button>
                  ))}
                </div>
              )}

              {/* Subject */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
                  Subject line
                </div>
                <div style={{
                  padding: "12px 14px", background: C.raised,
                  border: `1px solid ${C.borderSubtle}`, borderRadius: 10,
                  fontSize: 13.5, fontWeight: 600, color: C.textPrimary,
                }}>
                  {msg?.subject}
                </div>
              </div>

              {/* Body */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
                  Message
                </div>
                <div style={{
                  padding: "14px 16px", background: C.raised,
                  border: `1px solid ${C.borderSubtle}`, borderRadius: 10,
                  fontSize: 13, color: C.textSecondary, lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg?.body}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && messages.length > 0 && (
          <div style={{
            padding: "14px 24px", borderTop: `1px solid ${C.borderSubtle}`,
            display: "flex", gap: 8, flexShrink: 0,
          }}>
            <button
              onClick={copyMessage}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0",
                background: copied ? C.greenMuted : "oklch(1 0 0 / 92%)",
                color: copied ? C.green : "oklch(0.06 0 0)",
                border: `1px solid ${copied ? C.greenBorder : "transparent"}`,
                borderRadius: 11, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy message"}
            </button>
            <button
              onClick={() => generate(type)}
              style={{
                padding: "10px 16px", background: C.raised, border: `1px solid ${C.borderSubtle}`,
                borderRadius: 11, fontSize: 12.5, color: C.textTertiary, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.high; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.raised; }}
            >
              <Loader2 size={12} /> Regenerate
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Creator card ─────────────────────────────────────────────────────────────

function CreatorCard({
  entry,
  isDragging,
  matchScore,
  onDragStart,
  onMoveStage,
  onUpdateNote,
  onUpdatePriority,
  onUpdateContactMethod,
  onRemove,
  hasReviewed,
  onReview,
}: {
  entry: PipelineEntry;
  isDragging: boolean;
  matchScore?: number;
  onDragStart: () => void;
  onMoveStage: (id: string, stage: Stage) => void;
  onUpdateNote: (id: string, note: string) => void;
  onUpdatePriority: (id: string, priority: "high" | "medium" | "low" | null) => void;
  onUpdateContactMethod: (id: string, method: string) => void;
  onRemove:   (id: string) => void;
  hasReviewed?: boolean;
  onReview?:  (entry: PipelineEntry) => void;
  onOutreach?: (entry: PipelineEntry) => void;
}) {
  const cp = entry.creator_profiles;
  const name = cp?.display_name ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const stageIdx = STAGES.findIndex((s) => s.id === entry.status);

  const [notesOpen,    setNotesOpen]    = useState(false);
  const [notesDraft,   setNotesDraft]   = useState(entry.internal_note ?? "");
  const [notesSaving,  setNotesSaving]  = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (notesOpen && textareaRef.current) textareaRef.current.focus();
  }, [notesOpen]);

  // Reset confirm remove after 3 s
  function handleRemoveClick() {
    if (confirmRemove) {
      onRemove(entry.id);
    } else {
      setConfirmRemove(true);
      confirmTimer.current = setTimeout(() => setConfirmRemove(false), 3000);
    }
  }

  async function saveNote() {
    const trimmed = notesDraft.trim();
    setNotesSaving(true);
    await onUpdateNote(entry.id, trimmed);
    setNotesSaving(false);
    setNotesOpen(false);
  }

  if (!cp) return null;

  // Platform chips (up to 3)
  const platformChips = (cp.platforms ?? [])
    .slice(0, 4)
    .map((p) => PLATFORM_SHORT[p.toLowerCase()] ?? p.slice(0, 2).toUpperCase());

  // Method label for contacted cards
  const methodLabel = CONTACT_METHODS.find(m => m.id === entry.contact_method)?.label;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-xl cursor-grab active:cursor-grabbing select-none"
      style={{
        background: isDragging ? "oklch(0.22 0 0)" : C.raised,
        border: `1px solid ${isDragging ? C.borderNormal : C.borderSubtle}`,
        opacity: isDragging ? 0.55 : 1,
        transform: isDragging ? "rotate(1.5deg) scale(1.02)" : undefined,
        transition: "opacity 120ms, transform 120ms",
        boxShadow: isDragging ? "0 8px 24px oklch(0 0 0 / 60%)" : undefined,
      }}
    >
      {/* Card body */}
      <div className="p-3">
        {/* Top row — avatar + name + score + priority */}
        <div className="flex items-start gap-2.5 mb-2">
          {cp.profile_image_url ? (
            <img
              src={cp.profile_image_url}
              alt={name}
              className="h-8 w-8 rounded-xl object-cover shrink-0 img-fade"
              onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
            />
          ) : (
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{ background: avatarBg(name), color: "oklch(0.065 0 0)" }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link
              to="/creators/$creatorId"
              params={{ creatorId: cp.id }}
              className="font-medium text-[12px] leading-tight truncate block hover:underline"
              style={{ color: C.textPrimary }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="flex items-center gap-1">
                {name}
                {cp.is_verified && <VerifiedBadge type="creator" size="xs" />}
              </span>
            </Link>
            {cp.niche && (
              <div className="text-[10px] truncate mt-0.5" style={{ color: C.textTertiary }}>
                {cp.niche}
              </div>
            )}
          </div>

          {/* Match score badge */}
          {matchScore !== undefined && (
            <div
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums"
              style={{ background: scoreBg(matchScore), color: scoreColor(matchScore) }}
            >
              {matchScore}
            </div>
          )}
        </div>

        {/* Platform chips */}
        {platformChips.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {platformChips.map((chip) => (
              <span
                key={chip}
                className="text-[8.5px] font-semibold tracking-wider px-1.5 py-0.5 rounded-md uppercase"
                style={{ background: "oklch(1 0 0 / 6%)", color: C.textMuted, border: `1px solid ${C.borderSubtle}` }}
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 mb-2">
          {cp.follower_count != null && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}>
              <Users className="h-2.5 w-2.5" />
              {formatFollowers(cp.follower_count)}
            </div>
          )}
          {cp.location && (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}>
              <MapPin className="h-2.5 w-2.5" />
              {cp.location}
            </div>
          )}
          {(cp.avg_rating ?? 0) > 0 && (cp.review_count ?? 0) > 0 && (
            <RatingsDisplay avgRating={cp.avg_rating} reviewCount={cp.review_count} />
          )}
        </div>

        {/* Project tag */}
        {entry.projects && (
          <div
            className="inline-flex items-center gap-1 text-[9px] rounded-full px-2 py-0.5 mb-2"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)", color: C.textMuted }}
          >
            <Briefcase className="h-2 w-2" />
            {entry.projects.name}
          </div>
        )}

        {/* Contact method — for contacted cards */}
        {entry.status === "contacted" && !entry.contact_method && (
          <div className="mb-2">
            <div className="text-[9px] mb-1" style={{ color: C.textMuted }}>How did you reach out?</div>
            <div className="flex flex-wrap gap-1">
              {CONTACT_METHODS.slice(0, 3).map((m) => (
                <button
                  key={m.id}
                  onClick={(e) => { e.stopPropagation(); onUpdateContactMethod(entry.id, m.id); }}
                  className="text-[8.5px] px-2 py-0.5 rounded-md transition-colors"
                  style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary, fontFamily: "inherit" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
                >
                  {m.label}
                </button>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateContactMethod(entry.id, "other"); }}
                className="text-[8.5px] px-2 py-0.5 rounded-md transition-colors"
                style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary, fontFamily: "inherit" }}
              >
                Other
              </button>
            </div>
          </div>
        )}

        {entry.status === "contacted" && entry.contact_method && methodLabel && (
          <div
            className="flex items-center gap-1 text-[9px] rounded-full px-2 py-0.5 mb-2 w-fit"
            style={{ background: C.greenMuted, border: `1px solid ${C.greenBorder}`, color: C.green }}
          >
            <Check className="h-2 w-2" />
            {methodLabel}
          </div>
        )}

        {/* Note preview */}
        {!notesOpen && entry.internal_note && (
          <div
            className="text-[9.5px] leading-relaxed mb-2 cursor-pointer line-clamp-2"
            style={{ color: C.textTertiary, fontStyle: "italic" }}
            onClick={() => setNotesOpen(true)}
          >
            "{entry.internal_note}"
          </div>
        )}

        {/* Action row — move + priority + tools */}
        <div className="flex items-center gap-1">
          {/* Back */}
          {stageIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(entry.id, STAGES[stageIdx - 1].id); }}
              className="h-6 px-2 rounded-lg text-[8.5px] uppercase tracking-[0.16em] font-medium btn-interactive"
              style={{ background: "oklch(1 0 0 / 5%)", color: C.textMuted, border: "1px solid oklch(1 0 0 / 8%)", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
            >
              ← Back
            </button>
          )}

          {/* Next */}
          {stageIdx < STAGES.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveStage(entry.id, STAGES[stageIdx + 1].id); }}
              className="flex-1 h-6 rounded-lg text-[8.5px] uppercase tracking-[0.16em] font-medium btn-interactive"
              style={{ background: "oklch(1 0 0 / 10%)", color: "oklch(0.84 0 0)", border: "1px solid oklch(1 0 0 / 20%)", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 18%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
            >
              Next →
            </button>
          )}

          {/* AI Outreach */}
          {onOutreach && ["discovered", "saved", "contacted"].includes(entry.status) && (
            <button
              title="Generate AI outreach message"
              onClick={(e) => { e.stopPropagation(); onOutreach(entry); }}
              className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: C.accentMuted, border: `1px solid ${C.aiBlueBorder}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.10 224 / 22%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.accentMuted; }}
            >
              <Sparkles className="h-2.5 w-2.5" style={{ color: C.aiBlue }} />
            </button>
          )}

          {/* Review button — completed entries with a campaign */}
          {entry.status === "completed" && entry.campaign_id && onReview && (
            hasReviewed ? (
              <span
                className="flex-1 h-6 rounded-lg text-[8.5px] uppercase tracking-[0.16em] font-medium flex items-center justify-center gap-1"
                style={{ background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.84 0 0)" }}
              >
                ★ Reviewed
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onReview(entry); }}
                className="flex-1 h-6 rounded-lg text-[8.5px] uppercase tracking-[0.16em] font-medium transition-colors duration-100"
                style={{ background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.84 0 0)", fontFamily: "inherit" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
              >
                ★ Rate
              </button>
            )
          )}

          {/* Priority cycle */}
          <button
            title={`Priority: ${priorityLabel(entry.priority)} — click to change`}
            onClick={(e) => { e.stopPropagation(); onUpdatePriority(entry.id, nextPriority(entry.priority)); }}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <Star
              className="h-3 w-3"
              style={{
                color: priorityColor(entry.priority),
                fill: entry.priority ? priorityColor(entry.priority) : "transparent",
              }}
            />
          </button>

          {/* Notes toggle */}
          <button
            title="Notes"
            onClick={(e) => { e.stopPropagation(); setNotesOpen((o) => !o); setNotesDraft(entry.internal_note ?? ""); }}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: notesOpen ? "oklch(1 0 0 / 14%)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${notesOpen ? "oklch(1 0 0 / 30%)" : "oklch(1 0 0 / 8%)"}`,
            }}
          >
            <Pencil className="h-2.5 w-2.5" style={{ color: notesOpen ? C.accent : C.textMuted }} />
          </button>

          {/* View profile */}
          <Link
            to="/creators/$creatorId"
            params={{ creatorId: cp.id }}
            onClick={(e) => e.stopPropagation()}
            title="View profile"
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <ExternalLink className="h-2.5 w-2.5" style={{ color: C.textMuted }} />
          </Link>

          {/* Remove */}
          <button
            title={confirmRemove ? "Click again to confirm" : "Remove from pipeline"}
            onClick={(e) => { e.stopPropagation(); handleRemoveClick(); }}
            className="h-6 w-6 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: confirmRemove ? "oklch(0.52 0.15 24 / 20%)" : "oklch(1 0 0 / 5%)",
              border: `1px solid ${confirmRemove ? "oklch(0.52 0.15 24 / 30%)" : "oklch(1 0 0 / 8%)"}`,
              fontFamily: "inherit",
            }}
          >
            <X className="h-2.5 w-2.5" style={{ color: confirmRemove ? "oklch(0.52 0.15 24)" : C.textMuted }} />
          </button>
        </div>
      </div>

      {/* Inline notes editor */}
      {notesOpen && (
        <div
          className="px-3 pb-3 pt-0"
          style={{ borderTop: `1px solid ${C.borderSubtle}` }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add internal notes about this creator…"
            rows={3}
            className="w-full resize-none rounded-lg px-2.5 py-2 text-[11px] leading-relaxed outline-none mt-2.5"
            style={{
              background: "oklch(1 0 0 / 4%)",
              border: `1px solid ${C.borderNormal}`,
              color: C.textSecondary,
              fontFamily: "inherit",
            }}
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={saveNote}
              disabled={notesSaving}
              className="flex-1 h-6 rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-colors"
              style={{
                background: "oklch(1 0 0 / 16%)",
                border: "1px solid oklch(1 0 0 / 25%)",
                color: C.accent,
                fontFamily: "inherit",
              }}
            >
              {notesSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setNotesOpen(false); setNotesDraft(entry.internal_note ?? ""); }}
              className="h-6 px-3 rounded-lg text-[9px] uppercase tracking-widest transition-colors"
              style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)", color: C.textMuted, fontFamily: "inherit" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  entries,
  draggedId,
  dragOverStage,
  scores,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveStage,
  onUpdateNote,
  onUpdatePriority,
  onUpdateContactMethod,
  onRemove,
  reviewedCampaignIds,
  onReview,
}: {
  stage: (typeof STAGES)[number];
  entries: PipelineEntry[];
  draggedId: string | null;
  dragOverStage: Stage | null;
  scores: Map<string, number>;
  onDragStart: (id: string) => void;
  onDragOver: (stage: Stage) => void;
  onDragLeave: () => void;
  onDrop: (stage: Stage) => void;
  onMoveStage: (id: string, stage: Stage) => void;
  onUpdateNote: (id: string, note: string) => void;
  reviewedCampaignIds?: Set<string>;
  onReview?: (entry: PipelineEntry) => void;
  onOutreach?: (entry: PipelineEntry) => void;
  onUpdatePriority: (id: string, priority: "high" | "medium" | "low" | null) => void;
  onUpdateContactMethod: (id: string, method: string) => void;
  onRemove: (id: string) => void;
}) {
  const isOver = dragOverStage === stage.id && draggedId !== null;
  const draggedEntry = entries.find((e) => e.id === draggedId);
  const alreadyHere = draggedEntry?.status === stage.id;

  return (
    <div
      className="flex flex-col rounded-2xl shrink-0"
      style={{
        width: 258,
        background: isOver && !alreadyHere ? stage.color : C.surface,
        border: `1px solid ${isOver && !alreadyHere ? "oklch(1 0 0 / 18%)" : C.borderSubtle}`,
        transition: "background 120ms, border-color 120ms",
      }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(stage.id); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(stage.id)}
    >
      {/* Column header */}
      <div
        className="px-3.5 py-3 flex items-center gap-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        <div className="h-2 w-2 rounded-full shrink-0" style={{ background: stage.dotColor }} />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em]" style={{ color: C.textTertiary }}>
          {stage.label}
        </span>
        <span
          className="ml-auto text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center"
          style={{ background: "oklch(1 0 0 / 6%)", color: C.textMuted }}
        >
          {entries.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-[120px]">
        {entries.map((entry) => (
          <CreatorCard
            key={entry.id}
            entry={entry}
            isDragging={entry.id === draggedId}
            matchScore={scores.get(entry.id)}
            onDragStart={() => onDragStart(entry.id)}
            onMoveStage={onMoveStage}
            onUpdateNote={onUpdateNote}
            onUpdatePriority={onUpdatePriority}
            onUpdateContactMethod={onUpdateContactMethod}
            onRemove={onRemove}
            hasReviewed={entry.campaign_id ? reviewedCampaignIds?.has(entry.campaign_id) : false}
            onReview={onReview}
            onOutreach={onOutreach}
          />
        ))}

        {isOver && !alreadyHere && (
          <div
            className="h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-[11px]"
            style={{ borderColor: "oklch(1 0 0 / 25%)", color: C.textMuted }}
          >
            Drop here
          </div>
        )}

        {entries.length === 0 && !isOver && (
          <div className="h-20 flex items-center justify-center">
            <span className="text-[10px]" style={{ color: C.textMuted }}>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PipelinePage() {
  const { user } = useAuth();
  const [entries,        setEntries]        = useState<PipelineEntry[]>([]);
  const [projects,       setProjects]       = useState<Project[]>([]);
  const [filterProject,  setFilterProject]  = useState<string>("all");
  const [loading,        setLoading]        = useState(true);
  const [draggedId,      setDraggedId]      = useState<string | null>(null);
  const [dragOverStage,  setDragOverStage]  = useState<Stage | null>(null);
  const [activeCampaign,      setActiveCampaign]      = useState<CampaignInput | null>(null);
  const [reviewedCampaignIds, setReviewedCampaignIds] = useState<Set<string>>(new Set());
  const [reviewEntry,         setReviewEntry]         = useState<PipelineEntry | null>(null);
  const [outreachEntry,       setOutreachEntry]       = useState<PipelineEntry | null>(null);
  const [displayName,         setDisplayName]         = useState("");
  const [mobileStage,         setMobileStage]         = useState<Stage>("discovered");
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
    loadActiveCampaign();
    (supabase as any).from("profiles").select("name").eq("id", user.id).single()
      .then(({ data }: { data: { name?: string } | null }) => {
        setDisplayName(data?.name ?? user.email?.split("@")[0] ?? "Your Brand");
      });
  }, [user]);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("project_saved_creators")
      .select(`
        id, project_id, status, estimated_rate, priority, internal_note,
        contacted_at, booked_at, completed_at, contact_method, campaign_id,
        created_at,
        creator_profiles (
          id, user_id, display_name, username, niche, categories, platforms,
          profile_image_url, location, location_city, location_country,
          follower_count, audience_location, primary_language,
          accepts_paid, accepts_gifted, accepts_affiliate, preferred_content_types,
          is_verified, avg_rating, review_count
        ),
        projects ( id, name )
      `)
      .eq("saved_by", user!.id)
      .not("status", "eq", "rejected")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Pipeline] load error:", error);
      toast.error("Failed to load pipeline");
    } else {
      const rows = (data ?? []) as PipelineEntry[];
      setEntries(rows);
      const seen = new Map<string, Project>();
      for (const r of rows) {
        if (r.projects) seen.set(r.projects.id, r.projects);
      }
      setProjects(Array.from(seen.values()));

      // Load already-submitted reviews for completed entries
      const campaignIds = rows
        .filter((r) => r.status === "completed" && r.campaign_id)
        .map((r) => r.campaign_id as string);
      if (campaignIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: reviewData } = await (supabase as any)
          .from("reviews")
          .select("campaign_id")
          .eq("reviewer_id", user!.id)
          .in("campaign_id", campaignIds);
        const ids = new Set<string>((reviewData ?? []).map((r: { campaign_id: string }) => r.campaign_id));
        setReviewedCampaignIds(ids);
      }
    }
    setLoading(false);
  }

  async function loadActiveCampaign() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("campaigns")
      .select("title,description,budget_range,required_platforms,required_niches,business_industry,required_country,required_language,min_followers,compensation_type")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setActiveCampaign(data as CampaignInput);
  }

  // Match scores — one per entry, computed client-side
  const scores = useMemo<Map<string, number>>(() => {
    if (!activeCampaign) return new Map();
    const map = new Map<string, number>();
    for (const entry of entries) {
      const cp = entry.creator_profiles;
      if (!cp) continue;
      const creatorInput: CreatorInput = {
        platforms:              cp.platforms ?? [],
        niche:                  cp.niche,
        categories:             cp.categories ?? [],
        audience_location:      cp.audience_location,
        location:               cp.location,
        location_city:          cp.location_city,
        location_country:       cp.location_country,
        follower_count:         cp.follower_count,
        primary_language:       cp.primary_language,
        accepts_paid:           cp.accepts_paid ?? false,
        accepts_gifted:         cp.accepts_gifted ?? false,
        accepts_affiliate:      cp.accepts_affiliate ?? false,
        preferred_content_types: cp.preferred_content_types ?? [],
      };
      map.set(entry.id, computeMatchScore(creatorInput, activeCampaign).total);
    }
    return map;
  }, [entries, activeCampaign]);

  // ── Stage transitions ───────────────────────────────────────────────────────

  const moveCreator = useCallback(
    async (entryId: string, newStage: Stage) => {
      const prev = entries.find((e) => e.id === entryId);
      if (!prev || prev.status === newStage) return;

      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { status: newStage, updated_at: now };
      if (newStage === "contacted"   && !prev.contacted_at)  updates.contacted_at  = now;
      if (newStage === "booked"      && !prev.booked_at)     updates.booked_at     = now;
      if (newStage === "completed"   && !prev.completed_at)  updates.completed_at  = now;

      setEntries((es) => es.map((e) => e.id === entryId ? { ...e, status: newStage, ...updates } : e));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_saved_creators")
        .update(updates)
        .eq("id", entryId);

      if (error) {
        setEntries((es) => es.map((e) => e.id === entryId ? { ...e, status: prev.status } : e));
        toast.error("Failed to move creator");
      } else if (user) {
        trackMarketplaceEvent({
          actorUserId: user.id,
          eventType: "pipeline_updates",
          creatorId: prev.creator_profiles?.user_id,
          metadata: { from_stage: prev.status, to_stage: newStage, entry_id: entryId },
        });
        // Notify the creator when their status changes
        const creatorUserId = prev.creator_profiles?.user_id;
        const creatorName   = prev.creator_profiles?.display_name ?? "Creator";
        const notifMap: Partial<Record<Stage, { title: string; body: string; link: string }>> = {
          saved:       { title: "A brand saved your profile",            body: "A brand added you to their shortlist. Keep your profile updated.",                   link: "/opportunities" },
          contacted:   { title: "A brand has reached out to you",        body: "You've been contacted about a potential collaboration. Check your opportunities.",    link: "/opportunities" },
          negotiating: { title: "A brand wants to work with you",        body: "You've entered the negotiation stage. Respond promptly to close the deal.",           link: "/opportunities" },
          booked:      { title: "You've been booked",                    body: "Congratulations — you've been selected for a campaign. Check your opportunities.",    link: "/opportunities" },
          completed:   { title: "Campaign completed",                    body: "Your campaign has been marked as completed. Leave a review to build your trust score.", link: "/opportunities" },
          rejected:    { title: "Update on your application",            body: "A brand has updated their decision. More opportunities are available.",                link: "/opportunities" },
        };
        const notif = notifMap[newStage];
        if (notif && creatorUserId && creatorUserId !== user.id) {
          createNotification({ userId: creatorUserId, type: "pipeline_moved", ...notif }).catch(() => {});
        }
      }
    },
    [entries, user],
  );

  // ── Notes update ────────────────────────────────────────────────────────────

  const updateNote = useCallback(async (entryId: string, note: string) => {
    setEntries((es) => es.map((e) => e.id === entryId ? { ...e, internal_note: note || null } : e));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("project_saved_creators")
      .update({ internal_note: note || null, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (error) toast.error("Failed to save note");
  }, []);

  // ── Priority update ─────────────────────────────────────────────────────────

  const updatePriority = useCallback(async (entryId: string, priority: "high" | "medium" | "low" | null) => {
    setEntries((es) => es.map((e) => e.id === entryId ? { ...e, priority } : e));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("project_saved_creators")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (error) toast.error("Failed to update priority");
  }, []);

  // ── Contact method update ───────────────────────────────────────────────────

  const updateContactMethod = useCallback(async (entryId: string, method: string) => {
    const now = new Date().toISOString();
    setEntries((es) => es.map((e) => e.id === entryId ? { ...e, contact_method: method, contacted_at: e.contacted_at ?? now } : e));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("project_saved_creators")
      .update({ contact_method: method, contacted_at: now, updated_at: now })
      .eq("id", entryId);
    if (error) toast.error("Failed to save contact method");
  }, []);

  // ── Remove entry ────────────────────────────────────────────────────────────

  const removeEntry = useCallback(async (entryId: string) => {
    setEntries((es) => es.filter((e) => e.id !== entryId));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("project_saved_creators")
      .delete()
      .eq("id", entryId);
    if (error) {
      toast.error("Failed to remove creator");
      load(); // re-sync
    } else {
      toast.success("Creator removed from pipeline");
    }
  }, []);

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  function handleDragStart(id: string) { setDraggedId(id); }

  function handleDragOver(stage: Stage) {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setDragOverStage(stage);
  }

  function handleDragLeave() {
    dragLeaveTimer.current = setTimeout(() => setDragOverStage(null), 60);
  }

  function handleDrop(stage: Stage) {
    setDragOverStage(null);
    if (draggedId) moveCreator(draggedId, stage);
    setDraggedId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverStage(null);
  }

  const visible = filterProject === "all"
    ? entries
    : entries.filter((e) => e.project_id === filterProject);

  const grouped = Object.fromEntries(
    STAGES.map((s) => [s.id, visible.filter((e) => e.status === s.id)])
  ) as Record<Stage, PipelineEntry[]>;

  // Pipeline summary counts
  const totalBooked    = entries.filter(e => e.status === "booked").length;
  const totalContacted = entries.filter(e => e.status === "contacted").length;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: C.canvas }}
      onDragEnd={handleDragEnd}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-6 py-4 flex items-center justify-between gap-4"
        style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        <div>
          <h1 className="font-display text-[17px] font-semibold tracking-tight" style={{ color: C.textPrimary }}>
            Creator Pipeline
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: C.textTertiary }}>
            {entries.length} creator{entries.length !== 1 ? "s" : ""} tracked
            {totalContacted > 0 && <> · <span style={{ color: C.aiBlue }}>{totalContacted} contacted</span></>}
            {totalBooked    > 0 && <> · <span style={{ color: C.green }}>{totalBooked} booked</span></>}
            {activeCampaign   && <> · <span style={{ color: C.accent }}>Match scores on</span></>}
          </p>
        </div>

        {/* Project filter */}
        {projects.length > 1 && (
          <div className="relative">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="appearance-none pl-3 pr-8 h-8 rounded-xl text-[12px] font-medium cursor-pointer outline-none"
              style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: C.textMuted }} />
          </div>
        )}
      </div>

      {/* ── Empty / Loading state (shared) ─────────────────────── */}
      {loading && (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-6 h-full" style={{ minWidth: "max-content" }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="flex-shrink-0 w-[258px] flex flex-col rounded-2xl overflow-hidden"
                style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}
              >
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 6 }} />
                  <div className="skeleton ml-auto" style={{ height: 18, width: 24, borderRadius: 99 }} />
                </div>
                <div className="p-3 space-y-2 flex-1">
                  {[1, 2].map(j => (
                    <div key={j} className="rounded-xl p-3 space-y-2" style={{ background: C.raised, border: `1px solid ${C.borderSubtle}` }}>
                      <div className="flex items-center gap-2">
                        <div className="skeleton h-8 w-8 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="skeleton" style={{ height: 12, width: "70%" }} />
                          <div className="skeleton" style={{ height: 10, width: "50%" }} />
                        </div>
                      </div>
                      <div className="skeleton" style={{ height: 10, width: "60%" }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center"
            style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}
          >
            <Briefcase className="h-6 w-6" style={{ color: C.textMuted }} />
          </div>
          <div>
            <p className="font-medium text-[14px]" style={{ color: C.textSecondary }}>No creators in pipeline</p>
            <p className="text-[12px] mt-1" style={{ color: C.textMuted }}>
              Save creators from{" "}
              <Link to="/find-creators" className="underline" style={{ color: C.textTertiary }}>
                Find Creators
              </Link>{" "}
              or the{" "}
              <Link to="/globe" className="underline" style={{ color: C.textTertiary }}>
                Globe
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <>
          {/* ── Mobile: stage-grouped vertical list ─────────────── */}
          <div className="flex flex-col overflow-hidden md:hidden flex-1">
            {/* Stage tabs */}
            <div
              className="flex gap-1.5 px-4 py-3 overflow-x-auto shrink-0"
              style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
            >
              {STAGES.map((stage) => {
                const count   = grouped[stage.id].length;
                const isActive = mobileStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setMobileStage(stage.id)}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-full shrink-0 text-[11px] font-medium transition-all duration-100"
                    style={{
                      background: isActive ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                      border:     `1px solid ${isActive ? "oklch(1 0 0 / 22%)" : C.borderSubtle}`,
                      color:      isActive ? C.textPrimary : C.textTertiary,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: stage.dotColor }}
                    />
                    {stage.label}
                    {count > 0 && (
                      <span
                        className="ml-0.5 rounded-full px-1.5 h-4 flex items-center justify-center text-[9px] font-bold"
                        style={{ background: "oklch(1 0 0 / 10%)", color: C.textMuted }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Creator list for selected stage */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
              {grouped[mobileStage].length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-[12px]" style={{ color: C.textMuted }}>No creators in this stage</p>
                </div>
              ) : (
                grouped[mobileStage].map((entry) => (
                  <CreatorCard
                    key={entry.id}
                    entry={entry}
                    isDragging={false}
                    matchScore={scores.get(entry.id)}
                    onDragStart={() => {}}
                    onMoveStage={moveCreator}
                    onUpdateNote={updateNote}
                    onUpdatePriority={updatePriority}
                    onUpdateContactMethod={updateContactMethod}
                    onRemove={removeEntry}
                    hasReviewed={entry.campaign_id ? reviewedCampaignIds.has(entry.campaign_id) : false}
                    onReview={(e) => setReviewEntry(e)}
                    onOutreach={(e) => setOutreachEntry(e)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Desktop: Kanban board ────────────────────────────── */}
          <div className="hidden md:flex flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 p-5 h-full" style={{ minWidth: STAGES.length * 274 }}>
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  entries={grouped[stage.id]}
                  draggedId={draggedId}
                  dragOverStage={dragOverStage}
                  scores={scores}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onMoveStage={moveCreator}
                  onUpdateNote={updateNote}
                  onUpdatePriority={updatePriority}
                  onUpdateContactMethod={updateContactMethod}
                  onRemove={removeEntry}
                  reviewedCampaignIds={reviewedCampaignIds}
                  onReview={(entry) => setReviewEntry(entry)}
                  onOutreach={(entry) => setOutreachEntry(entry)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* AI Outreach modal */}
      {outreachEntry && outreachEntry.creator_profiles && (
        <OutreachModal
          entry={outreachEntry}
          campaign={activeCampaign ? {
            title:       (activeCampaign as any).title ?? "Partnership Opportunity",
            description: (activeCampaign as any).description ?? "",
            budget:      (activeCampaign as any).budget_range ?? "TBD",
            platforms:   (activeCampaign as any).required_platforms ?? [],
          } : null}
          businessName={displayName}
          onClose={() => setOutreachEntry(null)}
        />
      )}

      {/* Review modal */}
      {reviewEntry && reviewEntry.creator_profiles && reviewEntry.campaign_id && (
        <ReviewModal
          open={true}
          onClose={() => setReviewEntry(null)}
          type="business_reviews_creator"
          campaignId={reviewEntry.campaign_id}
          reviewedUserId={reviewEntry.creator_profiles.user_id}
          reviewedName={reviewEntry.creator_profiles.display_name}
          reviewerId={user!.id}
          onSuccess={() => {
            // Mark this campaign as reviewed locally
            if (reviewEntry.campaign_id) {
              setReviewedCampaignIds((prev) => new Set([...prev, reviewEntry.campaign_id!]));
            }
            setReviewEntry(null);
          }}
        />
      )}
    </div>
  );
}
