import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowLeft, Check, Camera, X as XIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { AvatarCropModal } from "@/components/app/AvatarCropModal";
import { resolveLocationCoords } from "@/lib/geocoding";
import {
  type CreatorCategory,
  type CreatorOnboardingData,
  CATEGORY_LABELS,
  PLATFORMS,
  CONTENT_TYPES,
  formatFollowers,
  platformShort,
  platformColor,
} from "@/types/creator";
import { C } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/creator-onboarding")({
  head: () => ({ meta: [{ title: "Creator Profile — MRKT" }] }),
  component: CreatorOnboardingPage,
});

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Basic Info", "Creator Details", "Audience", "Collaboration", "Portfolio", "Preview"];

const EMPTY: CreatorOnboardingData = {
  display_name: "", username: "", bio: "",
  location: "", location_area: "", location_city: "", location_country: "",
  profile_image_url: "",
  niche: "", categories: [], platforms: [],
  instagram_handle: "", tiktok_handle: "", youtube_handle: "", follower_count: "",
  audience_location: "", audience_age_range: "", audience_gender_split: "", primary_language: "",
  accepts_paid: true, accepts_gifted: true, accepts_affiliate: false,
  rate_range: "", preferred_content_types: [],
  creator_stage: "growing",
  featured_link_1: "", featured_link_2: "", featured_link_3: "",
  media_kit_url: "", previous_collaborations: "",
};

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as CreatorCategory, label,
}));

// ─────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "oklch(1 0 0 / 38%)" }}>
          {label}
        </label>
        {hint && <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 24%)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", prefix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; prefix?: string;
}) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      {prefix && (
        <span className="px-3.5 shrink-0 text-sm select-none" style={{ color: "oklch(1 0 0 / 28%)", borderRight: "1px solid oklch(1 0 0 / 8%)", paddingTop: "0.6875rem", paddingBottom: "0.6875rem" }}>
          {prefix}
        </span>
      )}
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3.5 py-[0.6875rem] text-sm outline-none placeholder:text-foreground/20"
        style={{ color: "oklch(1 0 0 / 85%)" }}
      />
    </div>
  );
}

