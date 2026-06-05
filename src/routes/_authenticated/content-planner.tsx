// ─────────────────────────────────────────────────────────────────────────────
// MRKT Content Planner — AI-powered content calendar
//
// Available to both Creators and Businesses.
// Monthly / Weekly / Daily calendar views.
// AI generates weekly/monthly plans based on role, platforms, niche.
// Items stored in content_planner_items Supabase table.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth.tsx";
import { toast } from "sonner";
import {
  CalendarDays, ChevronLeft, ChevronRight, Sparkles, Plus, X,
  Instagram, Youtube, Linkedin, Twitter, Facebook,
  Clock, CheckCircle2, FileEdit, Trash2, Loader2, Zap,
  RefreshCw, AlignLeft, Lightbulb,
} from "lucide-react";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/content-planner")({
  head: () => ({ meta: [{ title: "Content Planner — MRKT" }] }),
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
  caption: string | null;
  creative_direction: string | null;
  notes: string | null;
  ai_generated: boolean;
};

type UserProfile = {
  name: string | null;
  account_type: string | null;
  onboarding_path: string | null;
  niche: string | null;
  platforms: string[] | null;
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  canvas:         "#000",
  base:           "oklch(0.075 0 0)",
  surface:        "oklch(0.11 0 0)",
  raised:         "oklch(0.15 0 0)",
  high:           "oklch(0.19 0 0)",
  borderSubtle:   "oklch(1 0 0 / 9%)",
  borderNormal:   "oklch(1 0 0 / 13%)",
  borderStrong:   "oklch(1 0 0 / 22%)",
  shadowCard:     "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  shadowPanel:    "inset 0 1px 0 oklch(1 0 0 / 8%), 0 8px 40px oklch(0 0 0 / 70%), 0 2px 8px oklch(0 0 0 / 50%)",
  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",
  chrome:         "oklch(0.82 0.005 250)",
  accent:         "oklch(0.72 0.14 152)",
} as const;

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "Instagram",  label: "Instagram",  icon: Instagram,   color: "#E1306C" },
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
  planned:  { label: "Planned",  color: "oklch(0.78 0.12 60)",   icon: Clock         },
  drafted:  { label: "Drafted",  color: "oklch(0.66 0.09 250)",  icon: FileEdit      },
  posted:   { label: "Posted",   color: "oklch(0.72 0.14 152)",  icon: CheckCircle2  },
};

// ── AI content generator ───────────────────────────────────────────────────────
// Generates a realistic content plan without needing a live AI call.
// Replace this with a Supabase function call for real AI integration.

