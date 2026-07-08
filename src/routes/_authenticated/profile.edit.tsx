// ─────────────────────────────────────────────────────────────────────────────
// /profile/edit — Edit creator profile without re-running onboarding
// Pre-fills all existing data. Saves each section independently.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AvatarCropModal } from "@/components/app/AvatarCropModal";
import {
  ArrowLeft, Camera, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  type CreatorCategory, type CreatorOnboardingData,
  CATEGORY_LABELS, PLATFORMS, CONTENT_TYPES, formatFollowers, platformColor, platformShort,
} from "@/types/creator";
import { C } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({ meta: [{ title: "Edit Profile — MRKT" }] }),
  component: EditProfilePage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFollowers(v: string): number | null {
  if (!v) return null;
  const clean = v.replace(/[,\s]/g, "");
  const n = parseFloat(clean);
  if (isNaN(n)) return null;
  if (clean.toLowerCase().endsWith("k")) return Math.round(n * 1000);
  if (clean.toLowerCase().endsWith("m")) return Math.round(n * 1_000_000);
  return Math.round(n);
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.24em] font-semibold mb-1.5" style={{ color: C.textQuaternary }}>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, prefix }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; prefix?: string;
}) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)" }}>
      {prefix && (
        <span className="pl-3 pr-1 text-[12px]" style={{ color: C.textQuaternary }}>{prefix}</span>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2.5 text-[13px] outline-none bg-transparent"
        style={{ color: C.textPrimary }}
      />
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
      style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 10%)", color: C.textPrimary }}
    />
  );
}

function SaveBtn({ saving, onClick, label = "Save" }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-full px-4 h-8 text-[12px] font-semibold transition-all disabled:opacity-60"
      style={{ background: C.chrome, color: "oklch(0.06 0 0)" }}
    >
      {saving
        ? <span className="h-3 w-3 rounded-full border-2 border-black/25 border-t-black/70 animate-spin" />
        : <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

// Collapsible section
function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <span className="text-[13px] font-semibold" style={{ color: C.text }}>{title}</span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5" style={{ color: C.faint }} />
          : <ChevronDown className="h-3.5 w-3.5" style={{ color: C.faint }} />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v as CreatorCategory, label: l }));

