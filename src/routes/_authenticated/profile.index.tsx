// ─────────────────────────────────────────────────────────────────────────────
// /profile (index) — Account & profile overview for creators and businesses
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import React from "react";
import type { ReactNode } from "react";
import {
  ArrowUpRight, LogOut, PenLine,
  MapPin, Globe, Users, Instagram, Youtube,
  FileText, Languages, Building2, DollarSign,
  Layers, Plane, Plus, X, Trash2, Eye, EyeOff, Lock,
  CheckCircle2, Clock, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth.tsx";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import {
  computeCreatorVerification,
  computeBusinessVerification,
  type VerificationResult,
} from "@/lib/verification";
import { StarRating } from "@/components/app/StarRating";
import { RatingsDisplay } from "@/components/app/RatingsDisplay";
import type { Review } from "@/lib/reviews";

import {
  type CreatorProfile,
  CATEGORY_LABELS,
  formatFollowers,
  platformShort,
  platformColor,
} from "@/types/creator";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({ meta: [{ title: "My Profile — MRKT" }] }),
  component: ProfilePage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

const AVATAR_COLORS = [
  "oklch(0.78 0.005 0)",  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)", "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ─── Local types ──────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  account_type: string | null;
  onboarding_path: string | null;
  niche: string | null;
  platforms: string[] | null;
  goal: string | null;
  created_at: string;
}

interface BusinessProfile {
  company_name: string | null;
  industry: string | null;
  website: string | null;
  location: string | null;
  description: string | null;
  company_size: string | null;
  target_audience: string | null;
  geographic_market: string | null;
  preferred_platforms: string[] | null;
  campaign_goals: string[] | null;
  monthly_creator_budget: string | null;
  preferred_creator_categories: string[] | null;
  is_complete: boolean;
  logo_url?: string | null;
  is_verified?: boolean;
}

function isCreatorAcc(p: UserProfile | null) {
  return p?.account_type === "creator" || p?.onboarding_path === "creator";
}
function isBusinessAcc(p: UserProfile | null) {
  if (!p) return false;
  return p.account_type === "brand" || p.account_type === "business" ||
    p.onboarding_path === "business_creator" || p.onboarding_path === "business_marketing";
}
function roleLabel(p: UserProfile | null): string {
  if (!p) return "";
  if (p.onboarding_path === "creator" || p.account_type === "creator") return "Creator";
  if (p.onboarding_path === "business_creator") return "Business · Campaigns";
  if (p.onboarding_path === "business_marketing") return "Business · Marketing";
  if (p.account_type === "brand") return "Brand";
  if (p.account_type === "business") return "Business";
  return "Member";
}
function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  label, action, actionLabel,
}: { label: string; action?: string; actionLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold"
        style={{ color: C.textQuaternary }}>
        {label}
      </div>
      {action && actionLabel && (
        <Link to={action as "/"}
          className="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-[11px] font-medium transition-all duration-150"
          style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.textPrimary; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
        >
          <PenLine className="h-3 w-3" /> {actionLabel}
        </Link>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
      <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "oklch(1 0 0 / 6%)" }}>
        <span style={{ color: C.textQuaternary }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.2em] mb-0.5" style={{ color: C.textQuaternary }}>{label}</div>
        <div className="text-[13px]" style={{ color: C.textSecondary }}>{value}</div>
      </div>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="py-2.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
      <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: C.textQuaternary }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={item}
            className="text-[11.5px] rounded-full px-3 py-1"
            style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
      <div className="px-5 py-4 [&>*:last-child]:border-b-0">
        {children}
      </div>
    </div>
  );
}

function Skeleton() {
  const bar = (w: string, h = "h-3") => (
    <div className={`${h} rounded-full animate-pulse`}
      style={{ background: "oklch(1 0 0 / 8%)", width: w }} />
  );
  return (
    <div className="space-y-6 max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl animate-pulse" style={{ background: "oklch(1 0 0 / 10%)" }} />
        <div className="space-y-2">{bar("140px", "h-5")}{bar("90px")}</div>
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="rounded-2xl p-5 space-y-3 animate-pulse"
          style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
          {bar("80px")}{bar("60%", "h-4")}{bar("40%", "h-4")}
        </div>
      ))}
    </div>
  );
}

