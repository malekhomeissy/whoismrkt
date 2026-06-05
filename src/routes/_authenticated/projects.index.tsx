import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { toast } from "sonner";
import {
  Plus, ArrowUpRight, Folder, MessageSquare,
  Bookmark, Clock, Sparkles, X,
  ChevronRight, Layers,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({ meta: [{ title: "Projects — MRKT" }] }),
  component: ProjectsPage,
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

type ProjectWithCounts = Project & {
  chat_count: number;
  saved_count: number;
};

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────

const C = {
  canvas:       "#000",
  base:         "oklch(0.075 0 0)",
  surface:      "oklch(0.11 0 0)",
  raised:       "oklch(0.15 0 0)",
  high:         "oklch(0.19 0 0)",
  borderSubtle: "oklch(1 0 0 / 9%)",
  borderNormal: "oklch(1 0 0 / 13%)",
  borderStrong: "oklch(1 0 0 / 20%)",
  shadowCard:   "inset 0 1px 0 oklch(1 0 0 / 11%), 0 2px 8px oklch(0 0 0 / 55%), 0 1px 2px oklch(0 0 0 / 40%)",
  shadowModal:  "inset 0 1px 0 oklch(1 0 0 / 14%), 0 8px 40px oklch(0 0 0 / 60%), 0 2px 8px oklch(0 0 0 / 45%)",
  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",
  chrome:   "oklch(0.82 0.005 250)",
  accent:   "oklch(0.72 0.14 152)",
} as const;

function relativeTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─────────────────────────────────────────────────────────────
// New project modal
// ─────────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const { user } = useAuth();
  const [name, setName]     = useState("");
  const [desc, setDesc]     = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function create() {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("projects")
        .insert({ user_id: user.id, name: name.trim(), description: desc.trim() || null })
        .select()
        .single();
      if (error) throw error;
      toast.success("Project created.");
      onCreated(data as Project);
      onClose();
    } catch { toast.error("Couldn't create project."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: C.high, border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowModal }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <Folder className="h-4 w-4" style={{ color: C.accent }} />
          <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>New Project</span>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg transition-colors"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.textQuaternary }}>
            Project Name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
            placeholder="Summer Campaign 2026"
            className="w-full bg-transparent rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderStrong; }}
            onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = C.borderNormal; }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.textQuaternary }}>
            Description <span style={{ color: C.textMuted }}>— optional</span>
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What's this project about?"
            rows={2}
            className="w-full bg-transparent rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
            style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
            onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderStrong; }}
            onBlur={(e)  => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.borderNormal; }}
          />
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            onClick={create}
            disabled={saving || !name.trim()}
            className="btn-primary flex-1 h-9 rounded-full text-sm"
            style={{ opacity: name.trim() ? 1 : 0.45 }}
          >
            {saving ? "Creating…" : "Create Project"}
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