function Textarea({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength} rows={3}
        className="w-full bg-transparent px-3.5 py-3.5 text-sm outline-none resize-none placeholder:text-foreground/20"
        style={{ color: "oklch(1 0 0 / 85%)" }}
      />
      {maxLength && (
        <div className="px-3.5 pb-2.5 text-right text-[10px]" style={{ color: "oklch(1 0 0 / 24%)" }}>
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-start justify-between gap-4 w-full rounded-xl px-4 py-3.5 text-left transition-all duration-150"
      style={{
        background: checked ? "oklch(1 0 0 / 5%)" : "oklch(1 0 0 / 2%)",
        border: `1px solid ${checked ? "oklch(0.84 0 0 / 40%)" : "oklch(1 0 0 / 8%)"}`,
      }}
    >
      <div className="flex-1">
        <div className="text-[13px] font-medium" style={{ color: checked ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 55%)" }}>
          {label}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "oklch(1 0 0 / 32%)" }}>{sub}</div>
      </div>
      <div
        className="h-5 w-9 rounded-full shrink-0 flex items-center transition-all duration-200 mt-0.5"
        style={{
          background: checked ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 10%)",
          paddingLeft: checked ? "1.125rem" : "0.25rem",
        }}
      >
        <div className="h-3.5 w-3.5 rounded-full" style={{ background: checked ? "oklch(0.1 0 0)" : "oklch(1 0 0 / 40%)" }} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile image uploader
// ─────────────────────────────────────────────────────────────

function ProfileImageUploader({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef                          = useRef<HTMLInputElement>(null);
  const [uploading,    setUploading]      = useState(false);
  const [dragCounter,  setDragCounter]    = useState(0);
  const [uploadError,  setUploadError]    = useState<string | null>(null);
  const [localPreview, setLocalPreview]   = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput]   = useState(false);
  const [urlDraft,     setUrlDraft]       = useState("");
  const [cropSrc,      setCropSrc]        = useState<string | null>(null);

  const isDragging = dragCounter > 0;
  const displayUrl = localPreview || value;
  const hasImage   = !!displayUrl;

  async function handleFile(file: File) {
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB.");
      return;
    }
    setUploadError(null);

    // Save original silently in background (avatar_original_url)
    const originalPath = `${userId}/original${file.name.match(/\.[^.]+$/)?.[0] ?? ".jpg"}`;
    supabase.storage.from("creator-avatars").upload(originalPath, file, { upsert: true });

    // Open crop modal — user will position before final upload
    const reader = new FileReader();
    reader.onload = e => setCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCropSave(blob: Blob, previewDataUrl: string) {
    setCropSrc(null);
    setUploading(true);
    setLocalPreview(previewDataUrl);

    const path = `${userId}/avatar.jpg`;
    const { error } = await supabase.storage
      .from("creator-avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      setUploadError("Upload failed — check your bucket settings, or paste a URL instead.");
      setLocalPreview(null);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("creator-avatars")
      .getPublicUrl(path);

    onChange(`${urlData.publicUrl}?v=${Date.now()}`);
    setLocalPreview(null);
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragCounter(0);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleRemove() {
    setLocalPreview(null);
    setUploadError(null);
    setShowUrlInput(false);
    onChange("");
  }

  function applyUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange(url);
    setLocalPreview(null);
    setShowUrlInput(false);
    setUrlDraft("");
  }

  return (
    <div className="space-y-3">
      {hasImage ? (
        /* ── Image preview ─────────────────────────────────── */
        <div
          className="flex items-center gap-4 rounded-2xl px-4 py-4"
          style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}
        >
          {/* Avatar circle */}
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-full overflow-hidden" style={{ border: "2px solid oklch(1 0 0 / 12%)" }}>
              <img
                src={displayUrl}
                alt="Profile"
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "oklch(0 0 0 / 65%)" }}>
                <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: "oklch(1 0 0 / 60%) transparent transparent transparent" }} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-1 min-w-0">
            {uploading ? (
              <div className="text-[12.5px]" style={{ color: "oklch(1 0 0 / 40%)" }}>Uploading…</div>
            ) : (
              <>
                <div className="text-[12.5px] font-medium mb-1.5" style={{ color: "oklch(1 0 0 / 62%)" }}>
                  Profile photo set
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-[12px] transition-colors duration-150"
                    style={{ color: "oklch(1 0 0 / 50%)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 80%)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 50%)"; }}
                  >
                    Change photo
                  </button>
                  <span style={{ color: "oklch(1 0 0 / 18%)", userSelect: "none" }}>·</span>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="text-[12px] transition-colors duration-150"
                    style={{ color: "oklch(1 0 0 / 32%)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.52 0.15 24)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 32%)"; }}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Drop zone ─────────────────────────────────────── */
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => { e.preventDefault(); setDragCounter((c) => c + 1); }}
          onDragLeave={() => setDragCounter((c) => Math.max(0, c - 1))}
          className="flex flex-col items-center justify-center rounded-2xl py-9 cursor-pointer text-center select-none transition-all duration-150"
          style={{
            background:   isDragging ? "oklch(1 0 0 / 5%)"                        : "oklch(1 0 0 / 2%)",
            border:       `1.5px dashed ${isDragging ? "oklch(0.84 0 0 / 55%)" : "oklch(1 0 0 / 14%)"}`,
            borderRadius: "16px",
          }}
        >
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center mb-4 transition-all duration-150"
            style={{ background: isDragging ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 5%)" }}
          >
            <Camera className="h-5 w-5 transition-colors duration-150" style={{ color: isDragging ? "oklch(1 0 0 / 65%)" : "oklch(1 0 0 / 32%)" }} />
          </div>
          <div className="text-[13px] font-medium mb-1 transition-colors duration-150" style={{ color: isDragging ? "oklch(1 0 0 / 75%)" : "oklch(1 0 0 / 52%)" }}>
            {isDragging ? "Drop to upload" : "Upload a profile photo"}
          </div>
          <div className="text-[11.5px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
            Drag & drop or click to browse
          </div>
          <div className="text-[10px] mt-2" style={{ color: "oklch(1 0 0 / 20%)" }}>
            JPG, PNG, WebP · Max 5 MB
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Crop modal */}
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          shape="round"
          onSave={handleCropSave}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Error message */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: "oklch(0.52 0.15 24 / 10%)", border: "1px solid oklch(0.52 0.15 24 / 25%)" }}>
          <XIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.52 0.15 24)" }} />
          <span className="text-[11.5px]" style={{ color: C.red }}>{uploadError}</span>
        </div>
      )}

      {/* URL fallback */}
      {!showUrlInput ? (
        <button
          type="button"
          onClick={() => { setShowUrlInput(true); setUrlDraft(value); }}
          className="text-[11px] transition-colors duration-150"
          style={{ color: "oklch(1 0 0 / 22%)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 45%)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 22%)"; }}
        >
          Or paste an image URL
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center rounded-xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3.5%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyUrl(); if (e.key === "Escape") setShowUrlInput(false); }}
                placeholder="https://..."
                autoFocus
                className="flex-1 bg-transparent px-3.5 py-[0.6875rem] text-sm outline-none placeholder:text-foreground/20"
                style={{ color: "oklch(1 0 0 / 85%)" }}
              />
            </div>
            <button
              type="button"
              onClick={applyUrl}
              className="rounded-xl px-4 text-[12.5px] font-medium transition-colors duration-150 shrink-0"
              style={{ background: "oklch(1 0 0 / 8%)", border: "1px solid oklch(1 0 0 / 14%)", color: "oklch(1 0 0 / 72%)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}
            >
              Use URL
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="rounded-xl px-3 shrink-0 transition-colors duration-150"
              style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 30%)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 60%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 30%)"; }}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10.5px]" style={{ color: "oklch(1 0 0 / 26%)" }}>
            Paste a direct link to an image (JPG, PNG, WebP)
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Basic Info
// ─────────────────────────────────────────────────────────────

