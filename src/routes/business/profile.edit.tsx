import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Upload, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { AvatarCropModal } from "@/components/app/AvatarCropModal";

export const Route = createFileRoute("/business/profile/edit")({
  head: () => ({ meta: [{ title: "Edit Business Profile — MRKT" }] }),
  component: BusinessProfileEditPage,
});

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Fashion & Apparel", "Beauty & Wellness", "Food & Beverage", "Technology",
  "Health & Fitness", "Travel & Hospitality", "Home & Lifestyle", "Finance",
  "Education", "Entertainment", "Sports & Outdoors", "Automotive",
  "Real Estate", "Retail", "Consumer Goods", "Media & Publishing", "Other",
];

const COMPANY_SIZES = [
  "1–10 employees", "11–50 employees", "51–200 employees",
  "201–1,000 employees", "1,000+ employees",
];

// ─────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, prefix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      {prefix && (
        <span style={{ padding: "0 12px", fontSize: 13, color: C.textMuted, borderRight: `1px solid ${C.border}`, height: "100%", display: "flex", alignItems: "center", userSelect: "none" }}>
          {prefix}
        </span>
      )}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "12px 14px", fontSize: 14, color: C.text, fontFamily: "inherit" }}
      />
    </div>
  );
}

function TextArea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{ width: "100%", background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.text, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
    />
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px", borderRadius: 99,
        border: `1px solid ${selected ? C.accent : C.border}`,
        background: selected ? `${C.accent}22` : "transparent",
        color: selected ? C.accent : C.textSub,
        fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.12s",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {selected && <Check style={{ width: 12, height: 12 }} />}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Logo Uploader
// ─────────────────────────────────────────────────────────────

function LogoUploader({ userId, value, onChange }: {
  userId: string; value: string; onChange: (url: string) => void;
}) {
  const inputRef                        = useRef<HTMLInputElement>(null);
  const [uploading,   setUploading]     = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [cropSrc,      setCropSrc]      = useState<string | null>(null);

  const displayUrl = localPreview || value;

  function handleFile(file: File) {
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) { setError("Please upload a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024)  { setError("Image must be under 5 MB."); return; }
    setError(null);

    // Save original silently in background (logo_original_url)
    const originalPath = `${userId}/original${file.name.match(/\.[^.]+$/)?.[0] ?? ".jpg"}`;
    supabase.storage.from("business-logos").upload(originalPath, file, { upsert: true });

    // Open crop modal — user will position before final upload
    const reader = new FileReader();
    reader.onload = e => setCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCropSave(blob: Blob, previewDataUrl: string) {
    setCropSrc(null);
    setUploading(true);
    setLocalPreview(previewDataUrl);

    const path = `${userId}/logo.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("business-logos")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadErr) {
      setError("Upload failed. Make sure the business-logos bucket exists and is public.");
      setLocalPreview(null);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
    onChange(urlData.publicUrl + `?t=${Date.now()}`);
    setLocalPreview(null);
    setUploading(false);
  }

  function handleRemove() {
    setLocalPreview(null);
    onChange("");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        {/* Preview circle */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: 16,
              background: displayUrl ? "transparent" : "oklch(1 0 0 / 8%)",
              border: `2px dashed ${dragOver ? C.accent : C.border}`,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.15s",
            }}
          >
            {displayUrl ? (
              <img src={displayUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <Upload style={{ width: 22, height: 22, color: C.textMuted }} />
            )}
            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "oklch(0 0 0 / 50%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid oklch(1 0 0 / 30%)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
              </div>
            )}
          </div>
          {displayUrl && !uploading && (
            <button
              onClick={handleRemove}
              style={{
                position: "absolute", top: -6, right: -6,
                width: 20, height: 20, borderRadius: "50%",
                background: "oklch(0.25 0 0)", border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0,
              }}
            >
              <X style={{ width: 10, height: 10, color: C.textSub }} />
            </button>
          )}
        </div>

        {/* Upload controls */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 4 }}>Company Logo</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>
            Square logo or icon. JPG, PNG, or WebP up to 5 MB.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "8px 16px", borderRadius: 8,
                background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.border}`,
                color: C.textSub, fontSize: 13, fontWeight: 500,
                cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              {uploading ? "Uploading…" : displayUrl ? "Replace" : "Upload"}
            </button>
          </div>
          {error && <div style={{ fontSize: 12, color: "oklch(0.75 0.12 25)", marginTop: 8 }}>{error}</div>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          shape="rect"
          title="Adjust Logo"
          onSave={handleCropSave}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────────────────────

type FormData = {
  company_name:      string;
  industry:          string;
  website:           string;
  location:          string;
  description:       string;
  company_size:      string;
  target_audience:   string;
  geographic_market: string;
  logo_url:          string;
};

const EMPTY: FormData = {
  company_name: "", industry: "", website: "", location: "",
  description: "", company_size: "", target_audience: "", geographic_market: "",
  logo_url: "",
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function BusinessProfileEditPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [data,    setData]    = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (user === null) nav({ to: "/login" });
  }, [user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bp } = await (supabase as any)
        .from("business_profiles")
        .select("company_name,industry,website,location,description,company_size,target_audience,geographic_market,logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bp) {
        setData({
          company_name:      bp.company_name      ?? "",
          industry:          bp.industry          ?? "",
          website:           bp.website           ?? "",
          location:          bp.location          ?? "",
          description:       bp.description       ?? "",
          company_size:      bp.company_size      ?? "",
          target_audience:   bp.target_audience   ?? "",
          geographic_market: bp.geographic_market ?? "",
          logo_url:          bp.logo_url          ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setData(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("business_profiles")
        .upsert({
          user_id:           user.id,
          company_name:      data.company_name.trim()       || null,
          industry:          data.industry.trim()            || null,
          website:           data.website.trim()             || null,
          location:          data.location.trim()            || null,
          description:       data.description.trim()         || null,
          company_size:      data.company_size               || null,
          target_audience:   data.target_audience.trim()    || null,
          geographic_market: data.geographic_market.trim()  || null,
          logo_url:          data.logo_url                   || null,
          updated_at:        new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Business profile updated.");

      // Broadcast live logo update so sidebar + other components refresh without reload
      if (data.logo_url) {
        window.dispatchEvent(new CustomEvent("mrkt:avatar-updated", { detail: { url: data.logo_url } }));
      }

      nav({ to: "/profile" });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Something went wrong.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const namedIndustries = INDUSTRIES.filter(i => i !== "Other");
  const isOtherActive   = data.industry !== "" && !namedIndustries.includes(data.industry);
  const customIndustry  = isOtherActive && data.industry !== "Other" ? data.industry : "";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "oklch(1 0 0 / 12%)" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "inherit" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <button
          onClick={() => nav({ to: "/profile" })}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: C.textSub, fontSize: 14, fontWeight: 500, padding: "8px 0", fontFamily: "inherit" }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Back to Profile
        </button>
        <Logo wordmarkOnly />
        <div style={{ width: 120 }} />
      </div>

      {/* Form */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px 100px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Edit Business Profile</h1>
        <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 36px" }}>
          Update your company details. Only you can see this information.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* Logo */}
          <div>
            <Label>Company Logo</Label>
            {user && (
              <LogoUploader
                userId={user.id}
                value={data.logo_url}
                onChange={url => set("logo_url", url)}
              />
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: C.border }} />

          {/* Company name */}
          <div>
            <Label>Company Name</Label>
            <TextInput value={data.company_name} onChange={v => set("company_name", v)} placeholder="Acme Inc." />
          </div>

          {/* Industry */}
          <div>
            <Label>Industry</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {namedIndustries.map(ind => (
                <Chip key={ind} label={ind} selected={data.industry === ind} onClick={() => set("industry", data.industry === ind ? "" : ind)} />
              ))}
              <Chip label="Other" selected={isOtherActive} onClick={() => set("industry", isOtherActive ? "" : "Other")} />
            </div>
            {isOtherActive && (
              <input
                value={customIndustry}
                onChange={e => set("industry", e.target.value || "Other")}
                placeholder="Type your industry…"
                autoFocus
                style={{ marginTop: 12, width: "100%", background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            )}
          </div>

          {/* Website */}
          <div>
            <Label>Website</Label>
            <TextInput value={data.website} onChange={v => set("website", v)} prefix="https://" placeholder="yourcompany.com" />
          </div>

          {/* Location */}
          <div>
            <Label>Location</Label>
            <TextInput value={data.location} onChange={v => set("location", v)} placeholder="New York, USA" />
          </div>

          {/* Company size */}
          <div>
            <Label>Company Size</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {COMPANY_SIZES.map(size => (
                <Chip key={size} label={size} selected={data.company_size === size} onClick={() => set("company_size", data.company_size === size ? "" : size)} />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <TextArea value={data.description} onChange={v => set("description", v)} placeholder="Tell creators about your brand, what you do, and what makes you unique…" />
          </div>

          {/* Target audience */}
          <div>
            <Label>Target Audience</Label>
            <TextArea value={data.target_audience} onChange={v => set("target_audience", v)} placeholder="Who are your customers? e.g. women aged 25–40 interested in sustainable fashion…" />
          </div>

          {/* Geographic market */}
          <div>
            <Label>Geographic Market</Label>
            <TextInput value={data.geographic_market} onChange={v => set("geographic_market", v)} placeholder="e.g. USA, Canada, UK" />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ marginTop: 8, padding: "14px 24px", borderRadius: 12, fontSize: 15, border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", width: "100%", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

        </div>
      </div>
    </div>
  );
}
