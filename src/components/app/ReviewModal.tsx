// ─────────────────────────────────────────────────────────────────────────────
// ReviewModal — full-screen modal for submitting a collaboration review
// Supports: business_reviews_creator | creator_reviews_business
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StarRating } from "@/components/app/StarRating";
import {
  CREATOR_CATEGORIES,
  BUSINESS_CATEGORIES,
  type ReviewType,
} from "@/lib/reviews";

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  type: ReviewType;
  campaignId: string;
  reviewedUserId: string;
  reviewedName: string;
  reviewerId: string;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewModal({
  open,
  onClose,
  type,
  campaignId,
  reviewedUserId,
  reviewedName,
  reviewerId,
  onSuccess,
}: ReviewModalProps) {
  const [rating,     setRating]     = useState(0);
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [written,    setWritten]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCreatorReview = type === "business_reviews_creator";
  const cats = isCreatorReview ? CREATOR_CATEGORIES : BUSINESS_CATEGORIES;
  const subjectLabel = isCreatorReview ? "Creator" : "Business";
  const reviewerRole = isCreatorReview ? "business" : "creator";

  if (!open) return null;

  function reset() {
    setRating(0);
    setCategories({});
    setWritten("");
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("Please select an overall rating.");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      campaign_id:      campaignId,
      reviewer_id:      reviewerId,
      reviewed_user_id: reviewedUserId,
      reviewer_role:    reviewerRole,
      rating,
      written_review:   written.trim() || null,
    };

    // Add category ratings (only if set)
    for (const cat of cats) {
      const v = categories[cat.key];
      if (v && v > 0) payload[cat.key] = v;
    }

    // payload is built dynamically (category ratings only added when set),
    // so it can't be a fixed literal type — the fields inserted are always a
    // valid subset of the reviews table's real columns.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("reviews").insert(payload as any);

    if (error) {
      console.error("[ReviewModal] submit error:", error);
      if (error.code === "23505") {
        toast.error("You've already submitted a review for this collaboration.");
      } else if (error.code === "42501") {
        // RLS rejection: no accepted contract links these two parties on this
        // campaign — reviews require a real, signed collaboration.
        toast.error("Reviews require a signed contract for this campaign. Send and accept a contract first.");
      } else {
        toast.error("Failed to submit review. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    toast.success("Review submitted!");
    reset();
    onSuccess?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 80%)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col modal-in"
        style={{
          background:  C.bg,
          border:      `1px solid ${C.borderMid}`,
          boxShadow:   "0 24px 72px oklch(0 0 0 / 72%), 0 4px 16px oklch(0 0 0 / 40%)",
          maxHeight:   "90dvh",
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.28em] mb-1.5 font-semibold"
              style={{ color: C.faint }}
            >
              Rate {subjectLabel}
            </div>
            <h2
              className="font-display text-[1.1rem] font-bold leading-tight"
              style={{ color: C.text }}
            >
              {reviewedName}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.faint }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Overall rating — required */}
          <div>
            <div
              className="text-[10.5px] uppercase tracking-[0.26em] mb-3 font-semibold flex items-center gap-1.5"
              style={{ color: C.faint }}
            >
              Overall Rating
              <span style={{ color: C.red }}>*</span>
            </div>
            <div className="flex items-center gap-3">
              <StarRating value={rating} onChange={setRating} size={26} gap={4} />
              {rating > 0 && (
                <span className="text-[13px] font-semibold" style={{ color: C.gold }}>
                  {RATING_LABELS[rating]}
                </span>
              )}
            </div>
          </div>

          {/* Category ratings — optional */}
          <div>
            <div
              className="text-[10.5px] uppercase tracking-[0.26em] mb-3 font-semibold flex items-center gap-2"
              style={{ color: C.faint }}
            >
              Category Ratings
              <span
                className="text-[10px] normal-case tracking-normal font-normal"
                style={{ color: C.dim }}
              >
                optional
              </span>
            </div>
            <div className="space-y-3">
              {cats.map((cat) => (
                <div key={cat.key} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px]" style={{ color: C.muted }}>
                    {cat.label}
                  </span>
                  <StarRating
                    value={categories[cat.key] ?? 0}
                    onChange={(v) =>
                      setCategories((prev) => ({ ...prev, [cat.key]: v }))
                    }
                    size={17}
                    gap={2}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Written review — optional */}
          <div>
            <div
              className="text-[10.5px] uppercase tracking-[0.26em] mb-2 font-semibold flex items-center gap-2"
              style={{ color: C.faint }}
            >
              Written Review
              <span
                className="text-[10px] normal-case tracking-normal font-normal"
                style={{ color: C.dim }}
              >
                optional
              </span>
            </div>
            <textarea
              value={written}
              onChange={(e) => setWritten(e.target.value)}
              placeholder={`Share your experience working with ${reviewedName}…`}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl px-4 py-3 text-[13px] leading-relaxed resize-none outline-none transition-colors"
              style={{
                background: C.surface,
                border:     `1px solid ${C.border}`,
                color:      C.text,
                fontFamily: "inherit",
              }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = C.borderMid; }}
              onBlur={(e)  => { (e.target as HTMLElement).style.borderColor = C.border; }}
            />
            <div
              className="text-right mt-1 text-[10px]"
              style={{ color: written.length > 450 ? C.gold : C.dim }}
            >
              {written.length}/500
            </div>
          </div>

        </div>

        {/* Footer */}
        <div
          className="px-6 pb-6 pt-4 flex gap-2.5 shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <button
            onClick={handleClose}
            className="flex-1 rounded-full h-10 text-[13px] font-medium transition-all"
            style={{
              background: C.surface,
              border:     `1px solid ${C.border}`,
              color:      C.faint,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 btn-primary rounded-full h-10 text-[13px] font-medium inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