// ─── Creator Profile section ──────────────────────────────────────────────────

function CreatorSection({ cp }: { cp: CreatorProfile }) {
  const featuredLinks = [cp.featured_link_1, cp.featured_link_2, cp.featured_link_3].filter(Boolean) as string[];

  const statusColor = cp.status === "active"
    ? C.green
    : C.amber;

  return (
    <div className="space-y-4">
      <SectionHeader label="Creator Profile" action="/profile/edit" actionLabel="Edit Profile" />

      <div className="flex items-center gap-2 mb-4">
        {cp.status === "active"
          ? <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
          : <Clock className="h-4 w-4" style={{ color: statusColor }} />
        }
        <span className="text-[12px] font-medium capitalize" style={{ color: statusColor }}>
          {cp.status === "active" ? "Live on MRKT Connect" : cp.status.replace("_", " ")}
        </span>
        {cp.status === "active" && (
          <Link to={`/creators/${cp.id}` as "/"}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-[11px] font-medium transition-all duration-150"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(0.62 0.10 224 / 20%)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.accentMuted; }}>
            View public profile <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <Card>
        <InfoRow icon={<MapPin className="h-3 w-3" />} label="Location" value={cp.location} />
        <InfoRow icon={<Users className="h-3 w-3" />} label="Followers" value={cp.follower_count ? formatFollowers(cp.follower_count) : null} />
        {cp.instagram_connected && cp.instagram_followers != null && (
          <InfoRow
            icon={<Instagram className="h-3 w-3" />}
            label="Instagram Followers"
            value={
              <span className="flex items-center gap-1.5">
                {formatFollowers(cp.instagram_followers)}
                <span className="text-[10px] uppercase tracking-[0.1em] font-semibold" style={{ color: C.accent }}>Verified</span>
              </span>
            }
          />
        )}
        {cp.bio && (
          <div className="py-2.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Bio</div>
            <p className="text-[13px] font-light leading-relaxed" style={{ color: C.textSecondary }}>{cp.bio}</p>
          </div>
        )}
        {(cp.instagram_handle || cp.tiktok_handle || cp.youtube_handle) && (
          <div className="py-2.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-2.5" style={{ color: C.textQuaternary }}>Socials</div>
            <div className="space-y-2">
              {cp.instagram_handle && (
                <a href={`https://instagram.com/${cp.instagram_handle}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 group">
                  <Instagram className="h-3.5 w-3.5 shrink-0" style={{ color: C.textTertiary }} />
                  <span className="text-[12.5px]" style={{ color: C.textSecondary }}>@{cp.instagram_handle}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 ml-auto" style={{ color: C.textMuted }} />
                </a>
              )}
              {cp.tiktok_handle && (
                <a href={`https://tiktok.com/@${cp.tiktok_handle}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 group">
                  <span className="text-[11px] font-bold shrink-0" style={{ fontFamily: "monospace", color: C.textTertiary }}>TK</span>
                  <span className="text-[12.5px]" style={{ color: C.textSecondary }}>@{cp.tiktok_handle}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 ml-auto" style={{ color: C.textMuted }} />
                </a>
              )}
              {cp.youtube_handle && (
                <a href={`https://youtube.com/@${cp.youtube_handle}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2.5 group">
                  <Youtube className="h-3.5 w-3.5 shrink-0" style={{ color: C.textTertiary }} />
                  <span className="text-[12.5px]" style={{ color: C.textSecondary }}>@{cp.youtube_handle}</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 ml-auto" style={{ color: C.textMuted }} />
                </a>
              )}
            </div>
          </div>
        )}
      </Card>

      {(cp.niche || cp.categories.length > 0 || cp.platforms.length > 0) && (
        <Card>
          <InfoRow icon={<Layers className="h-3 w-3" />} label="Niche" value={cp.niche} />
          {cp.categories.length > 0 && (
            <ChipRow label="Categories"
              items={cp.categories.map(c => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c)} />
          )}
          {cp.platforms.length > 0 && (
            <div className="py-2.5">
              <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: C.textQuaternary }}>Platforms</div>
              <div className="flex flex-wrap gap-1.5">
                {cp.platforms.map(p => (
                  <span key={p} className="text-[10px] font-bold rounded-full px-2.5 py-1"
                    style={{ background: "oklch(1 0 0 / 7%)", color: platformColor(p), border: `1px solid ${C.borderSubtle}` }}>
                    {platformShort(p)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {(cp.audience_location || cp.audience_age_range || cp.audience_gender_split || cp.primary_language) && (
        <Card>
          <InfoRow icon={<Globe className="h-3 w-3" />} label="Audience Location" value={cp.audience_location} />
          <InfoRow icon={<Users className="h-3 w-3" />} label="Age Range" value={cp.audience_age_range} />
          <InfoRow icon={<span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>%</span>}
            label="Gender Split" value={cp.audience_gender_split} />
          <InfoRow icon={<Languages className="h-3 w-3" />} label="Primary Language" value={cp.primary_language} />
        </Card>
      )}

      {(cp.accepts_paid || cp.accepts_gifted || cp.accepts_affiliate || cp.rate_range || cp.preferred_content_types.length > 0) && (
        <Card>
          <div className="py-2.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: C.textQuaternary }}>Accepts</div>
            <div className="flex flex-wrap gap-1.5">
              {cp.accepts_paid && <Pill label="Paid" color={C.green} />}
              {cp.accepts_gifted && <Pill label="Gifted" color={C.aiBlue} />}
              {cp.accepts_affiliate && <Pill label="Affiliate" color={C.amber} />}
            </div>
          </div>
          <InfoRow icon={<DollarSign className="h-3 w-3" />} label="Rate Range" value={cp.rate_range} />
          {cp.preferred_content_types.length > 0 && <ChipRow label="Content Types" items={cp.preferred_content_types} />}
        </Card>
      )}

      <TravelPlansSection creatorProfileId={cp.id} />

      {(featuredLinks.length > 0 || cp.media_kit_url || cp.previous_collaborations) && (
        <Card>
          {featuredLinks.map((url, i) => {
            let display = url;
            try { display = new URL(url).hostname.replace(/^www\./, ""); } catch { /* raw */ }
            return (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 py-2.5 group"
                style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
                <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "oklch(1 0 0 / 6%)" }}>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: C.textQuaternary }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="flex-1 text-[12.5px] truncate" style={{ color: C.textSecondary }}>{display}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" style={{ color: C.textMuted }} />
              </a>
            );
          })}
          {cp.media_kit_url && (
            <a href={cp.media_kit_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 py-2.5 group"
              style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "oklch(1 0 0 / 6%)" }}>
                <FileText className="h-3 w-3" style={{ color: C.textQuaternary }} />
              </div>
              <span className="text-[12.5px]" style={{ color: C.textSecondary }}>Media Kit</span>
              <ExternalLink className="h-3 w-3 shrink-0 ml-auto opacity-0 group-hover:opacity-100" style={{ color: C.textMuted }} />
            </a>
          )}
          {cp.previous_collaborations && (
            <div className="py-2.5">
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Previous Collaborations</div>
              <p className="text-[13px] font-light leading-relaxed" style={{ color: C.textSecondary }}>{cp.previous_collaborations}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Business Profile section ─────────────────────────────────────────────────

function BusinessSection({ bp }: { bp: BusinessProfile }) {
  return (
    <div className="space-y-4">
      <SectionHeader label="Business Profile" action="/business/profile/edit" actionLabel="Edit" />

      <Card>
        <InfoRow icon={<Building2 className="h-3 w-3" />} label="Company" value={bp.company_name} />
        <InfoRow icon={<Layers className="h-3 w-3" />} label="Industry" value={bp.industry} />
        <InfoRow icon={<Globe className="h-3 w-3" />} label="Website"
          value={bp.website ? bp.website.replace(/^https?:\/\//, "") : null} />
        <InfoRow icon={<MapPin className="h-3 w-3" />} label="Location" value={bp.location} />
        <InfoRow icon={<Users className="h-3 w-3" />} label="Company Size" value={bp.company_size} />
        {bp.description && (
          <div className="py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Description</div>
            <p className="text-[13px] font-light leading-relaxed" style={{ color: C.textSecondary }}>{bp.description}</p>
          </div>
        )}
      </Card>

      {(bp.target_audience || bp.geographic_market) && (
        <Card>
          {bp.target_audience && (
            <div className="py-2.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              <div className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Target Audience</div>
              <p className="text-[13px] font-light leading-relaxed" style={{ color: C.textSecondary }}>{bp.target_audience}</p>
            </div>
          )}
          <InfoRow icon={<Globe className="h-3 w-3" />} label="Geographic Market" value={bp.geographic_market} />
        </Card>
      )}

      {((bp.campaign_goals?.length ?? 0) > 0 || (bp.preferred_platforms?.length ?? 0) > 0) && (
        <Card>
          <ChipRow label="Campaign Goals" items={bp.campaign_goals ?? []} />
          <ChipRow label="Preferred Platforms" items={bp.preferred_platforms ?? []} />
        </Card>
      )}

      {(bp.monthly_creator_budget || (bp.preferred_creator_categories?.length ?? 0) > 0) && (
        <Card>
          <InfoRow icon={<DollarSign className="h-3 w-3" />} label="Monthly Creator Budget" value={bp.monthly_creator_budget} />
          <ChipRow label="Preferred Creator Categories" items={bp.preferred_creator_categories ?? []} />
        </Card>
      )}
    </div>
  );
}

// ─── Travel Plans section ─────────────────────────────────────────────────────

type TravelPlan = {
  id: string;
  destination_city: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  visibility: "public" | "members" | "private";
};

const VISIBILITY_CONFIG = {
  public:  { label: "Public",       icon: Eye,    color: "oklch(0.62 0.12 158)" },
  members: { label: "Members Only", icon: EyeOff, color: "oklch(0.70 0.08 68)"  },
  private: { label: "Private",      icon: Lock,   color: "oklch(1 0 0 / 38%)"   },
} as const;

function TravelPlansSection({ creatorProfileId }: { creatorProfileId: string }) {
  const { user } = useAuth();
  const [plans,     setPlans]     = useState<TravelPlan[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    destination_city:    "",
    destination_country: "",
    start_date:          "",
    end_date:            "",
    notes:               "",
    visibility:          "members" as TravelPlan["visibility"],
  });

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("creator_travel_plans")
      .select("id,destination_city,destination_country,start_date,end_date,notes,visibility")
      .eq("creator_profile_id", creatorProfileId)
      .order("start_date", { ascending: true })
      .then(({ data }: { data: TravelPlan[] | null }) => {
        setPlans(data ?? []);
        setLoading(false);
      });
  }, [user, creatorProfileId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.destination_city || !form.destination_country || !form.start_date || !form.end_date) return;
    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("creator_travel_plans")
      .insert([{ ...form, creator_profile_id: creatorProfileId, user_id: user!.id, notes: form.notes || null }])
      .select()
      .single();
    setSubmitting(false);
    if (error) return;
    setPlans((prev) => [...prev, data as TravelPlan].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    setShowForm(false);
    setForm({ destination_city: "", destination_country: "", start_date: "", end_date: "", notes: "", visibility: "members" });
  }

  async function handleDelete(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("creator_travel_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold" style={{ color: C.textQuaternary }}>
          Travel Plans
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-[11px] font-medium transition-all duration-150"
          style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textPrimary; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
        >
          {showForm ? <><X className="h-3 w-3" /> Cancel</> : <><Plus className="h-3 w-3" /> Add Trip</>}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
          <form onSubmit={handleAdd} className="px-5 py-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>City</div>
                <input required className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                  style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
                  placeholder="Dubai" value={form.destination_city}
                  onChange={(e) => setForm({ ...form, destination_city: e.target.value })} />
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Country</div>
                <input required className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                  style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
                  placeholder="UAE" value={form.destination_country}
                  onChange={(e) => setForm({ ...form, destination_country: e.target.value })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Arrival</div>
                <input required type="date" className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                  style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
                  value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Departure</div>
                <input required type="date" className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                  style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
                  value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Notes (optional)</div>
              <input className="w-full rounded-xl px-3 h-9 text-[12.5px] outline-none"
                style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
                placeholder="Open to brand collaborations in Dubai…" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-[0.2em] mb-1.5" style={{ color: C.textQuaternary }}>Visibility</div>
              <div className="flex gap-2">
                {(["public", "members", "private"] as const).map((v) => {
                  const cfg  = VISIBILITY_CONFIG[v];
                  const Icon = cfg.icon;
                  return (
                    <button key={v} type="button" onClick={() => setForm({ ...form, visibility: v })}
                      className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-medium transition-all duration-100"
                      style={{
                        background: form.visibility === v ? "oklch(1 0 0 / 10%)" : "oklch(1 0 0 / 4%)",
                        border: `1px solid ${form.visibility === v ? "oklch(0.84 0 0 / 35%)" : C.borderSubtle}`,
                        color:  form.visibility === v ? cfg.color : C.textMuted,
                      }}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full h-9 rounded-full text-[12.5px] font-medium transition-all duration-150 flex items-center justify-center gap-2"
              style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textPrimary }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 12%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)"; }}>
              <Plane className="h-3.5 w-3.5" />
              {submitting ? "Saving…" : "Add Travel Plan"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-[12px] py-4 text-center" style={{ color: C.textMuted }}>Loading…</div>
      ) : plans.length === 0 && !showForm ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-8 text-center"
          style={{ background: "oklch(1 0 0 / 1.5%)", border: `1px dashed ${C.borderSubtle}` }}>
          <Plane className="h-5 w-5 mb-2" style={{ color: C.textMuted }} />
          <div className="text-[12px] font-medium mb-1" style={{ color: C.textTertiary }}>No travel plans yet</div>
          <div className="text-[11px] mb-3" style={{ color: C.textMuted }}>Let brands discover you before you arrive.</div>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-full px-5 h-8 text-[11.5px] font-medium transition-all duration-150"
            style={{ background: C.raised, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}>
            <Plus className="h-3 w-3" /> Add a destination
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => {
            const visCfg = VISIBILITY_CONFIG[plan.visibility];
            const VisIcon = visCfg.icon;
            return (
              <div key={plan.id} className="rounded-2xl px-4 py-3 flex items-start gap-3"
                style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.accentMuted }}>
                  <Plane className="h-3.5 w-3.5" style={{ color: C.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
                      {plan.destination_city}, {plan.destination_country}
                    </span>
                    <div className="flex items-center gap-1">
                      <VisIcon className="h-3 w-3" style={{ color: visCfg.color, opacity: 0.7 }} />
                      <span className="text-[9.5px]" style={{ color: visCfg.color, opacity: 0.7 }}>{visCfg.label}</span>
                    </div>
                  </div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: C.textTertiary }}>
                    {new Date(plan.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" — "}
                    {new Date(plan.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  {plan.notes && (
                    <div className="text-[11px] mt-1" style={{ color: C.textMuted }}>{plan.notes}</div>
                  )}
                </div>
                <button onClick={() => handleDelete(plan.id)}
                  className="shrink-0 p-1.5 rounded-lg transition-colors" style={{ color: C.textMuted }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.52 0.15 24)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pill helper ──────────────────────────────────────────────────────────────

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[11.5px] rounded-full px-3 py-1"
      style={{
        background: `${color.replace(")", " / 12%)")}`,
        border: `1px solid ${color.replace(")", " / 28%)")}`,
        color,
      }}>
      {label}
    </span>
  );
}

// ─── Reviews received ─────────────────────────────────────────────────────────

function ReviewsReceivedSection({ userId }: { userId: string }) {
  const [reviews,       setReviews]       = useState<Review[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("reviews").select("*").eq("reviewed_user_id", userId)
        .order("created_at", { ascending: false }).limit(10);

      if (!data || data.length === 0) { setLoading(false); return; }
      setReviews(data);

      const ids: string[] = data.map((r: Review) => r.reviewer_id);
      const [crRes, biRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("creator_profiles").select("user_id,display_name").in("user_id", ids),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("business_profiles").select("user_id,company_name").in("user_id", ids),
      ]);
      const names: Record<string, string> = {};
      for (const cp of (crRes.data ?? [])) names[cp.user_id] = cp.display_name;
      for (const bp of (biRes.data ?? [])) names[bp.user_id] = bp.company_name ?? "Business";
      setReviewerNames(names);
      setLoading(false);
    })();
  }, [userId]);

  if (loading || reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold" style={{ color: C.textQuaternary }}>
          Reviews Received
        </div>
        <RatingsDisplay avgRating={avg} reviewCount={reviews.length} variant="badge" />
      </div>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl px-5 py-4"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
                  {reviewerNames[r.reviewer_id] ?? "Anonymous"}
                </span>
                <span className="ml-2 text-[10.5px]" style={{ color: C.textMuted }}>
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <StarRating value={r.rating} readOnly size={14} gap={2} />
            </div>
            {r.written_review && (
              <p className="text-[12.5px] leading-relaxed" style={{ color: C.textSecondary }}>
                "{r.written_review}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Verification card ────────────────────────────────────────────────────────

function VerificationCard({ result, editHref }: { result: VerificationResult; editHref: string }) {
  const { verified, checks, score } = result;
  const metCount = checks.filter((c) => c.met).length;

  return (
    <div>
      <SectionHeader label="Verification" />
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          {verified ? (
            <>
              <VerifiedBadge type="creator" size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold" style={{ color: C.accent }}>Verified</p>
                <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Your profile is fully complete</p>
              </div>
            </>
          ) : (
            <>
              <div className="h-[20px] w-[20px] rounded-full shrink-0 flex items-center justify-center"
                style={{ border: `1.5px solid oklch(1 0 0 / 18%)` }}>
                <div className="h-2 w-2 rounded-full" style={{ background: "oklch(1 0 0 / 22%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold" style={{ color: C.textPrimary }}>Not yet verified</p>
                <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{metCount} of {checks.length} requirements met</p>
              </div>
            </>
          )}
          <span className="text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 tabular-nums"
            style={{
              background: verified ? C.accentMuted : "oklch(1 0 0 / 7%)",
              color:      verified ? C.accent      : C.textTertiary,
              border: `1px solid ${verified ? C.accentBorder : C.borderSubtle}`,
            }}>
            {score}%
          </span>
        </div>
        <div className="px-5 pt-3 pb-1">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 7%)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score}%`, background: verified ? "linear-gradient(90deg, oklch(0.62 0.10 224), oklch(0.72 0.10 224), oklch(0.62 0.10 224))" : C.accent }} />
          </div>
        </div>
        <div className="px-5 pb-4 pt-2 space-y-0.5">
          {checks.map((c) => (
            <div key={c.key} className="flex items-center gap-2.5 py-1.5">
              {c.met
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: C.green }} />
                : <div className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ border: `1.5px solid oklch(1 0 0 / 22%)` }} />
              }
              <span className="text-[12.5px]" style={{ color: c.met ? C.textSecondary : C.textMuted }}>{c.label}</span>
            </div>
          ))}
        </div>
        {!verified && (
          <div className="px-5 py-3" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
            <Link to={editHref as "/"}
              className="inline-flex items-center gap-2 rounded-full px-5 h-8 text-[12px] font-medium transition-all duration-150"
              style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(0.62 0.10 224 / 20%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.accentMuted; }}>
              <PenLine className="h-3 w-3" />
              Complete verification
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProfilePage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  const [userProfile,  setUserProfile]  = useState<UserProfile | null>(null);
  const [creatorProf,  setCreatorProf]  = useState<CreatorProfile | null>(null);
  const [bizProf,      setBizProf]      = useState<BusinessProfile | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: up } = await supabase
        .from("profiles")
        .select("id,name,email,account_type,onboarding_path,niche,platforms,goal,created_at")
        .eq("id", user!.id).single();

      if (!up) { setLoading(false); return; }
      setUserProfile(up as UserProfile);

      const isCreator = up.account_type === "creator" || up.onboarding_path === "creator";
      const isBiz     = up.account_type === "brand" || up.account_type === "business" ||
        up.onboarding_path === "business_creator" || up.onboarding_path === "business_marketing";

      if (isCreator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: cp } = await (supabase as any).from("creator_profiles").select("*").eq("user_id", user!.id).maybeSingle();
        if (cp) setCreatorProf(cp as CreatorProfile);
      }
      if (isBiz) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bp } = await (supabase as any).from("business_profiles").select("*").eq("user_id", user!.id).maybeSingle();
        if (bp) setBizProf(bp as BusinessProfile);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSignOut() {
    await signOut();
    nav({ to: "/login" });
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: C.canvas }}>
        <Skeleton />
      </div>
    );
  }

  const displayName   = userProfile?.name ?? userProfile?.email?.split("@")[0] ?? "Account";
  const email         = userProfile?.email ?? "";
  const initial       = displayName[0]?.toUpperCase() ?? "?";
  const role          = roleLabel(userProfile);
  const isCreator     = isCreatorAcc(userProfile);
  const isBusiness    = isBusinessAcc(userProfile);
  const memberDate    = userProfile?.created_at ? memberSince(userProfile.created_at) : "";

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>
      <div className="h-[52px] px-6 flex items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <span className="text-[12px]" style={{ color: C.textMuted }}>Account</span>
        <span className="text-[12px]" style={{ color: C.textMuted }}>/</span>
        <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>Profile</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-6 py-8 pb-20 space-y-8">

          {/* Identity card */}
          <div className="rounded-2xl p-5"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
            <div className="flex items-start gap-4">
              {(creatorProf?.profile_image_url || bizProf?.logo_url) ? (
                <img src={(creatorProf?.profile_image_url ?? bizProf?.logo_url)!} alt={displayName}
                  className="h-14 w-14 rounded-2xl shrink-0 object-cover img-fade"
                  style={{ border: `1px solid oklch(1 0 0 / 8%)` }}
                  onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }} />
              ) : (
                <div className="h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center text-xl font-bold"
                  style={{ background: avatarBg(displayName), color: "oklch(0.065 0 0)", border: `1px solid oklch(1 0 0 / 8%)` }}>
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="text-[1.1rem] font-semibold tracking-tight" style={{ color: C.textPrimary }}>{displayName}</div>
                  {((isCreator && creatorProf?.is_verified) || (isBusiness && bizProf?.is_verified)) && (
                    <VerifiedBadge type={isCreator ? "creator" : "business"} size="md" />
                  )}
                  {role && (
                    <span className="text-[9.5px] uppercase tracking-[0.22em] rounded-full px-2.5 py-1 font-semibold"
                      style={{ background: "oklch(1 0 0 / 7%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}>
                      {role}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[12.5px]" style={{ color: C.textTertiary }}>{email}</div>
                {memberDate && (
                  <div className="mt-0.5 text-[11px]" style={{ color: C.textMuted }}>Member since {memberDate}</div>
                )}
              </div>
            </div>
          </div>

          {/* Creator Profile */}
          {isCreator && (
            <div>
              {creatorProf ? (
                <CreatorSection cp={creatorProf} />
              ) : (
                <div>
                  <SectionHeader label="Creator Profile" />
                  <div className="rounded-2xl flex flex-col items-center justify-center py-12 text-center"
                    style={{ background: "oklch(1 0 0 / 1.5%)", border: `1px dashed ${C.borderSubtle}` }}>
                    <div className="text-[13px] font-medium mb-2" style={{ color: C.textTertiary }}>
                      Your creator profile isn't set up yet
                    </div>
                    <p className="text-[12px] mb-5 max-w-xs" style={{ color: C.textMuted }}>
                      Build your profile to appear on MRKT Connect and get discovered by brands.
                    </p>
                    <Link to="/creator-onboarding"
                      className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-9 text-[12.5px] font-medium">
                      Build Creator Profile <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Business Profile */}
          {isBusiness && (
            <div>
              {bizProf ? (
                <BusinessSection bp={bizProf} />
              ) : (
                <div>
                  <SectionHeader label="Business Profile" />
                  <div className="rounded-2xl flex flex-col items-center justify-center py-12 text-center"
                    style={{ background: "oklch(1 0 0 / 1.5%)", border: `1px dashed ${C.borderSubtle}` }}>
                    <div className="text-[13px] font-medium mb-2" style={{ color: C.textTertiary }}>Business profile not found</div>
                    <Link to="/business/onboarding"
                      className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-9 text-[12.5px] font-medium mt-3">
                      Complete Business Setup <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {isCreator && creatorProf && (
            <VerificationCard result={computeCreatorVerification(creatorProf)} editHref="/verification" />
          )}

          {isBusiness && (
            <VerificationCard result={computeBusinessVerification(bizProf)} editHref="/business/profile/edit" />
          )}

          {user && (isCreator || isBusiness) && (
            <ReviewsReceivedSection userId={user.id} />
          )}

          {/* Account actions */}
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-4" style={{ color: C.textQuaternary }}>
              Account
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all duration-150"
                style={{ color: "oklch(0.52 0.15 24)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(0.52 0.15 24 / 8%)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-[13px] font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
