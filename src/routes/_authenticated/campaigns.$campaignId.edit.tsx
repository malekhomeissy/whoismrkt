import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Loader2, ChevronDown,
} from "lucide-react";
import type { Campaign, CompensationType, CampaignDeliverableInput } from "@/types/campaign";
import {
  COMPENSATION_LABELS, DELIVERABLE_PLATFORMS,
  DELIVERABLE_TYPES_BY_PLATFORM, INDUSTRY_OPTIONS,
} from "@/types/campaign";
import { CATEGORY_LABELS } from "@/types/creator";

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId/edit")({
  head: () => ({ meta: [{ title: "Edit Campaign — MRKT" }] }),
  component: EditCampaignPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

const inputStyle = {
  background:  C.raised,
  border:      `1px solid ${C.borderNormal}`,
  color:       C.textPrimary,
  borderRadius: "0.75rem",
  padding:     "0.625rem 0.875rem",
  fontSize:    "13.5px",
  width:       "100%",
  outline:     "none",
} as const;

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: C.surface, border: `1px solid ${C.borderSubtle}` }}
    >
      <h2
        className="text-[11px] uppercase tracking-[0.26em] font-semibold mb-4"
        style={{ color: C.textMuted }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: C.textTertiary }}>
      {children}
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FormState = {
  title: string;
  description: string;
  product_service: string;
  campaign_goal: string;
  compensation_type: CompensationType;
  compensation_amount_fixed: string;
  compensation_budget_min: string;
  compensation_budget_max: string;
  compensation_per_deliverable: string;
  required_niches: string[];
  min_followers: string;
  required_country: string;
  required_language: string;
  required_platforms: string[];
  deadline: string;
  status: string;
  deliverables: CampaignDeliverableInput[];
};

function defaultForm(): FormState {
  return {
    title: "", description: "", product_service: "", campaign_goal: "",
    compensation_type: "paid",
    compensation_amount_fixed: "", compensation_budget_min: "",
    compensation_budget_max: "", compensation_per_deliverable: "",
    required_niches: [], min_followers: "", required_country: "",
    required_language: "", required_platforms: [], deadline: "",
    status: "draft",
    deliverables: [],
  };
}

function campaignToForm(c: Campaign): FormState {
  return {
    title:                       c.title,
    description:                 c.description,
    product_service:             c.product_service ?? "",
    campaign_goal:               c.campaign_goal ?? "",
    compensation_type:           c.compensation_type,
    compensation_amount_fixed:   c.compensation_amount_fixed?.toString() ?? "",
    compensation_budget_min:     c.compensation_budget_min?.toString() ?? "",
    compensation_budget_max:     c.compensation_budget_max?.toString() ?? "",
    compensation_per_deliverable: c.compensation_per_deliverable?.toString() ?? "",
    required_niches:             c.required_niches ?? [],
    min_followers:               c.min_followers?.toString() ?? "",
    required_country:            c.required_country ?? "",
    required_language:           c.required_language ?? "",
    required_platforms:          c.required_platforms ?? [],
    deadline:                    c.deadline ?? "",
    status:                      c.status,
    deliverables:                (c.deliverables ?? []).map((d) => ({
      platform:     d.platform,
      content_type: d.content_type,
      quantity:     d.quantity,
      notes:        d.notes ?? "",
    })),
  };
}

