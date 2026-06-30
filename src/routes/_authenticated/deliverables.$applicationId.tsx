// ─────────────────────────────────────────────────────────────────────────────
// /deliverables/$applicationId — Per-deliverable submission tracking
//
// Role-aware: creator sees submission forms; business sees submissions +
// Approve / Request Revision controls. Both reach this page from different
// entry points (applications list for creator, applicants page for business).
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { trackMarketplaceEvent } from "@/lib/marketplaceEvents";
import { sendNotification } from "@/lib/notificationService";
import {
  ArrowLeft, CheckCircle2, Clock, RotateCcw, ExternalLink,
  Upload, Layers, Circle, FileText, Image, Video, X, Link2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/deliverables/$applicationId")({
  head: () => ({ meta: [{ title: "Deliverables — MRKT" }] }),
  component: DeliverablesPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubStatus = "not_started" | "in_progress" | "submitted" | "revision_requested" | "approved";

interface Deliverable {
  id:           string;
  platform:     string;
  content_type: string;
  quantity:     number;
}

interface Submission {
  id:             string;
  deliverable_id: string;
  status:         SubStatus;
  submission_url: string | null;
  file_url:       string | null;
  file_name:      string | null;
  file_size:      number | null;
  file_type:      string | null;
  creator_notes:  string | null;
  feedback:       string | null;
  submitted_at:   string | null;
  reviewed_at:    string | null;
  revision_count: number | null;
}

interface AppDetail {
  id:          string;
  campaign_id: string;
  creator_id:  string;
  business_id: string;
  campaign_title: string;
  creator_name:   string;
  campaign_title_text: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const SUB_STATUS: Record<SubStatus, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started:        { label: "Not Started",        color: "oklch(1 0 0 / 36%)",   bg: "oklch(1 0 0 / 4%)",           border: "oklch(1 0 0 / 10%)",          icon: Circle       },
  in_progress:        { label: "In Progress",        color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 12%)",   border: "oklch(0.78 0.14 76 / 26%)",   icon: Clock        },
  submitted:          { label: "Submitted",           color: "oklch(0.72 0.10 224)", bg: "oklch(0.62 0.10 224 / 12%)",  border: "oklch(0.62 0.10 224 / 26%)",  icon: Upload       },
  revision_requested: { label: "Revision Requested", color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 12%)",   border: "oklch(0.78 0.14 76 / 26%)",   icon: RotateCcw    },
  approved:           { label: "Approved",            color: "oklch(0.62 0.12 158)", bg: "oklch(0.72 0.18 152 / 14%)",  border: "oklch(0.72 0.18 152 / 30%)",  icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: SubStatus }) {
  const s = SUB_STATUS[status];
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon className="h-2.5 w-2.5" />
      {s.label}
    </span>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ submissions }: { submissions: Submission[] }) {
  const total    = submissions.length;
  const approved = submissions.filter(s => s.status === "approved").length;
  const pct      = total === 0 ? 0 : Math.round((approved / total) * 100);

  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-semibold" style={{ color: C.text }}>
          Campaign Progress
        </p>
        <span className="text-[12px] font-bold" style={{ color: "oklch(0.62 0.12 158)" }}>
          {approved} / {total} approved
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "oklch(0.62 0.12 158)" }}
        />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10.5px]" style={{ color: C.faint }}>
        {Object.entries(SUB_STATUS).map(([key, val]) => {
          const count = submissions.filter(s => s.status === key).length;
          if (count === 0) return null;
          return (
            <span key={key} style={{ color: val.color }}>
              {count} {val.label.toLowerCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Deliverable row (creator view) ──────────────────────────────────────────

function CreatorDeliverableRow({
  deliverable, submission,
  appId, userId,
  onUpdate,
}: {
  deliverable: Deliverable;
  submission: Submission;
  appId: string;
  userId: string;
  onUpdate: (subId: string, updates: Partial<Submission>, status: SubStatus) => Promise<void>;
}) {
  const [editing,      setEditing]      = useState(false);
  const [url,          setUrl]          = useState(submission.submission_url ?? "");
  const [notes,        setNotes]        = useState(submission.creator_notes  ?? "");
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadMode,   setUploadMode]   = useState<"file" | "url">("file");
  const [pendingFile,  setPendingFile]  = useState<{ name: string; size: number; type: string; url: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const isApproved = submission.status === "approved";
  const hasFile    = !!submission.file_url;
  const hasUrl     = !!submission.submission_url;
  const FileIcon   = fileIcon(submission.file_type);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadDeliverableFile(file, userId, appId, deliverable.id);
      setPendingFile({ name: result.file_name, size: result.file_size, type: result.file_type, url: result.file_url });
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(newStatus: SubStatus) {
    setSaving(true);
    try {
      const updates: Partial<Submission> = {
        creator_notes: notes || null,
      };
      if (uploadMode === "file" && pendingFile) {
        updates.file_url   = pendingFile.url;
        updates.file_name  = pendingFile.name;
        updates.file_size  = pendingFile.size;
        updates.file_type  = pendingFile.type;
        updates.submission_url = null;
      } else if (uploadMode === "url") {
        updates.submission_url = url || null;
        updates.file_url   = null;
        updates.file_name  = null;
        updates.file_size  = null;
        updates.file_type  = null;
      }
      await onUpdate(submission.id, updates, newStatus);
      setEditing(false);
      setPendingFile(null);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = uploadMode === "file" ? !!pendingFile : !!url.trim();

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: C.surface,
        border: `1px solid ${isApproved ? "oklch(0.72 0.18 152 / 26%)" : C.border}`,
      }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}
          >
            <Layers className="h-3.5 w-3.5" style={{ color: C.accent }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: C.text }}>
              {deliverable.content_type}
            </p>
            <p className="text-[11px]" style={{ color: C.muted }}>
              {deliverable.platform}
              {deliverable.quantity > 1 && ` · ${deliverable.quantity}×`}
              {submission.revision_count ? ` · ${submission.revision_count} revision${submission.revision_count > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Revision feedback */}
        {submission.status === "revision_requested" && submission.feedback && (
          <div className="rounded-xl px-3.5 py-2.5" style={{ background: "oklch(0.70 0.08 68 / 8%)", border: "1px solid oklch(0.70 0.08 68 / 20%)" }}>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1" style={{ color: "oklch(0.70 0.08 68)" }}>Revision Feedback</p>
            <p className="text-[12px] leading-relaxed" style={{ color: C.textSub }}>{submission.feedback}</p>
          </div>
        )}

        {/* Current file submission */}
        {hasFile && !editing && (
          <a
            href={submission.file_url!}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all"
            style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)"; }}
          >
            <FileIcon className="h-3.5 w-3.5 shrink-0" style={{ color: C.chrome }} />
            <span className="text-[12px] font-medium truncate" style={{ color: C.text }}>
              {submission.file_name ?? "View File"}
            </span>
            {submission.file_size && (
              <span className="text-[11px] shrink-0" style={{ color: C.faint }}>
                {formatBytes(submission.file_size)}
              </span>
            )}
            <ExternalLink className="h-3 w-3 ml-auto shrink-0" style={{ color: C.faint }} />
          </a>
        )}

        {/* Current URL submission */}
        {hasUrl && !hasFile && !editing && (
          <a
            href={submission.submission_url!} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
            style={{ color: C.chrome }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.90 0.005 0)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.chrome; }}
          >
            <ExternalLink className="h-3 w-3" /> View Submission
          </a>
        )}

        {submission.creator_notes && !editing && (
          <p className="text-[12px] italic" style={{ color: C.muted }}>"{submission.creator_notes}"</p>
        )}

        {/* Edit / upload form */}
        {editing && !isApproved && (
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid oklch(1 0 0 / 10%)" }}>
              {(["file", "url"] as const).map((mode) => (
                <button
                  key={mode} type="button"
                  onClick={() => setUploadMode(mode)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[11.5px] font-medium transition-all"
                  style={{
                    background: uploadMode === mode ? "oklch(1 0 0 / 8%)" : "transparent",
                    color: uploadMode === mode ? C.text : C.faint,
                  }}
                >
                  {mode === "file" ? <Upload className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                  {mode === "file" ? "Upload file" : "Paste URL"}
                </button>
              ))}
            </div>

            {uploadMode === "file" ? (
              <>
                <input
                  ref={fileRef} type="file" className="hidden"
                  accept="image/*,video/*,application/pdf,.zip"
                  onChange={handleFileSelect}
                />
                {pendingFile ? (
                  <div
                    className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
                    style={{ background: "oklch(0.72 0.18 152 / 8%)", border: "1px solid oklch(0.72 0.18 152 / 20%)" }}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.62 0.12 158)" }} />
                    <span className="text-[12px] truncate" style={{ color: C.text }}>{pendingFile.name}</span>
                    <span className="text-[11px] shrink-0" style={{ color: C.faint }}>{formatBytes(pendingFile.size)}</span>
                    <button type="button" onClick={() => setPendingFile(null)} className="ml-auto shrink-0">
                      <X className="h-3 w-3" style={{ color: C.faint }} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl flex flex-col items-center justify-center py-5 gap-2 transition-all disabled:opacity-50"
                    style={{ background: "oklch(1 0 0 / 3%)", border: "1px dashed oklch(1 0 0 / 14%)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 3%)"; }}
                  >
                    {uploading ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" style={{ color: C.faint }} />
                    )}
                    <span className="text-[12px]" style={{ color: C.faint }}>
                      {uploading ? "Uploading…" : "Click to select file"}
                    </span>
                    <span className="text-[10.5px]" style={{ color: "oklch(1 0 0 / 24%)" }}>
                      Images, video, PDF, ZIP · up to 100 MB
                    </span>
                  </button>
                )}
              </>
            ) : (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/… or TikTok/Reel link"
                className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none"
                style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)", color: C.text }}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 20%)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 10%)"; }}
              />
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5" style={{ color: C.faint }}>
                Notes <span style={{ color: C.faint, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any context for the business…"
                className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] resize-none outline-none"
                style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)", color: C.text }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button" disabled={saving || !canSubmit}
                onClick={() => handleSave("submitted")}
                className="flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-semibold transition-all disabled:opacity-50"
                style={{ background: C.chrome, color: "oklch(0.06 0 0)" }}
                onMouseEnter={(e) => { if (!saving && canSubmit) (e.currentTarget as HTMLElement).style.background = "oklch(0.90 0.005 0)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.chrome; }}
              >
                {saving
                  ? <span className="h-3 w-3 rounded-full border-2 border-black/25 border-t-black/70 animate-spin" />
                  : <Upload className="h-3 w-3" />
                }
                Submit
              </button>
              {canSubmit && (
                <button
                  type="button" disabled={saving}
                  onClick={() => handleSave("in_progress")}
                  className="rounded-full px-4 h-8 text-[12px] font-medium transition-colors disabled:opacity-50"
                  style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 10%)", color: C.textSub }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
                >
                  Save Draft
                </button>
              )}
              <button
                type="button" onClick={() => { setEditing(false); setPendingFile(null); }}
                className="text-[12px] px-2 rounded-full transition-colors"
                style={{ color: C.faint }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action row */}
        {!editing && !isApproved && (
          <button
            type="button" onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[12px] font-medium transition-colors"
            style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 10%)", color: C.muted }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; (e.currentTarget as HTMLElement).style.color = C.text; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; (e.currentTarget as HTMLElement).style.color = C.muted; }}
          >
            <Upload className="h-3 w-3" />
            {hasFile || hasUrl ? "Update Submission" : "Add Submission"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Deliverable row (business view) ──────────────────────────────────────────

function BusinessDeliverableRow({
  deliverable, submission,
  onApprove, onRequestRevision,
  acting,
}: {
  deliverable: Deliverable;
  submission: Submission;
  onApprove:          (subId: string) => Promise<void>;
  onRequestRevision:  (subId: string, feedback: string) => Promise<void>;
  acting: string | null;
}) {
  const [showRevForm, setShowRevForm] = useState(false);
  const [feedback,    setFeedback]    = useState("");
  const isActing = acting === submission.id;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}
          >
            <Layers className="h-3.5 w-3.5" style={{ color: C.accent }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: C.text }}>{deliverable.content_type}</p>
            <p className="text-[11px]" style={{ color: C.muted }}>
              {deliverable.platform}
              {deliverable.quantity > 1 && ` · ${deliverable.quantity}×`}
            </p>
          </div>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* File or URL submission */}
        {submission.file_url ? (
          <a
            href={submission.file_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all"
            style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)"; }}
          >
            {(() => { const FI = fileIcon(submission.file_type); return <FI className="h-3.5 w-3.5 shrink-0" style={{ color: C.chrome }} />; })()}
            <span className="text-[12px] font-medium truncate" style={{ color: C.text }}>
              {submission.file_name ?? "View File"}
            </span>
            {submission.file_size && (
              <span className="text-[11px] shrink-0" style={{ color: C.faint }}>{formatBytes(submission.file_size)}</span>
            )}
            <ExternalLink className="h-3 w-3 ml-auto shrink-0" style={{ color: C.faint }} />
          </a>
        ) : submission.submission_url ? (
          <a
            href={submission.submission_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
            style={{ color: C.chrome }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.90 0.005 0)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.chrome; }}
          >
            <ExternalLink className="h-3 w-3" /> View Submission
          </a>
        ) : (
          <p className="text-[12px]" style={{ color: C.faint }}>No submission yet.</p>
        )}
        {submission.creator_notes && (
          <p className="text-[12px] italic" style={{ color: C.muted }}>"{submission.creator_notes}"</p>
        )}

        {/* Business actions — only when submitted */}
        {submission.status === "submitted" && !showRevForm && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button" disabled={isActing}
              onClick={() => onApprove(submission.id)}
              className="flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{ background: C.chrome, color: "oklch(0.06 0 0)" }}
              onMouseEnter={(e) => { if (!isActing) (e.currentTarget as HTMLElement).style.background = "oklch(0.90 0.005 0)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.chrome; }}
            >
              {isActing
                ? <span className="h-3 w-3 rounded-full border-2 border-black/25 border-t-black/70 animate-spin" />
                : <CheckCircle2 className="h-3 w-3" />
              }
              Approve
            </button>
            <button
              type="button" disabled={isActing}
              onClick={() => setShowRevForm(true)}
              className="flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-medium transition-colors disabled:opacity-50"
              style={{ background: "oklch(0.70 0.08 68 / 8%)", border: "1px solid oklch(0.70 0.08 68 / 20%)", color: "oklch(0.70 0.08 68)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.70 0.08 68 / 14%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.70 0.08 68 / 8%)"; }}
            >
              <RotateCcw className="h-3 w-3" /> Request Revision
            </button>
          </div>
        )}

        {/* Revision form */}
        {showRevForm && (
          <div className="space-y-3">
            <textarea
              value={feedback} onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Explain what needs to be changed…"
              className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] resize-none outline-none"
              style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)", color: C.text }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button" disabled={isActing}
                onClick={async () => {
                  await onRequestRevision(submission.id, feedback);
                  setShowRevForm(false); setFeedback("");
                }}
                className="flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-semibold transition-all disabled:opacity-50"
                style={{ background: "oklch(0.80 0.18 60 / 10%)", border: "1px solid oklch(0.80 0.18 60 / 24%)", color: "oklch(0.70 0.08 68)" }}
              >
                {isActing
                  ? <span className="h-3 w-3 rounded-full border-2 border-yellow-400/30 border-t-yellow-400/80 animate-spin" />
                  : <RotateCcw className="h-3 w-3" />
                }
                Send Request
              </button>
              <button type="button" onClick={() => setShowRevForm(false)} className="text-[12px] px-2" style={{ color: C.faint }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File upload helper ───────────────────────────────────────────────────────

function fileIcon(type: string | null) {
  if (!type) return FileText;
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Video;
  return FileText;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadDeliverableFile(
  file: File,
  userId: string,
  applicationId: string,
  deliverableId: string,
): Promise<{ file_url: string; file_name: string; file_size: number; file_type: string }> {
  const ext  = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${applicationId}/${deliverableId}/${Date.now()}.${ext}`;
  const { error } = await (supabase as any).storage
    .from("deliverables")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data: signed } = await (supabase as any).storage
    .from("deliverables")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7-day signed URL

  return {
    file_url:  signed?.signedUrl ?? path,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DeliverablesPage() {
  const { user }          = useAuth();
  const { applicationId } = Route.useParams();

  const [appDetail,    setAppDetail]    = useState<AppDetail | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [submissions,  setSubmissions]  = useState<Submission[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [isCreator,    setIsCreator]    = useState(false);
  const [acting,       setActing]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load application with campaign info
      const { data: app, error: appErr } = await (supabase as any)
        .from("campaign_applications")
        .select(`
          id, campaign_id, user_id, status, campaign_title,
          campaigns!inner(
            title, user_id,
            creator_profiles!left(display_name)
          )
        `)
        .eq("id", applicationId)
        .single();

      if (appErr || !app) throw new Error("Application not found");

      // Access check: must be creator or business owner
      const isCr = app.user_id === user.id;
      const isBiz = app.campaigns?.user_id === user.id;
      if (!isCr && !isBiz) throw new Error("Access denied");

      setIsCreator(isCr);

      // Get creator profile for display name
      const { data: creatorProfile } = await (supabase as any)
        .from("creator_profiles")
        .select("display_name")
        .eq("user_id", app.user_id)
        .maybeSingle();

      setAppDetail({
        id:                  app.id,
        campaign_id:         app.campaign_id,
        creator_id:          app.user_id,
        business_id:         app.campaigns.user_id,
        campaign_title:      app.campaign_title ?? app.campaigns?.title ?? "Campaign",
        creator_name:        creatorProfile?.display_name ?? "Creator",
        campaign_title_text: app.campaigns?.title ?? app.campaign_title ?? "Campaign",
      });

      // Load campaign deliverables
      const { data: delivs } = await (supabase as any)
        .from("campaign_deliverables")
        .select("id, platform, content_type, quantity")
        .eq("campaign_id", app.campaign_id)
        .order("platform");

      const delivList: Deliverable[] = delivs ?? [];
      setDeliverables(delivList);

      // Load existing submissions
      const { data: subs } = await (supabase as any)
        .from("campaign_deliverable_submissions")
        .select("id, deliverable_id, status, submission_url, file_url, file_name, file_size, file_type, creator_notes, feedback, submitted_at, reviewed_at, revision_count")
        .eq("application_id", applicationId)
        .eq("creator_id", app.user_id);

      const existingSubs: Submission[] = subs ?? [];

      // Auto-create 'not_started' submissions for deliverables that don't have one yet
      const missingDelivIds = delivList
        .filter(d => !existingSubs.find(s => s.deliverable_id === d.id))
        .map(d => d.id);

      if (missingDelivIds.length > 0) {
        const toInsert = missingDelivIds.map(dId => ({
          campaign_id:    app.campaign_id,
          deliverable_id: dId,
          application_id: applicationId,
          creator_id:     app.user_id,
          business_id:    app.campaigns.user_id,
          status:         "not_started",
        }));
        const { data: newSubs } = await (supabase as any)
          .from("campaign_deliverable_submissions")
          .insert(toInsert)
          .select("id, deliverable_id, status, submission_url, creator_notes, feedback, submitted_at, reviewed_at");
        setSubmissions([...existingSubs, ...(newSubs ?? [])]);
      } else {
        setSubmissions(existingSubs);
      }
    } catch (err) {
      console.error("Deliverables load error:", err);
      toast.error("Failed to load deliverables.");
    } finally {
      setLoading(false);
    }
  }, [user, applicationId]);

  useEffect(() => { load(); }, [load]);

  // ── Creator update ──
  async function handleCreatorUpdate(subId: string, updates: Partial<Submission>, status: SubStatus) {
    try {
      const { error } = await (supabase as any)
        .from("campaign_deliverable_submissions")
        .update({ ...updates, status })
        .eq("id", subId);
      if (error) throw error;
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, ...updates, status } : s));
      toast.success(status === "submitted" ? "Deliverable submitted!" : "Draft saved.");
      if (status === "submitted" && user && appDetail) {
        trackMarketplaceEvent({
          actorUserId: user.id,
          eventType: "deliverable_submitted",
          campaignId: appDetail.campaign_id,
          creatorId: appDetail.creator_id,
          businessId: appDetail.business_id,
          metadata: { submission_id: subId },
        });
        sendNotification({
          userId: appDetail.business_id,
          notificationType: "deliverable_submitted",
          data: { campaign_title: appDetail.campaign_title, campaign_id: appDetail.campaign_id },
          inApp: {
            title: "Deliverable ready for review",
            body: `${appDetail.creator_name} submitted a deliverable for ${appDetail.campaign_title}.`,
            link: `/deliverables/${appDetail.id}`,
          },
        });
      }
    } catch {
      toast.error("Failed to update deliverable.");
      throw new Error("update failed");
    }
  }

  // ── Business approve ──
  async function handleApprove(subId: string) {
    setActing(subId);
    try {
      const { error } = await (supabase as any)
        .from("campaign_deliverable_submissions")
        .update({ status: "approved" })
        .eq("id", subId);
      if (error) throw error;
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "approved" as SubStatus } : s));
      toast.success("Deliverable approved!");
      if (user && appDetail) {
        trackMarketplaceEvent({
          actorUserId: user.id,
          eventType: "deliverable_approved",
          campaignId: appDetail.campaign_id,
          creatorId: appDetail.creator_id,
          businessId: appDetail.business_id,
          metadata: { submission_id: subId },
        });
        sendNotification({
          userId: appDetail.creator_id,
          notificationType: "deliverable_approved",
          data: { campaign_title: appDetail.campaign_title, campaign_id: appDetail.campaign_id },
          inApp: {
            title: "Deliverable approved",
            body: `Your deliverable for ${appDetail.campaign_title} has been approved.`,
            link: `/deliverables/${appDetail.id}`,
          },
        });
      }
    } catch {
      toast.error("Failed to approve deliverable.");
    } finally {
      setActing(null);
    }
  }

  // ── Business request revision ──
  async function handleRequestRevision(subId: string, feedback: string) {
    setActing(subId);
    try {
      const { error } = await (supabase as any)
        .from("campaign_deliverable_submissions")
        .update({ status: "revision_requested", feedback: feedback || null })
        .eq("id", subId);
      if (error) throw error;
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "revision_requested" as SubStatus, feedback } : s));
      toast.success("Revision request sent.");
      if (user && appDetail) {
        trackMarketplaceEvent({
          actorUserId: user.id,
          eventType: "deliverable_revision_requested",
          campaignId: appDetail.campaign_id,
          creatorId: appDetail.creator_id,
          businessId: appDetail.business_id,
          metadata: { submission_id: subId, feedback },
        });
        sendNotification({
          userId: appDetail.creator_id,
          notificationType: "revision_requested",
          data: { campaign_title: appDetail.campaign_title, campaign_id: appDetail.campaign_id, feedback },
          inApp: {
            title: "Revision requested",
            body: `${appDetail.campaign_title}: a revision has been requested on your deliverable.`,
            link: `/deliverables/${appDetail.id}`,
          },
        });
      }
    } catch {
      toast.error("Failed to request revision.");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-2xl mx-auto w-full">
        <div className="h-6 w-48 rounded-lg animate-pulse mb-8" style={{ background: "oklch(1 0 0 / 6%)" }} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-[100px] animate-pulse" style={{ background: "oklch(1 0 0 / 4%)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!appDetail) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: C.muted }}>Application not found.</p>
      </div>
    );
  }

  const backTo = isCreator ? "/applications" : `/campaigns/${appDetail.campaign_id}/applicants`;
  const backLabel = isCreator ? "Applications" : "Applicants";

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: C.canvas }}>

      {/* Top bar */}
      <div className="h-[52px] px-4 md:px-8 flex items-center gap-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <Link
          to={backTo as "/"}
          className="flex items-center gap-1.5 text-[12px] transition-colors"
          style={{ color: C.faint }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.faint; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        <span style={{ color: C.faint }}>/</span>
        <span className="text-[12px] font-medium truncate" style={{ color: C.muted }}>
          Deliverables
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-5">

          {/* Page header */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-1.5" style={{ color: C.faint }}>
              {appDetail.campaign_title_text}
            </p>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: C.text }}>
              {isCreator ? "My Deliverables" : `${appDetail.creator_name}'s Deliverables`}
            </h1>
            <p className="text-[13px] mt-1" style={{ color: C.muted }}>
              {isCreator
                ? "Submit your work for each deliverable. The business will review and approve."
                : "Review each submission and approve or request changes."}
            </p>
          </div>

          {/* Progress summary */}
          {submissions.length > 0 && (
            <ProgressBar submissions={submissions} />
          )}

          {/* Deliverables list */}
          {deliverables.length === 0 ? (
            <div
              className="rounded-2xl flex flex-col items-center justify-center py-16 text-center"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <Layers className="h-8 w-8 mb-3" style={{ color: C.faint }} />
              <p className="text-[14px] font-semibold" style={{ color: C.text }}>No deliverables defined</p>
              <p className="text-[12px] mt-1" style={{ color: C.muted }}>
                The campaign doesn't have any deliverables specified yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliverables.map((deliv) => {
                const sub = submissions.find(s => s.deliverable_id === deliv.id);
                if (!sub) return null;
                if (isCreator) {
                  return (
                    <CreatorDeliverableRow
                      key={deliv.id}
                      deliverable={deliv}
                      submission={sub}
                      appId={applicationId}
                      userId={user!.id}
                      onUpdate={handleCreatorUpdate}
                    />
                  );
                }
                return (
                  <BusinessDeliverableRow
                    key={deliv.id}
                    deliverable={deliv}
                    submission={sub}
                    onApprove={handleApprove}
                    onRequestRevision={handleRequestRevision}
                    acting={acting}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