// ─────────────────────────────────────────────────────────────
// Project card
// ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ProjectWithCounts }) {
  return (
    <Link
      to={`/projects/${project.id}` as "/"}
      className="group block rounded-[18px] p-5 transition-all duration-200"
      style={{
        background: C.surface,
        border: `1px solid ${C.borderNormal}`,
        boxShadow: C.shadowCard,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = C.raised;
        (e.currentTarget as HTMLElement).style.borderColor = C.borderStrong;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 14%), 0 6px 24px oklch(0 0 0 / 65%), 0 2px 6px oklch(0 0 0 / 50%)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = C.surface;
        (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = C.shadowCard;
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: C.raised, border: `1px solid ${C.borderStrong}`, boxShadow: "inset 0 1px 0 oklch(1 0 0 / 12%)" }}
        >
          <Folder className="h-4 w-4" style={{ color: C.chrome }} />
        </div>
        <ChevronRight
          className="h-4 w-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: C.textSecondary }}
        />
      </div>

      <div className="mb-4">
        <div className="text-[14px] font-semibold leading-snug mb-1.5" style={{ color: C.textPrimary }}>
          {project.name}
        </div>
        {project.description ? (
          <div className="text-[12px] leading-relaxed line-clamp-2" style={{ color: C.textTertiary }}>
            {project.description}
          </div>
        ) : (
          <div className="text-[12px]" style={{ color: C.textMuted }}>No description</div>
        )}
      </div>

      <div
        className="flex items-center gap-4 pt-3.5"
        style={{ borderTop: `1px solid ${C.borderSubtle}` }}
      >
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" style={{ color: C.textQuaternary }} />
          <span className="text-[11px]" style={{ color: C.textTertiary }}>
            {project.chat_count} {project.chat_count === 1 ? "session" : "sessions"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Bookmark className="h-3 w-3" style={{ color: C.textQuaternary }} />
          <span className="text-[11px]" style={{ color: C.textTertiary }}>
            {project.saved_count} saved
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" style={{ color: C.textMuted }} />
          <span className="text-[10.5px]" style={{ color: C.textMuted }}>
            {relativeTime(project.updated_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function ProjectsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showNew, setShowNew]   = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProjects();
    function onKey(e: KeyboardEvent) {
      if (e.key === "n" && !["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName ?? "")) {
        setShowNew(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProjects() {
    if (!user) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: projs } = await (supabase as any)
        .from("projects")
        .select("id,name,description,status,created_at,updated_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (!projs || projs.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }

      const ids = projs.map((p: Project) => p.id);

      const [{ data: chatData }, { data: savedData }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("chats").select("project_id").in("project_id", ids),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("saved_outputs").select("project_id").in("project_id", ids),
      ]);

      const chatCounts: Record<string, number>  = {};
      const savedCounts: Record<string, number> = {};
      for (const row of (chatData  ?? [])) chatCounts[row.project_id]  = (chatCounts[row.project_id]  ?? 0) + 1;
      for (const row of (savedData ?? [])) savedCounts[row.project_id] = (savedCounts[row.project_id] ?? 0) + 1;

      setProjects(projs.map((p: Project) => ({
        ...p,
        chat_count:  chatCounts[p.id]  ?? 0,
        saved_count: savedCounts[p.id] ?? 0,
      })));
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(p: Project) {
    const withCounts: ProjectWithCounts = { ...p, chat_count: 0, saved_count: 0 };
    setProjects((prev) => [withCounts, ...prev]);
    nav({ to: `/projects/${p.id}` as "/" });
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: C.canvas }}>
        <div className="h-5 w-5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* Page top bar */}
      <div className="h-[52px] px-6 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>Projects</span>
          {projects.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(1 0 0 / 8%)", color: C.textMuted }}>
              {projects.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary inline-flex items-center gap-2 rounded-full px-4 h-8 text-[12.5px]"
        >
          <Plus className="h-3.5 w-3.5" /> New Project
        </button>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">

          <div className="mb-10">
            <div className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium" style={{ color: C.textQuaternary }}>
              MRKT Workspace
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-3" style={{ color: C.textPrimary }}>
              Your projects.
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: C.textTertiary }}>
              Organize campaigns, creators, AI strategies, and saved outputs in one workspace.
            </p>
          </div>

          {projects.length === 0 ? (
            <EmptyProjects onNew={() => setShowNew(true)} />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
              <button
                onClick={() => setShowNew(true)}
                className="rounded-[18px] p-5 flex flex-col items-center justify-center gap-3 transition-all duration-200 text-center"
                style={{
                  background: "oklch(1 0 0 / 2%)",
                  border: `1px dashed ${C.borderSubtle}`,
                  minHeight: 160,
                  color: C.textMuted,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal;
                  (e.currentTarget as HTMLElement).style.color = C.textTertiary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle;
                  (e.currentTarget as HTMLElement).style.color = C.textMuted;
                }}
              >
                <Plus className="h-5 w-5" />
                <span className="text-[12.5px] font-medium">New Project</span>
              </button>
            </div>
          )}

        </div>
      </main>

      {showNew && (
        <NewProjectModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────

function EmptyProjects({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
      >
        <Sparkles className="h-6 w-6" style={{ color: C.chrome }} />
      </div>
      <h2 className="font-display text-[1.5rem] font-semibold tracking-tight mb-3" style={{ color: C.textPrimary }}>
        Start your first project.
      </h2>
      <p className="text-[0.9375rem] leading-relaxed max-w-sm mb-8" style={{ color: C.textTertiary }}>
        Create a project and organize your campaigns, creators, AI strategies, and saved outputs in one workspace.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onNew}
          className="btn-primary inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
        >
          Create First Project <ArrowUpRight className="h-4 w-4" />
        </button>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm transition-colors"
          style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, color: C.textTertiary }}
        >
          Back to AI Strategist
        </Link>
      </div>
    </div>
  );
}