function StepBasicInfo({ data, set, userId }: { data: CreatorOnboardingData; set: SetFn; userId: string }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Profile Photo <span className="normal-case tracking-normal" style={{ color: "oklch(1 0 0 / 24%)", fontSize: "10px" }}>— Optional</span>
        </label>
        <ProfileImageUploader
          userId={userId}
          value={data.profile_image_url}
          onChange={(url) => set("profile_image_url", url)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Display Name">
          <Input value={data.display_name} onChange={(v) => set("display_name", v)} placeholder="Sofia Marlowe" />
        </Field>
        <Field label="Username" hint="Optional">
          <Input value={data.username} onChange={(v) => set("username", v)} prefix="@" placeholder="sofiamarlow" />
        </Field>
      </div>

      <Field label="Neighborhood or Area" hint="Optional">
        <Input
          value={data.location_area}
          onChange={(v) => set("location_area", v)}
          placeholder="Achrafieh, Hamra, DIFC, Shoreditch…"
        />
        <p className="text-[11px] mt-1.5" style={{ color: "oklch(1 0 0 / 22%)" }}>
          Add your neighborhood so brands can find you more accurately on MRKT Globe.
        </p>
      </Field>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="City" hint="Optional">
          <Input value={data.location_city} onChange={(v) => set("location_city", v)} placeholder="Beirut" />
        </Field>
        <Field label="Country" hint="Optional">
          <Input value={data.location_country} onChange={(v) => set("location_country", v)} placeholder="Lebanon" />
        </Field>
      </div>

      <Field label="Bio" hint="Optional">
        <Textarea
          value={data.bio} onChange={(v) => set("bio", v)}
          placeholder="Sustainable fashion creator based in Paris. Working with brands that align with conscious living."
          maxLength={280}
        />
      </Field>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Creator Details
// ─────────────────────────────────────────────────────────────

function StepCreatorDetails({ data, set, toggleCategory }: {
  data: CreatorOnboardingData; set: SetFn; toggleCategory: (c: CreatorCategory) => void;
}) {
  function togglePlatform(p: string) {
    set("platforms", data.platforms.includes(p)
      ? data.platforms.filter((x) => x !== p)
      : [...data.platforms, p]
    );
  }

  return (
    <div className="space-y-8">
      {/* Niche */}
      <Field label="Primary Niche" hint="Optional">
        <Input
          value={data.niche} onChange={(v) => set("niche", v)}
          placeholder="e.g. Sustainable fashion, Gaming, Food & Nutrition"
        />
      </Field>

      {/* Categories */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Categories
        </div>
        <div className="text-[11px] mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>Select all that apply</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const selected = data.categories.includes(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className="px-3.5 py-2 rounded-full text-[12px] font-medium transition-all duration-150"
                style={{
                  background: selected ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 3%)",
                  border: `1px solid ${selected ? "oklch(0.84 0 0 / 45%)" : "oklch(1 0 0 / 8%)"}`,
                  color: selected ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 40%)",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platforms */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Platforms
        </div>
        <div className="text-[11px] mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>Where do you create content?</div>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const selected = data.platforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className="px-3.5 py-2 rounded-full text-[12px] font-medium transition-all duration-150"
                style={{
                  background: selected ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 3%)",
                  border: `1px solid ${selected ? platformColor(p) : "oklch(1 0 0 / 8%)"}`,
                  color: selected ? platformColor(p) : "oklch(1 0 0 / 40%)",
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Handles */}
      <div className="space-y-4">
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Social Handles <span className="normal-case tracking-normal" style={{ color: "oklch(1 0 0 / 24%)", fontSize: "10px" }}>— Optional</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram">
            <Input value={data.instagram_handle} onChange={(v) => set("instagram_handle", v)} prefix="@" placeholder="username" />
          </Field>
          <Field label="TikTok">
            <Input value={data.tiktok_handle} onChange={(v) => set("tiktok_handle", v)} prefix="@" placeholder="username" />
          </Field>
          <Field label="YouTube">
            <Input value={data.youtube_handle} onChange={(v) => set("youtube_handle", v)} prefix="@" placeholder="channel" />
          </Field>
          <Field label="Total Follower Count" hint="Approximate">
            <Input value={data.follower_count} onChange={(v) => set("follower_count", v)} placeholder="e.g. 280,000" />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Audience
// ─────────────────────────────────────────────────────────────

function StepAudience({ data, set }: { data: CreatorOnboardingData; set: SetFn }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl px-4 py-3.5 text-[11.5px] leading-relaxed" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 40%)" }}>
        Help businesses understand who your audience is. All fields are optional but improve match quality.
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Audience Location">
          <Input value={data.audience_location} onChange={(v) => set("audience_location", v)} placeholder="e.g. US & Canada, Global" />
        </Field>
        <Field label="Primary Language">
          <Input value={data.primary_language} onChange={(v) => set("primary_language", v)} placeholder="e.g. English, French" />
        </Field>
        <Field label="Audience Age Range">
          <Input value={data.audience_age_range} onChange={(v) => set("audience_age_range", v)} placeholder="e.g. 18–34" />
        </Field>
        <Field label="Gender Split">
          <Input value={data.audience_gender_split} onChange={(v) => set("audience_gender_split", v)} placeholder="e.g. 70% Female, 30% Male" />
        </Field>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Collaboration
// ─────────────────────────────────────────────────────────────

function StepCollaboration({ data, set }: { data: CreatorOnboardingData; set: SetFn }) {
  function toggleContentType(ct: string) {
    set("preferred_content_types",
      data.preferred_content_types.includes(ct)
        ? data.preferred_content_types.filter((x) => x !== ct)
        : [...data.preferred_content_types, ct]
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: "oklch(1 0 0 / 38%)" }}>
          What types of collaborations do you accept?
        </div>
        <Toggle
          label="Paid Collaborations"
          sub="Brands pay you a fee for your content or promotion"
          checked={data.accepts_paid}
          onChange={(v) => set("accepts_paid", v)}
        />
        <Toggle
          label="Gifted / Product Seeding"
          sub="Receive free products in exchange for content"
          checked={data.accepts_gifted}
          onChange={(v) => set("accepts_gifted", v)}
        />
        <Toggle
          label="Affiliate Partnerships"
          sub="Earn commission on sales you drive"
          checked={data.accepts_affiliate}
          onChange={(v) => set("accepts_affiliate", v)}
        />
      </div>

      <Field label="Rate Range" hint="Optional">
        <Input
          value={data.rate_range} onChange={(v) => set("rate_range", v)}
          placeholder="e.g. $500–$2,000 per post"
        />
      </Field>

      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] font-medium mb-3" style={{ color: "oklch(1 0 0 / 38%)" }}>
          Preferred Content Types <span className="normal-case tracking-normal" style={{ color: "oklch(1 0 0 / 24%)", fontSize: "10px" }}>— Optional</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => {
            const selected = data.preferred_content_types.includes(ct);
            return (
              <button
                key={ct}
                onClick={() => toggleContentType(ct)}
                className="px-3.5 py-2 rounded-full text-[12px] font-medium transition-all duration-150"
                style={{
                  background: selected ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 3%)",
                  border: `1px solid ${selected ? "oklch(0.84 0 0 / 45%)" : "oklch(1 0 0 / 8%)"}`,
                  color: selected ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 40%)",
                }}
              >
                {ct}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 5 — Portfolio
// ─────────────────────────────────────────────────────────────

function StepPortfolio({ data, set }: { data: CreatorOnboardingData; set: SetFn }) {
  const isBeginner = data.creator_stage === "beginner";

  function toggleBeginner() {
    set("creator_stage", isBeginner ? "growing" : "beginner");
  }

  return (
    <div className="space-y-5">

      {/* ── Just starting out toggle ─────────────────────────────── */}
      <button
        type="button"
        onClick={toggleBeginner}
        className="w-full flex items-center justify-between rounded-2xl px-5 py-4 text-left transition-all duration-200"
        style={{
          background: isBeginner ? "oklch(1 0 0 / 6%)" : "oklch(1 0 0 / 3%)",
          border: `1px solid ${isBeginner ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 8%)"}`,
        }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-[13.5px] font-semibold" style={{ color: "oklch(1 0 0 / 88%)" }}>
            Just starting out
          </div>
          <div className="text-[11.5px] mt-0.5 leading-relaxed" style={{ color: "oklch(1 0 0 / 42%)" }}>
            No portfolio yet? That's completely fine. You can add links anytime from your profile.
          </div>
        </div>
        {/* Toggle pill */}
        <div
          className="shrink-0 h-6 w-11 rounded-full transition-all duration-200 relative"
          style={{ background: isBeginner ? "oklch(0.84 0 0)" : "oklch(1 0 0 / 15%)" }}
        >
          <div
            className="absolute top-[3px] h-[18px] w-[18px] rounded-full transition-all duration-200"
            style={{
              background: isBeginner ? "oklch(0.06 0 0)" : "oklch(0.55 0 0)",
              left: isBeginner ? "calc(100% - 21px)" : "3px",
            }}
          />
        </div>
      </button>

      {/* ── Beginner state ───────────────────────────────────────── */}
      {isBeginner ? (
        <div className="rounded-2xl px-5 py-6 text-center space-y-2" style={{ background: "oklch(1 0 0 / 2%)", border: "1px solid oklch(1 0 0 / 7%)" }}>
          <div className="text-[14px] font-medium" style={{ color: "oklch(1 0 0 / 70%)" }}>
            You're all set for this step.
          </div>
          <div className="text-[12px] leading-relaxed max-w-xs mx-auto" style={{ color: "oklch(1 0 0 / 35%)" }}>
            Your profile will show <span style={{ color: "oklch(1 0 0 / 55%)" }}>Emerging Creator</span> — letting businesses know you're building your portfolio. You can add links at any time.
          </div>
        </div>
      ) : (
        /* ── Portfolio fields ───────────────────────────────────── */
        <>
          <div className="rounded-xl px-4 py-3.5 text-[11.5px] leading-relaxed" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 40%)" }}>
            Add links to your best work — a post, portfolio site, or any URL that shows what you create.
          </div>

          <Field label="Featured Link 1" hint="Optional">
            <Input value={data.featured_link_1} onChange={(v) => set("featured_link_1", v)} placeholder="https://..." prefix="↗" />
          </Field>
          <Field label="Featured Link 2" hint="Optional">
            <Input value={data.featured_link_2} onChange={(v) => set("featured_link_2", v)} placeholder="https://..." prefix="↗" />
          </Field>
          <Field label="Featured Link 3" hint="Optional">
            <Input value={data.featured_link_3} onChange={(v) => set("featured_link_3", v)} placeholder="https://..." prefix="↗" />
          </Field>

          <Field label="Media Kit URL" hint="Optional — PDF">
            <Input value={data.media_kit_url} onChange={(v) => set("media_kit_url", v)} placeholder="https://..." prefix="↗" />
          </Field>

          <Field label="Previous Collaborations" hint="Optional">
            <Textarea
              value={data.previous_collaborations} onChange={(v) => set("previous_collaborations", v)}
              placeholder="e.g. Nike, Glossier, Airbnb — summer 2024 campaign"
              maxLength={400}
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 6 — Preview
// ─────────────────────────────────────────────────────────────

function completionInfo(d: CreatorOnboardingData) {
  const checks = [
    { label: "Display name",     ok: !!d.display_name.trim() },
    { label: "Bio",              ok: !!d.bio.trim() },
    { label: "Category",         ok: d.categories.length > 0 },
    { label: "Platform",         ok: d.platforms.length > 0 },
  ];
  return {
    score:   checks.filter((c) => c.ok).length,
    total:   checks.length,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

function StepPreview({ data, saving, onPublish, onDraft, isEdit }: {
  data: CreatorOnboardingData; saving: boolean; onPublish: () => void; onDraft: () => void; isEdit: boolean;
}) {
  const { score, total, missing } = completionInfo(data);
  const isComplete = score === total;
  const pct = (score / total) * 100;
  const followerNum = parseFollowers(data.follower_count);

  return (
    <div className="space-y-6">
      {/* Completion meter */}
      {!isComplete && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium" style={{ color: "oklch(1 0 0 / 55%)" }}>Profile completion</span>
            <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 38%)" }}>{score}/{total}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "oklch(0.84 0 0)" }} />
          </div>
          {missing.length > 0 && (
            <p className="text-[11px]" style={{ color: "oklch(1 0 0 / 35%)" }}>
              Still needed: {missing.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Profile card preview */}
      <div>
        <div className="text-[9.5px] uppercase tracking-[0.28em] font-medium mb-3" style={{ color: "oklch(1 0 0 / 28%)" }}>
          How businesses will see your profile
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="px-5 py-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center text-lg font-bold"
                style={{
                  background: data.profile_image_url ? `url(${data.profile_image_url}) center/cover` : "oklch(0.72 0.09 20)",
                  color: "oklch(0.1 0 0)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                }}
              >
                {!data.profile_image_url && (data.display_name?.[0] || "C")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold" style={{ color: "oklch(1 0 0 / 88%)" }}>
                  {data.display_name || "Your Display Name"}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {data.username && (
                    <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 35%)" }}>@{data.username}</span>
                  )}
                  {data.location && (
                    <span className="text-[11px]" style={{ color: "oklch(1 0 0 / 35%)" }}>{data.location}</span>
                  )}
                </div>
              </div>
              {followerNum > 0 && (
                <div className="text-right shrink-0">
                  <div className="text-[15px] font-semibold" style={{ color: "oklch(1 0 0 / 84%)" }}>{formatFollowers(followerNum)}</div>
                  <div className="text-[9.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 30%)" }}>Followers</div>
                </div>
              )}
            </div>

            {data.bio && (
              <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: "oklch(1 0 0 / 55%)" }}>{data.bio}</p>
            )}

            {(data.niche || data.categories.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {data.niche && (
                  <span className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 55%)", border: "1px solid oklch(1 0 0 / 10%)" }}>
                    {data.niche}
                  </span>
                )}
                {data.categories.map((c) => (
                  <span key={c} className="text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 7%)", color: "oklch(1 0 0 / 42%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                    {CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c}
                  </span>
                ))}
              </div>
            )}

            {data.platforms.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {data.platforms.map((p) => (
                  <span
                    key={p}
                    className="text-[9px] font-bold rounded-full px-2.5 py-1"
                    style={{ background: "oklch(1 0 0 / 7%)", color: platformColor(p), border: "1px solid oklch(1 0 0 / 8%)" }}
                  >
                    {platformShort(p)}
                  </span>
                ))}
              </div>
            )}

            {(data.accepts_paid || data.accepts_gifted || data.accepts_affiliate) && (
              <div className="flex flex-wrap gap-1.5">
                {data.accepts_paid && (
                  <span className="text-[10px] rounded-full px-2.5 py-0.5" style={{ background: "oklch(1 0 0 / 12%)", color: "oklch(0.84 0 0)", border: "1px solid oklch(1 0 0 / 25%)" }}>
                    Paid
                  </span>
                )}
                {data.accepts_gifted && (
                  <span className="text-[10px] rounded-full px-2.5 py-0.5" style={{ background: C.blueBg, color: C.aiBlue, border: `1px solid ${C.blueBorder}` }}>
                    Gifted
                  </span>
                )}
                {data.accepts_affiliate && (
                  <span className="text-[10px] rounded-full px-2.5 py-0.5" style={{ background: C.amberMuted, color: C.amber, border: `1px solid ${C.amberBorder}` }}>
                    Affiliate
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onPublish}
          disabled={saving || !isComplete}
          className="btn-primary w-full h-12 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
          style={{ opacity: isComplete ? 1 : 0.35 }}
        >
          {saving ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save & Go Live" : "Go Live on MRKT")}
          {!saving && <ArrowUpRight className="h-4 w-4" />}
        </button>
        {!isComplete && (
          <p className="text-center text-[11px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
            Complete the required fields above to go live.
          </p>
        )}
        <button
          onClick={onDraft}
          disabled={saving}
          className="w-full h-11 rounded-full text-sm transition-colors duration-150"
          style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 45%)" }}
        >
          Save as Draft
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type SetFn = <K extends keyof CreatorOnboardingData>(k: K, v: CreatorOnboardingData[K]) => void;

function parseFollowers(s: string): number {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function CreatorOnboardingPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [step,              setStep]              = useState(1);
  const [data,              setData]              = useState<CreatorOnboardingData>(EMPTY);
  const [saving,            setSaving]            = useState(false);
  const [loadingProfile,    setLoadingProfile]    = useState(true);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase
      .from("creator_profiles")
      .select("id,display_name,username,bio,location,location_area,location_city,location_country,profile_image_url,niche,categories,platforms,instagram_handle,tiktok_handle,youtube_handle,follower_count,audience_location,audience_age_range,audience_gender_split,primary_language,accepts_paid,accepts_gifted,accepts_affiliate,rate_range,preferred_content_types,featured_link_1,featured_link_2,featured_link_3,media_kit_url,previous_collaborations,creator_stage,status,is_public")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: existing }: { data: Record<string, unknown> | null }) => {
        if (existing) {
          setExistingProfileId(existing.id as string);

          // Populate structured location fields.
          // If the new columns are empty (existing profile, old format), parse
          // the legacy "location" text so the user sees pre-filled fields.
          const rawLoc      = (existing.location as string) ?? "";
          const storedArea  = (existing.location_area as string)    ?? "";
          const storedCity  = (existing.location_city as string)    ?? "";
          const storedCtry  = (existing.location_country as string) ?? "";
          let fallbackArea = "", fallbackCity = storedCity, fallbackCtry = storedCtry;
          if (!storedCity && rawLoc) {
            const parts = rawLoc.split(",").map((s) => s.trim()).filter(Boolean);
            if (parts.length >= 3) {
              fallbackArea = parts[0];
              fallbackCity = parts[1];
              fallbackCtry = parts.slice(2).join(", ");
            } else if (parts.length === 2) {
              fallbackCity = parts[0];
              fallbackCtry = parts[1];
            } else {
              fallbackCity = parts[0] ?? "";
            }
          }

          setData({
            display_name:            (existing.display_name as string)           ?? "",
            username:                (existing.username as string)               ?? "",
            bio:                     (existing.bio as string)                    ?? "",
            location:                rawLoc,
            location_area:           storedArea  || fallbackArea,
            location_city:           storedCity  || fallbackCity,
            location_country:        storedCtry  || fallbackCtry,
            profile_image_url:       (existing.profile_image_url as string)      ?? "",
            niche:                   (existing.niche as string)                  ?? "",
            categories:              (existing.categories as CreatorCategory[])  ?? [],
            platforms:               (existing.platforms as string[])            ?? [],
            instagram_handle:        (existing.instagram_handle as string)       ?? "",
            tiktok_handle:           (existing.tiktok_handle as string)          ?? "",
            youtube_handle:          (existing.youtube_handle as string)         ?? "",
            follower_count:          existing.follower_count != null ? String(existing.follower_count) : "",
            audience_location:       (existing.audience_location as string)      ?? "",
            audience_age_range:      (existing.audience_age_range as string)     ?? "",
            audience_gender_split:   (existing.audience_gender_split as string)  ?? "",
            primary_language:        (existing.primary_language as string)       ?? "",
            accepts_paid:            (existing.accepts_paid as boolean)          ?? true,
            accepts_gifted:          (existing.accepts_gifted as boolean)        ?? true,
            accepts_affiliate:       (existing.accepts_affiliate as boolean)     ?? false,
            rate_range:              (existing.rate_range as string)             ?? "",
            preferred_content_types: (existing.preferred_content_types as string[]) ?? [],
            creator_stage:           (existing.creator_stage as "beginner" | "growing" | "established") ?? "growing",
            featured_link_1:         (existing.featured_link_1 as string)        ?? "",
            featured_link_2:         (existing.featured_link_2 as string)        ?? "",
            featured_link_3:         (existing.featured_link_3 as string)        ?? "",
            media_kit_url:           (existing.media_kit_url as string)          ?? "",
            previous_collaborations: (existing.previous_collaborations as string) ?? "",
          });
        }
        setLoadingProfile(false);
      });
  }, [user]);

  function set<K extends keyof CreatorOnboardingData>(k: K, v: CreatorOnboardingData[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function toggleCategory(cat: CreatorCategory) {
    setData((d) => ({
      ...d,
      categories: d.categories.includes(cat)
        ? d.categories.filter((c) => c !== cat)
        : [...d.categories, cat],
    }));
  }

  function canProceed(): boolean {
    if (step === 1) return !!data.display_name.trim();
    if (step === 2) return data.categories.length > 0 && data.platforms.length > 0;
    return true;
  }

  async function submitProfile(publish: boolean) {
    if (!user) {
      toast.error("You must be signed in to save your profile.");
      return;
    }
    setSaving(true);
    try {
      // ── Build payload ──────────────────────────────────────────────────────
      // updated_at is intentionally omitted — the BEFORE UPDATE trigger
      // (creator_profiles_touch → touch_updated_at) handles it server-side.
      // Resolve coordinates at save time — stored in DB so Globe never needs
      // to geocode at query time and jitter is stable across sessions.
      const areaVal    = data.location_area.trim();
      const cityVal    = data.location_city.trim();
      const countryVal = data.location_country.trim();
      const composedLocation = [areaVal, cityVal, countryVal].filter(Boolean).join(", ") || null;
      const { lat: resolvedLat, lng: resolvedLng } = resolveLocationCoords(areaVal, cityVal, user.id);

      const payload = {
        user_id:                 user.id,
        display_name:            data.display_name.trim(),
        username:                data.username.trim()                || null,
        bio:                     data.bio.trim()                     || null,
        location:                composedLocation,
        location_area:           areaVal    || null,
        location_city:           cityVal    || null,
        location_country:        countryVal || null,
        location_lat:            resolvedLat,
        location_lng:            resolvedLng,
        profile_image_url:       data.profile_image_url.trim()       || null,
        niche:                   data.niche.trim()                   || null,
        categories:              data.categories,
        platforms:               data.platforms,
        instagram_handle:        data.instagram_handle.trim()        || null,
        tiktok_handle:           data.tiktok_handle.trim()           || null,
        youtube_handle:          data.youtube_handle.trim()          || null,
        follower_count:          parseFollowers(data.follower_count)  || null,
        audience_location:       data.audience_location.trim()       || null,
        audience_age_range:      data.audience_age_range.trim()      || null,
        audience_gender_split:   data.audience_gender_split.trim()   || null,
        primary_language:        data.primary_language.trim()        || null,
        accepts_paid:            data.accepts_paid,
        accepts_gifted:          data.accepts_gifted,
        accepts_affiliate:       data.accepts_affiliate,
        rate_range:              data.rate_range.trim()              || null,
        preferred_content_types: data.preferred_content_types,
        creator_stage:           data.creator_stage,
        featured_link_1:         data.featured_link_1.trim()         || null,
        featured_link_2:         data.featured_link_2.trim()         || null,
        featured_link_3:         data.featured_link_3.trim()         || null,
        media_kit_url:           data.media_kit_url.trim()           || null,
        previous_collaborations: data.previous_collaborations.trim() || null,
        is_public:               true,
        status:                  publish ? "active" : "incomplete",
      };

      console.debug("[creator-onboarding] upserting payload:", payload);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("creator_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        // Log the full Supabase error object so we can diagnose DB-level issues
        console.error("[creator-onboarding] upsert error:", error);
        throw error;
      }

      const isUpdate = !!existingProfileId;
      toast.success(
        publish
          ? isUpdate ? "Profile updated and live." : "You're live on MRKT! Businesses can now find you."
          : "Draft saved."
      );

      // Broadcast live avatar update so AppShell + other components refresh without reload
      if (data.profile_image_url) {
        window.dispatchEvent(new CustomEvent("mrkt:avatar-updated", { detail: { url: data.profile_image_url } }));
      }

      // First-time publish → trigger AI welcome session in the strategist
      if (publish && !isUpdate) {
        const profile = {
          name:        data.display_name,
          niche:       data.niche,
          categories:  data.categories,
          platforms:   data.platforms,
          location:    [data.location_city, data.location_country].filter(Boolean).join(", "),
          audience:    data.audience_location,
          rate:        data.rate_range,
          instagram:   data.instagram_handle,
        };
        localStorage.setItem("mrkt_creator_welcome_pending", JSON.stringify(profile));
        nav({ to: "/chat" });
      } else {
        nav({ to: "/home" });
      }
    } catch (e: unknown) {
      // PostgrestError is a plain object { message, code, details, hint } — not
      // an Error instance — so we must check .message directly, not instanceof.
      console.error("[creator-onboarding] submitProfile caught:", e);
      const errObj = e as { message?: string; details?: string; hint?: string; code?: string };
      const msg = errObj?.message ?? (e instanceof Error ? e.message : "Something went wrong.");
      const detail = errObj?.details ?? errObj?.hint ?? undefined;
      toast.error(msg, { description: detail });
    } finally {
      setSaving(false);
    }
  }

  const progress  = (step / 6) * 100;
  const isEdit    = !!existingProfileId;

  const stepTitles = [
    { eyebrow: "Step 01 of 06", headline: isEdit ? "Update your identity." : "Build your creator profile.", sub: "This is the public identity businesses will see on MRKT." },
    { eyebrow: "Step 02 of 06", headline: "What do you create?",     sub: "Choose your categories, platforms, and social handles." },
    { eyebrow: "Step 03 of 06", headline: "Who's your audience?",    sub: "Help brands understand who follows your content." },
    { eyebrow: "Step 04 of 06", headline: "How do you collaborate?", sub: "Set your preferences so brands know how to work with you." },
    { eyebrow: "Step 05 of 06", headline: "Show your work.",         sub: "Add links to your best content or portfolio." },
    { eyebrow: "Step 06 of 06", headline: isEdit ? "Review your changes." : "Ready to go live.", sub: isEdit ? "Review your updates before saving." : "Preview your profile before publishing to MRKT." },
  ];
  const current = stepTitles[step - 1];

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="px-6 h-16 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <Link to="/chat"><Logo /></Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-[11px] uppercase tracking-[0.24em]" style={{ color: "oklch(1 0 0 / 28%)" }}>
            {isEdit ? "Edit Profile" : STEP_LABELS[step - 1]}
          </span>
          <Link to="/chat" className="text-sm transition-colors duration-200" style={{ color: "oklch(1 0 0 / 32%)" }}>
            {isEdit ? "← Back" : "Skip for now"}
          </Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-[2px] shrink-0" style={{ background: "oklch(1 0 0 / 5%)" }}>
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: "oklch(1 0 0 / 55%)" }} />
      </div>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-6 py-14">
          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-[0.32em] font-medium mb-4" style={{ color: "oklch(1 0 0 / 28%)" }}>
              {current.eyebrow}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.06] mb-3">
              {current.headline}
            </h1>
            <p className="text-[1rem] font-light leading-relaxed" style={{ color: "oklch(1 0 0 / 44%)" }}>
              {current.sub}
            </p>
          </div>

          {step === 1 && <StepBasicInfo data={data} set={set} userId={user?.id ?? ""} />}
          {step === 2 && <StepCreatorDetails data={data} set={set} toggleCategory={toggleCategory} />}
          {step === 3 && <StepAudience data={data} set={set} />}
          {step === 4 && <StepCollaboration data={data} set={set} />}
          {step === 5 && <StepPortfolio data={data} set={set} />}
          {step === 6 && (
            <StepPreview
              data={data} saving={saving}
              onPublish={() => submitProfile(true)}
              onDraft={() => submitProfile(false)}
              isEdit={isEdit}
            />
          )}

          {step < 6 && (
            <div className="mt-10 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-2 text-sm transition-colors duration-150"
                style={{ color: step === 1 ? "oklch(1 0 0 / 18%)" : "oklch(1 0 0 / 40%)" }}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                disabled={!canProceed()}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
                style={{ opacity: canProceed() ? 1 : 0.4 }}
              >
                Continue <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