function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null); // section being saved
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [data, setData] = useState<CreatorOnboardingData>({
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
  });

  function set<K extends keyof CreatorOnboardingData>(k: K, v: CreatorOnboardingData[K]) {
    setData(prev => ({ ...prev, [k]: v }));
  }

  // ── Load existing profile ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    const { data: cp } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cp) { setLoading(false); return; }

    setProfileId(cp.id);
    setData({
      display_name:            cp.display_name ?? "",
      username:                cp.username ?? "",
      bio:                     cp.bio ?? "",
      location:                cp.location ?? "",
      location_area:           cp.location_area ?? "",
      location_city:           cp.location_city ?? "",
      location_country:        cp.location_country ?? "",
      profile_image_url:       cp.profile_image_url ?? "",
      niche:                   cp.niche ?? "",
      categories:              (cp.categories ?? []) as CreatorCategory[],
      platforms:               cp.platforms ?? [],
      instagram_handle:        cp.instagram_handle ?? "",
      tiktok_handle:           cp.tiktok_handle ?? "",
      youtube_handle:          cp.youtube_handle ?? "",
      follower_count:          cp.follower_count ? String(cp.follower_count) : "",
      audience_location:       cp.audience_location ?? "",
      audience_age_range:      cp.audience_age_range ?? "",
      audience_gender_split:   cp.audience_gender_split ?? "",
      primary_language:        cp.primary_language ?? "",
      accepts_paid:            cp.accepts_paid ?? true,
      accepts_gifted:          cp.accepts_gifted ?? true,
      accepts_affiliate:       cp.accepts_affiliate ?? false,
      rate_range:              cp.rate_range ?? "",
      preferred_content_types: cp.preferred_content_types ?? [],
      creator_stage:           (cp.creator_stage ?? "growing") as "growing" | "established" | "beginner",
      featured_link_1:         cp.featured_link_1 ?? "",
      featured_link_2:         cp.featured_link_2 ?? "",
      featured_link_3:         cp.featured_link_3 ?? "",
      media_kit_url:           cp.media_kit_url ?? "",
      previous_collaborations: cp.previous_collaborations ?? "",
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Save section ──────────────────────────────────────────────────────────
  async function save(section: string, patch: Partial<Record<string, unknown>>) {
    if (!user) return;
    setSaving(section);
    try {
      // This is always an update to an existing row created during onboarding
      // (display_name is only required by the Insert variant of this type);
      // `patch` is intentionally a generic partial-field bag shared by every
      // section of this edit form.
      const { error } = await supabase
        .from("creator_profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ user_id: user.id, ...patch } as any, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Saved.");
      if (patch.profile_image_url) {
        window.dispatchEvent(new CustomEvent("mrkt:avatar-updated", { detail: { url: patch.profile_image_url } }));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(null);
    }
  }

  // ── Avatar upload ──────────────────────────────────────────────────────────
  async function onAvatarCropped(blob: Blob) {
    if (!user) return;
    setCropSrc(null);
    setSaving("avatar");
    try {
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from("creator-avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("creator-avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      set("profile_image_url", url);
      await save("avatar", { profile_image_url: url });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: C.canvas }}>
        <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  const initial = (data.display_name || user?.email || "?")[0].toUpperCase();

  return (
    <div className="flex-1 overflow-y-auto min-h-0" style={{ background: C.canvas }}>
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onSave={(blob) => onAvatarCropped(blob)}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/profile"
            className="h-8 w-8 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div>
            <h1 className="text-[20px] font-bold leading-tight" style={{ color: C.text }}>Edit Profile</h1>
            <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>Changes save immediately per section.</p>
          </div>
          <Link
            to="/verification"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12px] font-medium transition-all"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
          >
            Verification →
          </Link>
        </div>

        {/* Avatar */}
        <Section title="Avatar">
          <div className="flex items-center gap-4 pt-1">
            <div className="relative shrink-0">
              {data.profile_image_url ? (
                <img src={data.profile_image_url} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover" style={{ border: `1px solid ${C.border}` }} />
              ) : (
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-[20px] font-bold"
                  style={{ background: "oklch(0.68 0.12 25)", color: "oklch(0.98 0 0)" }}>
                  {initial}
                </div>
              )}
              <button
                type="button"
                onClick={() => document.getElementById("avatar-file-input")?.click()}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center"
                style={{ background: C.chrome, color: "oklch(0.06 0 0)", border: `2px solid ${C.canvas}` }}
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                id="avatar-file-input" type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { if (ev.target?.result) setCropSrc(ev.target.result as string); };
                  reader.readAsDataURL(f);
                }}
              />
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: C.text }}>{data.display_name || "Your name"}</p>
              <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>Click the camera to update your photo.</p>
              {saving === "avatar" && <p className="text-[11px] mt-1" style={{ color: C.chrome }}>Uploading…</p>}
            </div>
          </div>
        </Section>

        {/* Basic info */}
        <Section title="Basic Info">
          <div>
            <Label>Display name</Label>
            <Input value={data.display_name} onChange={(v) => set("display_name", v)} placeholder="Sofia Marlowe" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={data.username} onChange={(v) => set("username", v)} prefix="@" placeholder="sofiamarlow" />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={data.bio} onChange={(v) => set("bio", v)} placeholder="Tell brands who you are…" rows={3} />
          </div>
          <SaveBtn saving={saving === "basic"} onClick={() => save("basic", {
            display_name: data.display_name.trim(),
            username:     data.username.trim().toLowerCase() || null,
            bio:          data.bio.trim() || null,
          })} />
        </Section>

        {/* Location */}
        <Section title="Location" defaultOpen={false}>
          <div>
            <Label>Region / Area</Label>
            <Input value={data.location_area} onChange={(v) => set("location_area", v)} placeholder="Middle East, MENA" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={data.location_city} onChange={(v) => set("location_city", v)} placeholder="Beirut" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={data.location_country} onChange={(v) => set("location_country", v)} placeholder="Lebanon" />
            </div>
          </div>
          <SaveBtn saving={saving === "location"} onClick={() => save("location", {
            location_area:    data.location_area.trim() || null,
            location_city:    data.location_city.trim() || null,
            location_country: data.location_country.trim() || null,
            location:         [data.location_city, data.location_country].filter(Boolean).join(", ") || null,
          })} />
        </Section>

        {/* Platforms */}
        <Section title="Platforms" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const on = data.platforms.includes(p);
              return (
                <button
                  key={p} type="button"
                  onClick={() => set("platforms", on ? data.platforms.filter(x => x !== p) : [...data.platforms, p])}
                  className="rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all"
                  style={{
                    background: on ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                    border: `1px solid ${on ? "oklch(1 0 0 / 30%)" : "oklch(1 0 0 / 10%)"}`,
                    color: on ? platformColor(p) : C.muted,
                  }}
                >
                  {platformShort(p)}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Instagram handle</Label>
              <Input value={data.instagram_handle} onChange={(v) => set("instagram_handle", v)} prefix="@" placeholder="username" />
            </div>
            <div>
              <Label>TikTok handle</Label>
              <Input value={data.tiktok_handle} onChange={(v) => set("tiktok_handle", v)} prefix="@" placeholder="username" />
            </div>
            <div>
              <Label>YouTube channel</Label>
              <Input value={data.youtube_handle} onChange={(v) => set("youtube_handle", v)} prefix="@" placeholder="channel" />
            </div>
            <div>
              <Label>Follower count</Label>
              <Input value={data.follower_count} onChange={(v) => set("follower_count", v)} placeholder="e.g. 280,000" />
            </div>
          </div>
          <SaveBtn saving={saving === "platforms"} onClick={() => save("platforms", {
            platforms:        data.platforms,
            instagram_handle: data.instagram_handle.trim() || null,
            tiktok_handle:    data.tiktok_handle.trim() || null,
            youtube_handle:   data.youtube_handle.trim() || null,
            follower_count:   parseFollowers(data.follower_count),
          })} />
        </Section>

        {/* Niches */}
        <Section title="Niche & Categories" defaultOpen={false}>
          <div>
            <Label>Primary niche</Label>
            <Input value={data.niche} onChange={(v) => set("niche", v)} placeholder="e.g. Travel, Fitness, Tech" />
          </div>
          <div>
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CATEGORIES.map(({ value, label }) => {
                const on = data.categories.includes(value);
                return (
                  <button
                    key={value} type="button"
                    onClick={() => set("categories", on ? data.categories.filter(x => x !== value) : [...data.categories, value])}
                    className="rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-all"
                    style={{
                      background: on ? C.accentMuted : "oklch(1 0 0 / 4%)",
                      border: `1px solid ${on ? C.accentBorder : "oklch(1 0 0 / 10%)"}`,
                      color: on ? C.accent : C.muted,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <SaveBtn saving={saving === "niches"} onClick={() => save("niches", {
            niche:      data.niche.trim() || null,
            categories: data.categories,
          })} />
        </Section>

        {/* Audience */}
        <Section title="Audience" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Audience location</Label>
              <Input value={data.audience_location} onChange={(v) => set("audience_location", v)} placeholder="US & Canada, Global" />
            </div>
            <div>
              <Label>Primary language</Label>
              <Input value={data.primary_language} onChange={(v) => set("primary_language", v)} placeholder="English, Arabic" />
            </div>
            <div>
              <Label>Age range</Label>
              <Input value={data.audience_age_range} onChange={(v) => set("audience_age_range", v)} placeholder="18–34" />
            </div>
            <div>
              <Label>Gender split</Label>
              <Input value={data.audience_gender_split} onChange={(v) => set("audience_gender_split", v)} placeholder="70% Female" />
            </div>
          </div>
          <SaveBtn saving={saving === "audience"} onClick={() => save("audience", {
            audience_location:     data.audience_location.trim() || null,
            primary_language:      data.primary_language.trim() || null,
            audience_age_range:    data.audience_age_range.trim() || null,
            audience_gender_split: data.audience_gender_split.trim() || null,
          })} />
        </Section>

        {/* Rates & Collaboration */}
        <Section title="Rates & Collaboration" defaultOpen={false}>
          <div>
            <Label>Rate range</Label>
            <Input value={data.rate_range} onChange={(v) => set("rate_range", v)} placeholder="e.g. $500–$2,000 per post" />
          </div>
          <div>
            <Label>Collaboration types</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {[
                { key: "accepts_paid" as const,      label: "Paid"       },
                { key: "accepts_gifted" as const,    label: "Gifted"     },
                { key: "accepts_affiliate" as const, label: "Affiliate"  },
              ].map(({ key, label }) => (
                <button
                  key={key} type="button"
                  onClick={() => set(key, !data[key])}
                  className="rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-all"
                  style={{
                    background: data[key] ? "oklch(0.72 0.18 152 / 12%)" : "oklch(1 0 0 / 4%)",
                    border: `1px solid ${data[key] ? "oklch(0.72 0.18 152 / 30%)" : "oklch(1 0 0 / 10%)"}`,
                    color: data[key] ? "oklch(0.62 0.12 158)" : C.muted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Content types</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CONTENT_TYPES.map((ct) => {
                const on = data.preferred_content_types.includes(ct);
                return (
                  <button
                    key={ct} type="button"
                    onClick={() => set("preferred_content_types", on
                      ? data.preferred_content_types.filter(x => x !== ct)
                      : [...data.preferred_content_types, ct])}
                    className="rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-all"
                    style={{
                      background: on ? "oklch(1 0 0 / 9%)" : "oklch(1 0 0 / 4%)",
                      border: `1px solid ${on ? "oklch(1 0 0 / 22%)" : "oklch(1 0 0 / 10%)"}`,
                      color: on ? C.text : C.muted,
                    }}
                  >
                    {ct}
                  </button>
                );
              })}
            </div>
          </div>
          <SaveBtn saving={saving === "rates"} onClick={() => save("rates", {
            rate_range:              data.rate_range.trim() || null,
            accepts_paid:            data.accepts_paid,
            accepts_gifted:          data.accepts_gifted,
            accepts_affiliate:       data.accepts_affiliate,
            preferred_content_types: data.preferred_content_types,
          })} />
        </Section>

        {/* Portfolio */}
        <Section title="Portfolio & Links" defaultOpen={false}>
          <div>
            <Label>Featured link 1</Label>
            <Input value={data.featured_link_1} onChange={(v) => set("featured_link_1", v)} placeholder="https://…" />
          </div>
          <div>
            <Label>Featured link 2</Label>
            <Input value={data.featured_link_2} onChange={(v) => set("featured_link_2", v)} placeholder="https://…" />
          </div>
          <div>
            <Label>Featured link 3</Label>
            <Input value={data.featured_link_3} onChange={(v) => set("featured_link_3", v)} placeholder="https://…" />
          </div>
          <div>
            <Label>Media kit URL</Label>
            <Input value={data.media_kit_url} onChange={(v) => set("media_kit_url", v)} placeholder="https://…" />
          </div>
          <div>
            <Label>Previous collaborations</Label>
            <Textarea value={data.previous_collaborations} onChange={(v) => set("previous_collaborations", v)} placeholder="Brands you've worked with…" rows={2} />
          </div>
          <SaveBtn saving={saving === "portfolio"} onClick={() => save("portfolio", {
            featured_link_1:         data.featured_link_1.trim() || null,
            featured_link_2:         data.featured_link_2.trim() || null,
            featured_link_3:         data.featured_link_3.trim() || null,
            media_kit_url:           data.media_kit_url.trim() || null,
            previous_collaborations: data.previous_collaborations.trim() || null,
          })} />
        </Section>

        {/* Bottom spacer + profile link */}
        <div className="flex items-center justify-between py-2">
          <Link
            to="/profile"
            className="text-[12px] transition-colors"
            style={{ color: C.chrome }}
          >
            ← View public profile
          </Link>
          <Link
            to="/verification"
            className="text-[12px] transition-colors"
            style={{ color: C.muted }}
          >
            Verification settings →
          </Link>
        </div>

      </div>
    </div>
  );
}