function generateAIPlan(
  userRole: "creator" | "business",
  platforms: string[],
  niche: string,
  startDate: Date,
  weeks: 1 | 4
): Omit<ContentItem, "id" | "user_id">[] {
  const items: Omit<ContentItem, "id" | "user_id">[] = [];
  const days = weeks * 7;
  const activePlatforms = platforms.length > 0 ? platforms : ["Instagram", "TikTok"];
  const contentTypes = userRole === "creator" ? CONTENT_TYPES_CREATOR : CONTENT_TYPES_BUSINESS;

  const creatorTemplates = [
    { hook: `POV: You finally tried ${niche} for the first time`, type: "Reel", time: "11:00", direction: "Trending audio, fast cuts, text overlay on key moments. Show authentic reaction." },
    { hook: `3 things no one tells you about ${niche}`, type: "Educational", time: "09:30", direction: "Talking head format. Use text overlays for each point. End with strong CTA." },
    { hook: `The ${niche} hack that changed everything for me`, type: "TikTok", time: "20:00", direction: "Hook in first 2 seconds. Demo the hack visually. Trending sound." },
    { hook: `Day in my life as a ${niche} creator`, type: "Vlog", time: "18:00", direction: "Cinematic transitions. Show behind-the-scenes authentically. 60-90 seconds." },
    { hook: `Honest review: best ${niche} products of 2026`, type: "Review", time: "12:00", direction: "Side-by-side comparisons. Use B-roll. Include pros and cons. Clear verdict." },
    { hook: `I tested 5 ${niche} trends — here's what actually works`, type: "Trend", time: "16:00", direction: "Quick cuts between each trend. React honestly. Trending audio if possible." },
    { hook: `Things ${niche} fans understand 🫶`, type: "Story", time: "08:00", direction: "Poll stickers, question boxes. Drive engagement. 5-7 story frames." },
    { hook: `${niche} tutorial for beginners (no experience needed)`, type: "Educational", time: "14:00", direction: "Step-by-step. Use screen recording or demo. Caption every step." },
  ];

  const businessTemplates = [
    { hook: `Introducing: the ${niche} solution you've been waiting for`, type: "Product Post", time: "10:00", direction: "Clean product hero shot. Lifestyle context. Bold benefit-led copy." },
    { hook: `Why our customers choose us for ${niche}`, type: "Brand Story", time: "09:00", direction: "Customer testimonial format. Real voice, authentic feel. 30-45 seconds." },
    { hook: `Limited time: our biggest ${niche} offer of the season`, type: "Promo", time: "12:00", direction: "Urgency design. Bold typography. Clear CTA button. Countdown if possible." },
    { hook: `Behind the scenes: how we create ${niche} experiences`, type: "Campaign", time: "15:00", direction: "Documentary-style. Show team & process. Build brand trust." },
    { hook: `Announcing: new ${niche} features you asked for`, type: "Announcement", time: "11:00", direction: "Build anticipation. Teaser format. Strong reveal moment." },
    { hook: `${niche} inspiration for this season`, type: "Seasonal", time: "08:00", direction: "Mood board aesthetic. Curated visuals. Aspirational tone." },
    { hook: `Meet the creators behind our ${niche} campaign`, type: "Collaboration", time: "17:00", direction: "Creator spotlight. Show partnership authentically. Tag creators." },
    { hook: `The results speak for themselves: ${niche} by the numbers`, type: "Brand Story", time: "14:00", direction: "Data visualization. Clean infographic style. Share proof points." },
  ];

  const templates = userRole === "creator" ? creatorTemplates : businessTemplates;

  for (let day = 0; day < days; day++) {
    // Post 1-2 items per day, not every day
    if (day % 2 !== 0 && day % 3 !== 0) continue;

    const itemDate = new Date(startDate);
    itemDate.setDate(itemDate.getDate() + day);

    const platform  = activePlatforms[day % activePlatforms.length];
    const template  = templates[day % templates.length];
    const ct        = contentTypes[day % contentTypes.length];

    items.push({
      title:             template.hook.slice(0, 60),
      platform,
      content_type:      template.type || ct,
      scheduled_date:    itemDate.toISOString().split("T")[0],
      scheduled_time:    template.time,
      status:            "planned",
      hook:              template.hook,
      caption:           `${template.hook} ✨\n\n${niche ? `#${niche.replace(/\s+/g, "")} ` : ""}#MRKT #content #${platform.toLowerCase()}`,
      creative_direction: template.direction,
      notes:             null,
      ai_generated:      true,
    });
  }

  return items;
}

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(item);

  useEffect(() => {
    setDraft(item);
    setEditing(false);
  }, [item.id]);

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  const platform = PLATFORMS.find((p) => p.id === item.platform);
  const status   = STATUS_CONFIG[item.status];
  const StatusIcon = status.icon;

  return (
    <div
      className="w-[300px] flex-none flex flex-col overflow-hidden"
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
              <textarea
                rows={2}
                className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.hook ?? ""}
                onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
              />
            ) : (
              <p className="text-[12px] leading-relaxed" style={{ color: C.textSecondary }}>{item.hook}</p>
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
              <textarea
                rows={4}
                className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.caption ?? ""}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              />
            ) : (
              <p className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: C.textTertiary }}>{item.caption}</p>
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
              <textarea
                rows={3}
                className="w-full text-[12px] bg-transparent outline-none resize-none"
                style={{ color: C.textSecondary, border: `1px solid ${C.borderNormal}`, borderRadius: 8, padding: "6px 10px" }}
                value={draft.creative_direction ?? ""}
                onChange={(e) => setDraft({ ...draft, creative_direction: e.target.value })}
              />
            ) : (
              <p className="text-[12px] leading-relaxed" style={{ color: C.textTertiary }}>{item.creative_direction}</p>
            )}
          </div>
        )}

        {item.ai_generated && (
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-2"
            style={{ background: "oklch(0.72 0.14 152 / 8%)", border: "1px solid oklch(0.72 0.14 152 / 18%)" }}>
            <Sparkles className="h-3 w-3" style={{ color: C.accent }} />
            <span className="text-[10px]" style={{ color: C.accent }}>AI generated</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-2 flex gap-2 shrink-0" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
        {editing ? (
          <>
            <button
              onClick={handleSave}
              className="flex-1 h-8 rounded-full text-[11.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 10%)", border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
            >
              Save
            </button>
            <button
              onClick={() => { setDraft(item); setEditing(false); }}
              className="h-8 px-3 rounded-full text-[11.5px] transition-all duration-100"
              style={{ color: C.textTertiary }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="flex-1 h-8 rounded-full text-[11.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}
            >
              <FileEdit className="h-3 w-3 inline mr-1.5" />Edit
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-100"
              style={{ color: "oklch(0.65 0.18 25 / 60%)", border: `1px solid oklch(0.65 0.18 25 / 12%)` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.18 25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.65 0.18 25 / 60%)"; }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
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
      caption:            form.caption || null,
      creative_direction: form.creative_direction || null,
      notes:              null,
      ai_generated:       false,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "oklch(0 0 0 / 75%)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
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
    <div className="flex-1 overflow-auto">
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
    <div className="flex-1 overflow-auto flex">
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
              style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: isToday ? "oklch(0.72 0.14 152 / 6%)" : "transparent" }}
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
    <div className="flex-1 overflow-auto px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-[20px] font-bold"
            style={{ background: isToday ? "oklch(0.72 0.14 152 / 15%)" : "oklch(1 0 0 / 6%)", color: isToday ? C.accent : C.textSecondary }}
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

// ── Main page ─────────────────────────────────────────────────────────────────

function ContentPlannerPage() {
  const { user } = useAuth();

  const [items,          setItems]         = useState<ContentItem[]>([]);
  const [loading,        setLoading]       = useState(true);
  const [generating,     setGenerating]    = useState(false);
  const [view,           setView]          = useState<CalendarView>("monthly");
  const [currentDate,    setCurrentDate]   = useState(new Date());
  const [selectedItem,   setSelectedItem]  = useState<ContentItem | null>(null);
  const [showAddModal,   setShowAddModal]  = useState(false);
  const [addModalDate,   setAddModalDate]  = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [userProfile,    setUserProfile]   = useState<UserProfile | null>(null);

  const userRole: "creator" | "business" = (() => {
    if (!userProfile) return "creator";
    const p = userProfile;
    const isBiz = p.account_type === "brand" || p.account_type === "business" ||
      p.onboarding_path === "business_creator" || p.onboarding_path === "business_marketing";
    return isBiz ? "business" : "creator";
  })();

  // Load user profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name,account_type,onboarding_path,niche,platforms")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setUserProfile(data as UserProfile ?? null));
  }, [user]);

  // Load planner items
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("content_planner_items")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_date", { ascending: true })
      .then(({ data }: { data: ContentItem[] | null }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, [user]);

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
    const { data, error } = await (supabase as any)
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
    const { error } = await (supabase as any)
      .from("content_planner_items")
      .update(updated)
      .eq("id", updated.id);
    if (error) { toast.error("Failed to save."); return; }
    setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
  }

  async function deleteItem(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("content_planner_items").delete().eq("id", id);
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

  async function generatePlan(weeks: 1 | 4) {
    if (!user) return;
    setGenerating(true);

    try {
      const platforms = userProfile?.platforms ?? ["Instagram", "TikTok"];
      const niche     = userProfile?.niche ?? "content creation";

      // Start from the beginning of the current week/month
      const startDate = view === "monthly"
        ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        : weekStart();

      const generated = generateAIPlan(userRole, platforms, niche, startDate, weeks);

      // Persist all items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("content_planner_items")
        .insert(generated.map((g) => ({ ...g, user_id: user!.id })))
        .select();

      if (error) throw error;

      setItems((prev) => [
        ...prev,
        ...(data as ContentItem[]),
      ].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)));

      toast.success(`Generated ${data.length} content items for ${weeks === 1 ? "this week" : "this month"}.`);
    } catch {
      toast.error("Failed to generate plan.");
    } finally {
      setGenerating(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col overflow-hidden h-full" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* Top bar */}
      <div
        className="h-[52px] px-5 flex items-center gap-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: "oklch(0.06 0 0)" }}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" style={{ color: C.textMuted }} />
        <span className="text-[12px] font-semibold" style={{ color: C.textSecondary }}>Content Planner</span>

        {userRole && (
          <span
            className="text-[9px] uppercase tracking-[0.22em] font-semibold rounded-full px-2 py-0.5 shrink-0"
            style={{
              background: userRole === "business" ? "oklch(0.66 0.09 250 / 12%)" : "oklch(0.72 0.14 152 / 10%)",
              color:      userRole === "business" ? "oklch(0.66 0.09 250 / 80%)" : "oklch(0.72 0.14 152 / 80%)",
              border:     `1px solid ${userRole === "business" ? "oklch(0.66 0.09 250 / 20%)" : "oklch(0.72 0.14 152 / 20%)"}`,
            }}
          >
            {userRole === "business" ? "Business" : "Creator"}
          </span>
        )}

        {/* Platform filters */}
        <div className="flex items-center gap-1.5 ml-2">
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
          {/* Generate AI plan */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => generatePlan(1)}
              disabled={generating}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(0.72 0.14 152 / 12%)", border: "1px solid oklch(0.72 0.14 152 / 25%)", color: C.accent }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 18%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 12%)"; }}
            >
              {generating
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />
              }
              Week
            </button>
            <button
              onClick={() => generatePlan(4)}
              disabled={generating}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
              style={{ background: "oklch(0.72 0.14 152 / 8%)", border: "1px solid oklch(0.72 0.14 152 / 18%)", color: "oklch(0.72 0.14 152 / 70%)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 14%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 8%)"; }}
            >
              Month
            </button>
          </div>

          {/* Add item */}
          <button
            onClick={() => { setAddModalDate(today); setShowAddModal(true); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
            style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      {/* Calendar toolbar */}
      <div
        className="h-[44px] px-5 flex items-center gap-4 shrink-0"
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

        {/* Stats */}
        <div className="flex items-center gap-3 ml-2">
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
        <div className="flex flex-col overflow-hidden" style={{ flex: "1 1 0%", minWidth: 0 }}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: C.chrome }} />
                <span className="text-[12px]" style={{ color: C.textMuted }}>Loading your content plan…</span>
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
              {!loading && items.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div
                    className="rounded-2xl px-8 py-8 flex flex-col items-center text-center pointer-events-auto"
                    style={{ background: "oklch(0.10 0 0 / 90%)", border: `1px solid ${C.borderNormal}`, backdropFilter: "blur(12px)", maxWidth: 360 }}
                  >
                    <CalendarDays className="h-10 w-10 mb-3" style={{ color: C.textMuted }} />
                    <div className="text-[14px] font-semibold mb-1" style={{ color: C.textPrimary }}>
                      Your calendar is empty
                    </div>
                    <div className="text-[12px] mb-5" style={{ color: C.textTertiary }}>
                      Generate an AI content plan or add items manually to fill your calendar.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => generatePlan(1)}
                        disabled={generating}
                        className="flex items-center gap-2 rounded-full h-9 px-5 text-[12.5px] font-medium"
                        style={{ background: "oklch(0.72 0.14 152 / 15%)", border: "1px solid oklch(0.72 0.14 152 / 30%)", color: C.accent }}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {generating ? "Generating…" : "Generate Week"}
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

        {/* Detail panel */}
        {selectedItem && (
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
    </div>
  );
}
