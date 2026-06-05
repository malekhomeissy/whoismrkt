import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatFollowers } from "@/types/creator";
import {
  Users, MapPin, ChevronDown, Loader2, Briefcase, Star,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — MRKT" }] }),
  component: PipelinePage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  canvas:       "#000",
  base:         "oklch(0.075 0 0)",
  surface:      "oklch(0.11 0 0)",
  raised:       "oklch(0.15 0 0)",
  raisedHover:  "oklch(0.18 0 0)",
  borderSubtle: "oklch(1 0 0 / 8%)",
  borderNormal: "oklch(1 0 0 / 13%)",
  textPrimary:  "oklch(1 0 0 / 92%)",
  textSecondary:"oklch(1 0 0 / 68%)",
  textTertiary: "oklch(1 0 0 / 46%)",
  textMuted:    "oklch(1 0 0 / 22%)",
  accent:       "oklch(0.72 0.14 152)",
} as const;

// ─── Stage config ─────────────────────────────────────────────────────────────

type Stage = "discovered" | "saved" | "contacted" | "negotiating" | "booked" | "completed" | "rejected";

const STAGES: { id: Stage; label: string; color: string; dotColor: string }[] = [
  { id: "discovered",  label: "Discovered",  color: "oklch(0.66 0.09 250 / 14%)", dotColor: "oklch(0.66 0.09 250)" },
  { id: "saved",       label: "Saved",       color: "oklch(0.72 0.14 152 / 12%)", dotColor: "oklch(0.72 0.14 152)" },
  { id: "contacted",   label: "Contacted",   color: "oklch(0.78 0.12 60 / 12%)",  dotColor: "oklch(0.78 0.12 60)"  },
  { id: "negotiating", label: "Negotiating", color: "oklch(0.72 0.15 300 / 12%)", dotColor: "oklch(0.72 0.15 300)" },
  { id: "booked",      label: "Booked",      color: "oklch(0.68 0.12 25 / 12%)",  dotColor: "oklch(0.68 0.12 25)"  },
  { id: "completed",   label: "Completed",   color: "oklch(0.60 0 0 / 12%)",      dotColor: "oklch(0.60 0 0)"      },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CreatorProfile = {
  id: string;
  display_name: string;
  username: string | null;
  niche: string | null;
  categories: string[];
  platforms: string[];
  profile_image_url: string | null;
  location: string | null;
  follower_count: number | null;
};

type Project = { id: string; name: string };

type PipelineEntry = {
  id: string;
  project_id: string;
  status: Stage;
  estimated_rate: string | null;
  priority: "high" | "medium" | "low" | null;
  internal_note: string | null;
  created_at: string;
  creator_profiles: CreatorProfile | null;
  projects: Project | null;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "oklch(0.68 0.12 25)", "oklch(0.66 0.09 250)",
  "oklch(0.64 0.11 160)", "oklch(0.70 0.10 300)",
  "oklch(0.72 0.09 60)",  "oklch(0.65 0.10 190)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ─── Creator card ─────────────────────────────────────────────────────────────

function CreatorCard({
  entry,
  isDragging,
  onDragStart,
  onMoveStage,
}: {
  entry: PipelineEntry;
  isDragging: boolean;
  onDragStart: () => void;
  onMoveStage: (id: string, stage: Stage) => void;
}) {
  const cp = entry.creator_profiles;
  const name = cp?.display_name ?? "Unknown";
  const initial = name[0]?.toUpperCase() ?? "?";
  const stageIdx = STAGES.findIndex((s) => s.id === entry.status);

  if (!cp) return null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-xl p-3.5 cursor-grab active:cursor-grabbing select-none"
      style={{
        background: isDragging ? "oklch(0.22 0 0)" : C.raised,
        border: `1px solid ${isDragging ? C.borderNormal : C.borderSubtle}`,
        opacity: isDragging ? 0.55 : 1,
        transform: isDragging ? "rotate(1.5deg) scale(1.02)" : undefined,
        transition: "opacity 120ms, transform 120ms",
        boxShadow: isDragging ? "0 8px 24px oklch(0 0 0 / 60%)" : undefined,
      }}
    >
      {/* Top row — avatar + name */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {cp.profile_image_url ? (
          <img
            src={cp.profile_image_url}
            alt={name}
            className="h-9 w-9 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
            style={{ background: avatarBg(name), color: "oklch(0.08 0 0)" }}
          >
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            to="/creators/$creatorId"
            params={{ creatorId: cp.id }}
            className="font-medium text-[12.5px] leading-tight truncate block hover:underline"
            style={{ color: C.textPrimary }}
          >
            {name}
          </Link>
          {cp.niche && (
            <div className="text-[10.5px] truncate mt-0.5" style={{ color: C.textTertiary }}>
              {cp.niche}
            </div>
          )}
        </div>
        {entry.priority === "high" && (
          <Star className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "oklch(0.78 0.12 60)", fill: "oklch(0.78 0.12 60)" }} />
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 mb-2.5">
        {cp.follower_count != null && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}>
            <Users className="h-3 w-3" />
            {formatFollowers(cp.follower_count)}
          </div>
        )}
        {cp.location && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: C.textMuted }}>
            <MapPin className="h-3 w-3" />
            {cp.location}
          </div>
        )}
      </div>

      {/* Project tag */}
      {entry.projects && (
        <div
          className="inline-flex items-center gap-1 text-[9.5px] rounded-full px-2 py-0.5 mb-2.5"
          style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)", color: C.textMuted }}
        >
          <Briefcase className="h-2.5 w-2.5" />
          {entry.projects.name}
        </div>
      )}

      {/* Move buttons */}
      <div className="flex gap-1">
        {stageIdx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveStage(entry.id, STAGES[stageIdx - 1].id); }}
            className="flex-1 h-6 rounded-lg text-[9px] uppercase tracking-[0.16em] font-medium transition-colors duration-100"
            style={{ background: "oklch(1 0 0 / 5%)", color: C.textMuted, border: "1px solid oklch(1 0 0 / 8%)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 9%)"; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            ← Back
          </button>
        )}
        {stageIdx < STAGES.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveStage(entry.id, STAGES[stageIdx + 1].id); }}
            className="flex-1 h-6 rounded-lg text-[9px] uppercase tracking-[0.16em] font-medium transition-colors duration-100"
            style={{ background: "oklch(0.72 0.14 152 / 10%)", color: "oklch(0.72 0.14 152)", border: "1px solid oklch(0.72 0.14 152 / 20%)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 18%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.72 0.14 152 / 10%)"; }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  entries,
  draggedId,
  dragOverStage,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onMoveStage,
}: {
  stage: (typeof STAGES)[number];
  entries: PipelineEntry[];
  draggedId: string | null;
  dragOverStage: Stage | null;
  onDragStart: (id: string) => void;
  onDragOver: (stage: Stage) => void;
  onDragLeave: () => void;
  onDrop: (stage: Stage) => void;
  onMoveStage: (id: string, stage: Stage) => void;
}) {
  const isOver = dragOverStage === stage.id && draggedId !== null;
  const draggedEntry = entries.find((e) => e.id === draggedId);
  const alreadyHere = draggedEntry?.status === stage.id;

  return (
    <div
      className="flex flex-col rounded-2xl shrink-0"
      style={{
        width: 252,
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: C.textTertiary }}>
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
            onDragStart={() => onDragStart(entry.id)}
            onMoveStage={onMoveStage}
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
          <div className="h-24 flex items-center justify-center">
            <span className="text-[10.5px]" style={{ color: C.textMuted }}>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PipelinePage() {
  const { user } = useAuth();
  const [entries,       setEntries]       = useState<PipelineEntry[]>([]);
  const [projects,      setProjects]      = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [loading,       setLoading]       = useState(true);
  const [draggedId,     setDraggedId]     = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("project_saved_creators")
      .select(`
        id, project_id, status, estimated_rate, priority, internal_note, created_at,
        creator_profiles ( id, display_name, username, niche, categories, platforms, profile_image_url, location, follower_count ),
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
    }
    setLoading(false);
  }

  const moveCreator = useCallback(
    async (entryId: string, newStage: Stage) => {
      const prev = entries.find((e) => e.id === entryId);
      if (!prev || prev.status === newStage) return;

      setEntries((es) => es.map((e) => e.id === entryId ? { ...e, status: newStage } : e));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("project_saved_creators")
        .update({ status: newStage, updated_at: new Date().toISOString() })
        .eq("id", entryId);

      if (error) {
        setEntries((es) => es.map((e) => e.id === entryId ? { ...e, status: prev.status } : e));
        toast.error("Failed to move creator");
      }
    },
    [entries],
  );

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

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
          </p>
        </div>

        {/* Project filter */}
        {projects.length > 1 && (
          <div className="relative">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="appearance-none pl-3 pr-8 h-8 rounded-xl text-[12px] font-medium cursor-pointer outline-none"
              style={{
                background: C.surface,
                border: `1px solid ${C.borderNormal}`,
                color: C.textSecondary,
              }}
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3"
              style={{ color: C.textMuted }}
            />
          </div>
        )}
      </div>

      {/* ── Kanban board ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: C.textMuted }} />
        </div>
      ) : entries.length === 0 ? (
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
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-5 h-full" style={{ minWidth: STAGES.length * 268 }}>
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                entries={grouped[stage.id]}
                draggedId={draggedId}
                dragOverStage={dragOverStage}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMoveStage={moveCreator}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