function EditCampaignPage() {
  const { campaignId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [form,      setForm]      = useState<FormState>(defaultForm());
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [notFound,  setNotFound]  = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, campaignId]);

  async function load() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("campaigns")
      .select("*, deliverables:campaign_deliverables(*)")
      .eq("id", campaignId)
      .single();

    if (error || !data) { setNotFound(true); setLoading(false); return; }
    if (data.user_id !== user!.id) { setForbidden(true); setLoading(false); return; }

    setForm(campaignToForm(data as Campaign));
    setLoading(false);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleArray(key: "required_niches" | "required_platforms", val: string) {
    setForm((f) => {
      const arr = f[key] as string[];
      return {
        ...f,
        [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
      };
    });
  }

  function addDeliverable() {
    setForm((f) => ({
      ...f,
      deliverables: [
        ...f.deliverables,
        { platform: "Instagram", content_type: "Reel", quantity: 1, notes: "" },
      ],
    }));
  }

  function removeDeliverable(idx: number) {
    setForm((f) => ({
      ...f,
      deliverables: f.deliverables.filter((_, i) => i !== idx),
    }));
  }

  function patchDeliverable(idx: number, patch: Partial<CampaignDeliverableInput>) {
    setForm((f) => ({
      ...f,
      deliverables: f.deliverables.map((d, i) => i === idx ? { ...d, ...patch } : d),
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: campaignErr } = await (supabase as any)
        .from("campaigns")
        .update({
          title:                       form.title.trim(),
          description:                 form.description.trim(),
          product_service:             form.product_service.trim() || null,
          campaign_goal:               form.campaign_goal.trim() || null,
          compensation_type:           form.compensation_type,
          compensation_amount_fixed:   form.compensation_amount_fixed ? parseFloat(form.compensation_amount_fixed) : null,
          compensation_budget_min:     form.compensation_budget_min ? parseFloat(form.compensation_budget_min) : null,
          compensation_budget_max:     form.compensation_budget_max ? parseFloat(form.compensation_budget_max) : null,
          compensation_per_deliverable: form.compensation_per_deliverable ? parseFloat(form.compensation_per_deliverable) : null,
          required_niches:             form.required_niches,
          min_followers:               form.min_followers ? parseInt(form.min_followers) : null,
          required_country:            form.required_country.trim() || null,
          required_language:           form.required_language.trim() || null,
          required_platforms:          form.required_platforms,
          deadline:                    form.deadline || null,
          status:                      form.status,
          updated_at:                  new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (campaignErr) throw campaignErr;

      // Replace deliverables — delete old, insert new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("campaign_deliverables")
        .delete()
        .eq("campaign_id", campaignId);

      if (form.deliverables.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: delErr } = await (supabase as any)
          .from("campaign_deliverables")
          .insert(
            form.deliverables.map((d, i) => ({
              campaign_id:  campaignId,
              platform:     d.platform,
              content_type: d.content_type,
              quantity:     d.quantity,
              notes:        d.notes || null,
              display_order: i,
            }))
          );
        if (delErr) throw delErr;
      }

      toast.success("Campaign updated");
      nav({ to: "/campaigns/$campaignId", params: { campaignId } });
    } catch (err) {
      console.error("[EditCampaign] save error:", err);
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: C.canvas }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: C.textMuted }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: C.canvas }}>
        <p style={{ color: C.textMuted }}>Campaign not found.</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: C.canvas }}>
        <p style={{ color: C.textMuted }}>You don't own this campaign.</p>
      </div>
    );
  }

  const contentTypes = DELIVERABLE_TYPES_BY_PLATFORM[form.deliverables[0]?.platform ?? "Instagram"] ?? [];

  return (
    <div className="h-full overflow-y-auto" style={{ background: C.canvas }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between gap-4"
        style={{ background: C.canvas, borderBottom: `1px solid ${C.borderSubtle}` }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId }}
            className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors duration-100"
            style={{ background: C.surface, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.raised; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-display text-[17px] font-semibold tracking-tight" style={{ color: C.textPrimary }}>
            Edit Campaign
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId }}
            className="h-9 px-4 rounded-xl text-[12.5px] font-medium flex items-center transition-colors duration-100"
            style={{ color: C.textTertiary, border: `1px solid ${C.borderSubtle}`, background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 rounded-xl text-[12.5px] font-semibold flex items-center gap-2 transition-opacity duration-100"
            style={{ background: C.accent, color: "oklch(1 0 0 / 95%)", opacity: saving ? 0.6 : 1 }}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">

        {/* Campaign Details */}
        <Section title="Campaign Details">
          <div className="space-y-4">
            <div>
              <FieldLabel>Campaign Title *</FieldLabel>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Summer Launch with Micro-Influencers"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Description *</FieldLabel>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the campaign, what you're promoting, and what you're looking for from creators."
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
              />
            </div>
            <div>
              <FieldLabel>Product / Service</FieldLabel>
              <input
                value={form.product_service}
                onChange={(e) => set("product_service", e.target.value)}
                placeholder="What product or service is being promoted?"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Campaign Goal</FieldLabel>
              <input
                value={form.campaign_goal}
                onChange={(e) => set("campaign_goal", e.target.value)}
                placeholder="e.g. Drive 500 sign-ups, boost brand awareness in NYC"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  style={{ ...inputStyle, paddingRight: "2.25rem", appearance: "none", cursor: "pointer" }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active (visible to creators)</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                  style={{ color: C.textMuted }}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Compensation */}
        <Section title="Compensation">
          <div className="space-y-4">
            <div>
              <FieldLabel>Type</FieldLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(["paid", "gifted", "affiliate", "revenue_share", "unpaid"] as CompensationType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("compensation_type", t)}
                    className="h-9 rounded-xl text-[12px] font-medium transition-all duration-100"
                    style={{
                      background:  form.compensation_type === t ? "oklch(1 0 0 / 15%)" : C.raised,
                      border:      `1px solid ${form.compensation_type === t ? "oklch(1 0 0 / 40%)" : C.borderSubtle}`,
                      color:       form.compensation_type === t ? C.accent : C.textTertiary,
                    }}
                  >
                    {COMPENSATION_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {form.compensation_type === "paid" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Fixed amount ($)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    value={form.compensation_amount_fixed}
                    onChange={(e) => set("compensation_amount_fixed", e.target.value)}
                    placeholder="e.g. 500"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Per deliverable ($)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    value={form.compensation_per_deliverable}
                    onChange={(e) => set("compensation_per_deliverable", e.target.value)}
                    placeholder="e.g. 150"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Budget min ($)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    value={form.compensation_budget_min}
                    onChange={(e) => set("compensation_budget_min", e.target.value)}
                    placeholder="e.g. 300"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Budget max ($)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    value={form.compensation_budget_max}
                    onChange={(e) => set("compensation_budget_max", e.target.value)}
                    placeholder="e.g. 800"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Deliverables */}
        <Section title="Deliverables">
          <div className="space-y-2.5">
            {form.deliverables.map((del, i) => (
              <div
                key={i}
                className="rounded-xl p-3.5"
                style={{ background: C.raised, border: `1px solid ${C.borderSubtle}` }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                  <div className="relative">
                    <select
                      value={del.platform}
                      onChange={(e) => patchDeliverable(i, {
                        platform: e.target.value,
                        content_type: (DELIVERABLE_TYPES_BY_PLATFORM[e.target.value] ?? [])[0] ?? "",
                      })}
                      style={{ ...inputStyle, paddingRight: "2rem", appearance: "none", cursor: "pointer", padding: "0.5rem 0.75rem", fontSize: "12px" }}
                    >
                      {DELIVERABLE_PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: C.textMuted }} />
                  </div>
                  <div className="relative">
                    <select
                      value={del.content_type}
                      onChange={(e) => patchDeliverable(i, { content_type: e.target.value })}
                      style={{ ...inputStyle, paddingRight: "2rem", appearance: "none", cursor: "pointer", padding: "0.5rem 0.75rem", fontSize: "12px" }}
                    >
                      {(DELIVERABLE_TYPES_BY_PLATFORM[del.platform] ?? []).map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: C.textMuted }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={del.quantity}
                      onChange={(e) => patchDeliverable(i, { quantity: parseInt(e.target.value) || 1 })}
                      style={{ ...inputStyle, padding: "0.5rem 0.75rem", fontSize: "12px", width: "60px" }}
                    />
                    <span className="text-[11px] shrink-0" style={{ color: C.textMuted }}>qty</span>
                    <button
                      type="button"
                      onClick={() => removeDeliverable(i)}
                      className="ml-auto h-7 w-7 rounded-lg flex items-center justify-center transition-colors duration-100"
                      style={{ color: C.textTertiary }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 7%)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  value={del.notes}
                  onChange={(e) => patchDeliverable(i, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  style={{ ...inputStyle, padding: "0.4rem 0.75rem", fontSize: "12px" }}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addDeliverable}
              className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium transition-colors duration-100"
              style={{ border: `1px dashed ${C.borderNormal}`, color: C.textMuted }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 22%)"; (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Deliverable
            </button>
          </div>
        </Section>

        {/* Requirements */}
        <Section title="Requirements">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Min. Followers</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.min_followers}
                  onChange={(e) => set("min_followers", e.target.value)}
                  placeholder="e.g. 10000"
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Deadline</FieldLabel>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => set("deadline", e.target.value)}
                  style={{ ...inputStyle, colorScheme: "dark" }}
                />
              </div>
              <div>
                <FieldLabel>Country</FieldLabel>
                <input
                  value={form.required_country}
                  onChange={(e) => set("required_country", e.target.value)}
                  placeholder="e.g. United States"
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Language</FieldLabel>
                <input
                  value={form.required_language}
                  onChange={(e) => set("required_language", e.target.value)}
                  placeholder="e.g. English"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Platforms */}
            <div>
              <FieldLabel>Required Platforms</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {["Instagram", "TikTok", "YouTube"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleArray("required_platforms", p)}
                    className="h-8 px-3.5 rounded-xl text-[12px] font-medium transition-all duration-100"
                    style={{
                      background: form.required_platforms.includes(p) ? "oklch(1 0 0 / 15%)" : C.raised,
                      border:     `1px solid ${form.required_platforms.includes(p) ? "oklch(1 0 0 / 40%)" : C.borderSubtle}`,
                      color:      form.required_platforms.includes(p) ? C.accent : C.textTertiary,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Creator niches */}
            <div>
              <FieldLabel>Creator Niches</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(CATEGORY_LABELS) as [string, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleArray("required_niches", value)}
                    className="h-7 px-3 rounded-full text-[11.5px] font-medium transition-all duration-100"
                    style={{
                      background: form.required_niches.includes(value) ? "oklch(1 0 0 / 15%)" : "oklch(1 0 0 / 4%)",
                      border:     `1px solid ${form.required_niches.includes(value) ? "oklch(1 0 0 / 40%)" : "oklch(1 0 0 / 8%)"}`,
                      color:      form.required_niches.includes(value) ? C.accent : C.textTertiary,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Bottom save */}
        <div className="flex gap-2 pb-8">
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId }}
            className="flex-1 h-11 rounded-xl flex items-center justify-center text-[13px] font-medium transition-colors duration-100"
            style={{ border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.surface; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-opacity duration-100"
            style={{ background: C.accent, color: "oklch(1 0 0 / 95%)", opacity: saving ? 0.6 : 1 }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
