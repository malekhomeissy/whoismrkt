// ─────────────────────────────────────────────────────────────────────────────
// /verification — Creator Verification
//
// Standalone product page. Separate from profile completion.
// Verification source of truth = real Instagram follower count from
// Meta Graph API. Manual follower entry is never trusted.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, Instagram, RefreshCw, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { computeCreatorMrktVerification } from "@/lib/verification";
import { formatFollowers } from "@/types/creator";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({ meta: [{ title: "Creator Verification — MRKT" }] }),
  component: VerificationPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const BENEFITS = [
  "Increased visibility across MRKT",
  "Higher placement in MRKT Matches",
  "Increased trust with businesses",
  "Verified creator badge next to your name",
  "Better creator discovery",
  "Stronger applicant credibility",
];

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
      <span className="text-[10.5px] uppercase tracking-[0.2em] font-medium" style={{ color: C.textMuted }}>
        {label}
      </span>
      <span className="text-[13px] font-medium" style={{ color: C.textSecondary }}>
        {value}
      </span>
    </div>
  );
}

function Skeleton() {
  const bar = (w: string) => (
    <div className="h-3 rounded-full animate-pulse" style={{ background: "oklch(1 0 0 / 8%)", width: w }} />
  );
  return (
    <div className="max-w-lg mx-auto px-6 py-12 space-y-6">
      <div className="space-y-2">{bar("180px")}{bar("120px")}</div>
      <div className="rounded-2xl p-5 space-y-4 animate-pulse" style={{ background: C.surface, border: `1px solid ${C.borderNormal}` }}>
        {bar("60%")}{bar("40%")}{bar("50%")}
      </div>
    </div>
  );
}

function formatSyncTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initiateInstagramOAuth() {
  if (!META_APP_ID) {
    alert("Instagram connection is not configured yet. Add VITE_META_APP_ID to your environment variables.");
    return;
  }
  const state = crypto.randomUUID();
  sessionStorage.setItem("ig_oauth_state", state);

  const params = new URLSearchParams({
    client_id:     META_APP_ID,
    redirect_uri:  `${window.location.origin}/instagram-callback`,
    scope:         "instagram_business_basic",
    response_type: "code",
    state,
  });
  window.location.href = `https://www.instagram.com/oauth/authorize?${params}`;
}

// ─── Data interface ───────────────────────────────────────────────────────────

interface CreatorData {
  instagram_handle:               string | null;
  instagram_connected:            boolean;
  instagram_user_id:              string | null;
  instagram_followers:            number | null;
  instagram_followers_synced_at:  string | null;
  instagram_profile_picture_url:  string | null;
  is_verified:                    boolean;
  creator_verification_type:      string | null;
  verification_status:            string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function VerificationPage() {
  const { user }                              = useAuth();
  const [creator,   setCreator]               = useState<CreatorData | null>(null);
  const [loading,   setLoading]               = useState(true);
  const [isCreator, setIsCreator]             = useState(false);
  const [syncing,   setSyncing]               = useState(false);
  const [syncMsg,   setSyncMsg]               = useState<string | null>(null);

  async function loadCreator() {
    if (!user) return;
    const { data: cp } = await (supabase as any)
      .from("creator_profiles")
      .select(
        "instagram_handle,instagram_connected,instagram_user_id," +
        "instagram_followers,instagram_followers_synced_at,instagram_profile_picture_url," +
        "is_verified,creator_verification_type,verification_status"
      )
      .eq("user_id", user.id)
      .maybeSingle();
    setCreator(cp ?? null);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("account_type,onboarding_path")
        .eq("id", user.id)
        .single();

      const creatorRole = prof?.account_type === "creator" || prof?.onboarding_path === "creator";
      setIsCreator(creatorRole);

      if (creatorRole) await loadCreator();
      setLoading(false);
    })();
  }, [user]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await supabase.functions.invoke("instagram-sync");
      const data = res.data as {
        success?:  boolean;
        error?:    string;
        message?:  string;
        instagram?: { username: string; followers_count: number; synced_at: string };
      };

      if (data?.error === "token_expired") {
        setSyncMsg("Connection expired — please reconnect Instagram.");
        setCreator((c) => c ? { ...c, instagram_connected: false } : c);
      } else if (data?.error) {
        setSyncMsg(data.message ?? data.error);
      } else if (data?.success && data.instagram) {
        setSyncMsg(`Updated · ${formatFollowers(data.instagram.followers_count)} followers`);
        await loadCreator(); // refresh from DB
      }
    } catch {
      setSyncMsg("Sync failed. Please try again.");
    }
    setSyncing(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: C.canvas }}>
        <Skeleton />
      </div>
    );
  }

  // ── Business accounts: redirect to profile ────────────────────────────────
  if (!isCreator) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas }}>
        <div className="h-[52px] px-6 flex items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          <ShieldCheck className="h-4 w-4" style={{ color: C.blue }} />
          <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>Verification</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <p className="text-[14px] font-medium mb-2" style={{ color: C.textSecondary }}>
              Business verification is managed on your profile.
            </p>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12px] font-medium transition-all duration-150 mt-3"
              style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
            >
              Go to Profile <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = creator?.instagram_connected === true;
  const v           = computeCreatorMrktVerification(creator);

  const tierLabel =
    v.tier === "organic_70k"    ? "Tier 3 · Official Creator Verified"
    : v.tier === "paid_10k_plus"  ? "Tier 2 · Verified (Purchased)"
    : v.tier === "eligible_paid"  ? "Tier 2 · Eligible for Paid Verification"
    : "Tier 1 · Not Eligible";

  const eligibilityLabel =
    v.tier === "organic_70k"    ? "Eligible for automatic verification"
    : v.tier === "paid_10k_plus"  ? "Purchased verification"
    : v.tier === "eligible_paid"  ? "Eligible to purchase verification"
    : "Not eligible yet";

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.canvas, color: C.textPrimary }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="h-[52px] px-6 flex items-center gap-2.5 shrink-0" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
        <ShieldCheck className="h-4 w-4" style={{ color: C.blue }} />
        <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>Creator Verification</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-6 py-8 pb-20 space-y-5">

          {/* ── Instagram Connection Card ────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              <Instagram className="h-4 w-4 shrink-0" style={{ color: C.textMuted }} />
              <span className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: C.textMuted }}>
                Instagram Account
              </span>
              {isConnected && (
                <span
                  className="ml-auto text-[10px] uppercase tracking-[0.14em] font-bold rounded-full px-2.5 py-1"
                  style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green }}
                >
                  Connected
                </span>
              )}
            </div>

            <div className="px-6 py-5">
              {!isConnected ? (
                /* ── Not connected ─────────────────────────────────────── */
                <div className="space-y-4">
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>
                      Connect your Instagram account
                    </p>
                    <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: C.textMuted }}>
                      MRKT fetches your real follower count directly from Instagram. Manual entry is not accepted for verification.
                    </p>
                  </div>

                  {/* Requirements note */}
                  <div
                    className="rounded-xl px-4 py-3 text-[11.5px] leading-relaxed"
                    style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.borderSubtle}` }}
                  >
                    <span style={{ color: C.textMuted }}>
                      Requires an <span style={{ color: C.textSecondary }}>Instagram Business or Creator account</span> linked to a Facebook Page.{" "}
                      Personal Instagram accounts are not supported.
                    </span>
                  </div>

                  <button
                    onClick={initiateInstagramOAuth}
                    className="inline-flex items-center gap-2.5 rounded-full px-5 h-10 text-[12.5px] font-semibold transition-all duration-150"
                    style={{
                      background: C.blueBg,
                      border:     `1px solid ${C.blueBorder}`,
                      color:      C.blue,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "oklch(0.62 0.10 224 / 22%)";
                      (e.currentTarget as HTMLElement).style.borderColor = "oklch(0.62 0.10 224 / 40%)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = C.blueBg;
                      (e.currentTarget as HTMLElement).style.borderColor = C.blueBorder;
                    }}
                  >
                    <Instagram className="h-4 w-4" />
                    Connect Instagram
                  </button>
                </div>
              ) : (
                /* ── Connected ─────────────────────────────────────────── */
                <div className="space-y-4">
                  {/* Account identity */}
                  <div className="flex items-center gap-3">
                    {creator?.instagram_profile_picture_url ? (
                      <img
                        src={creator.instagram_profile_picture_url}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover shrink-0"
                        style={{ border: `1px solid ${C.borderSubtle}` }}
                      />
                    ) : (
                      <div
                        className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center"
                        style={{ background: C.raised, border: `1px solid ${C.borderSubtle}` }}
                      >
                        <Instagram className="h-4 w-4" style={{ color: C.textMuted }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold" style={{ color: C.textPrimary }}>
                        {creator?.instagram_handle ? `@${creator.instagram_handle}` : "Connected"}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>
                        Verified by Instagram · {formatFollowers(v.igFollowers)} followers
                      </p>
                    </div>
                  </div>

                  {/* Sync row */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px]" style={{ color: C.textMuted }}>
                      Last synced: {formatSyncTime(creator?.instagram_followers_synced_at)}
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-7 text-[11px] font-medium transition-all duration-150"
                      style={{
                        background: C.raised,
                        border:     `1px solid ${C.borderSubtle}`,
                        color:      syncing ? C.textMuted : C.textSecondary,
                        cursor:     syncing ? "not-allowed" : "pointer",
                      }}
                      onMouseEnter={e => { if (!syncing) (e.currentTarget as HTMLElement).style.background = C.high; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.raised; }}
                    >
                      <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing…" : "Refresh"}
                    </button>
                  </div>

                  {syncMsg && (
                    <p className="text-[11.5px]" style={{ color: C.textSecondary }}>{syncMsg}</p>
                  )}

                  {/* Reconnect link */}
                  <button
                    onClick={initiateInstagramOAuth}
                    className="text-[11px] transition-opacity duration-150 hover:opacity-60"
                    style={{ color: C.textMuted }}
                  >
                    Reconnect a different account
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Verification Status Card ─────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          >
            {/* Status bar */}
            <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              {v.isVerified ? (
                <VerifiedBadge type="creator" size="lg" />
              ) : (
                <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8.5" stroke="oklch(1 0 0 / 20%)" strokeWidth="1.4" fill="none" />
                  <path d="M6.2 10.1L8.8 12.8L13.8 7.2" stroke="oklch(1 0 0 / 20%)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold tracking-tight" style={{ color: v.isVerified ? C.textPrimary : C.textSecondary }}>
                  {v.isVerified ? "MRKT Creator Verified" : isConnected ? "Not Verified" : "Connect Instagram to check"}
                </p>
                <p className="text-[11.5px] mt-0.5" style={{ color: C.textMuted }}>
                  {isConnected ? tierLabel : "Follower count required"}
                </p>
              </div>
              {v.isVerified && (
                <span
                  className="text-[10px] uppercase tracking-[0.14em] font-bold rounded-full px-2.5 py-1 shrink-0"
                  style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, color: C.blue }}
                >
                  Verified
                </span>
              )}
            </div>

            {/* Info rows — only show when connected */}
            {isConnected && (
              <div className="px-6">
                <InfoRow
                  label="Instagram Handle"
                  value={
                    creator?.instagram_handle
                      ? (
                        <span className="flex items-center gap-1.5">
                          <Instagram className="h-3.5 w-3.5 shrink-0" style={{ color: C.textMuted }} />
                          @{creator.instagram_handle}
                        </span>
                      )
                      : <span style={{ color: C.textMuted }}>—</span>
                  }
                />
                <InfoRow
                  label="Followers · Verified by Instagram"
                  value={
                    v.igFollowers > 0
                      ? <span className="flex items-center gap-1.5">
                          {formatFollowers(v.igFollowers)}
                          <span className="text-[9.5px] uppercase tracking-[0.12em] font-bold" style={{ color: C.blue }}>
                            Live
                          </span>
                        </span>
                      : <span style={{ color: C.textMuted }}>—</span>
                  }
                />
                <InfoRow label="Eligibility"  value={eligibilityLabel} />
                <InfoRow label="Last Synced"  value={formatSyncTime(creator?.instagram_followers_synced_at)} />
              </div>
            )}

            {!isConnected && (
              <div className="px-6 py-4">
                <p className="text-[12px]" style={{ color: C.textMuted }}>
                  Connect your Instagram account above to see your verification status.
                </p>
              </div>
            )}
          </div>

          {/* ── Tier Explanation ─────────────────────────────────────────── */}
          <div
            className="rounded-2xl px-6 py-5 space-y-4"
            style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}
          >
            <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold" style={{ color: C.textMuted }}>
              Verification Tiers
            </div>

            {[
              {
                tier:   "Tier 1",
                label:  "Not Eligible",
                sub:    "Under 10,000 Instagram followers",
                active: isConnected && v.tier === "not_eligible",
              },
              {
                tier:   "Tier 2",
                label:  "Eligible for Paid Verification",
                sub:    "10,000 – 69,999 Instagram followers",
                active: isConnected && (v.tier === "eligible_paid" || v.tier === "paid_10k_plus"),
              },
              {
                tier:   "Tier 3",
                label:  "Official Creator Verified",
                sub:    "70,000+ Instagram followers",
                active: isConnected && v.tier === "organic_70k",
              },
            ].map((t) => (
              <div
                key={t.tier}
                className="flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all duration-150"
                style={{
                  background: t.active ? "oklch(1 0 0 / 6%)" : "transparent",
                  border:     `1px solid ${t.active ? C.borderNormal : "transparent"}`,
                }}
              >
                <div
                  className="h-5 w-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                  style={{
                    background: t.active ? C.accent : "oklch(1 0 0 / 8%)",
                    border:     `1px solid ${t.active ? C.accent : C.borderSubtle}`,
                  }}
                >
                  {t.active && <div className="h-2 w-2 rounded-full" style={{ background: "oklch(0.06 0 0)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: t.active ? C.accent : C.textMuted }}>
                    {t.tier}
                  </span>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: t.active ? C.textPrimary : C.textSecondary }}>
                    {t.label}
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: C.textMuted }}>{t.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Benefits ─────────────────────────────────────────────────── */}
          {isConnected && (v.isVerified || v.tier === "eligible_paid") && (
            <div className="rounded-2xl px-6 py-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
              <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4" style={{ color: C.textMuted }}>
                {v.isVerified ? "Your benefits" : "Benefits of verification"}
              </div>
              <div className="space-y-3">
                {BENEFITS.map((b) => (
                  <div key={b} className="flex items-center gap-3">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: v.isVerified ? C.accent : "oklch(1 0 0 / 22%)" }}
                    />
                    <span className="text-[13px]" style={{ color: v.isVerified ? C.textSecondary : C.textTertiary }}>
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Action / CTA ─────────────────────────────────────────────── */}
          <div className="rounded-2xl px-6 py-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-[13.5px] font-semibold" style={{ color: C.textSecondary }}>
                  Connect Instagram to begin
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: C.textMuted }}>
                  Verification is based entirely on your real Instagram follower count. Connect your Business or Creator account to get started.
                </p>
                <button
                  onClick={initiateInstagramOAuth}
                  className="inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12px] font-medium transition-all duration-150"
                  style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.high; (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.raised; (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
                >
                  <Instagram className="h-3.5 w-3.5" /> Connect Instagram
                </button>
              </div>
            ) : v.isVerified ? (
              <div className="flex items-center gap-3">
                <VerifiedBadge type="creator" size="md" />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
                    You're verified on MRKT.
                  </p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: C.textMuted }}>
                    Your badge appears next to your name everywhere on the platform.
                  </p>
                </div>
              </div>
            ) : v.tier === "eligible_paid" ? (
              <div className="space-y-3">
                <p className="text-[13.5px] font-semibold" style={{ color: C.textPrimary }}>
                  You're eligible for Creator Verification.
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: C.textMuted }}>
                  Purchase a verified badge to stand out with businesses and increase your discoverability across MRKT.
                </p>
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-full px-6 h-10 text-[12.5px] font-medium cursor-not-allowed"
                  style={{ background: C.raised, border: `1px solid ${C.borderNormal}`, color: C.textMuted }}
                >
                  Payments — launching soon
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[13.5px] font-semibold" style={{ color: C.textSecondary }}>Not eligible yet.</p>
                <p className="text-[12px] leading-relaxed" style={{ color: C.textMuted }}>
                  {v.igFollowers > 0
                    ? `You have ${formatFollowers(v.igFollowers)} Instagram followers. Grow to 10K to unlock Creator Verification.`
                    : "Your follower count will appear here after syncing."}
                </p>
              </div>
            )}
          </div>

          {/* ── Badge preview ─────────────────────────────────────────────── */}
          <div className="rounded-2xl px-6 py-5" style={{ background: C.surface, border: `1px solid ${C.borderNormal}`, boxShadow: C.shadowCard }}>
            <div className="text-[9.5px] uppercase tracking-[0.28em] font-semibold mb-4" style={{ color: C.textMuted }}>
              Badge Preview
            </div>
            <div className="flex items-center gap-3">
              <VerifiedBadge type="creator" size="md" style={{ opacity: v.isVerified ? 1 : 0.22 }} />
              <div>
                <p className="text-[13px] font-medium" style={{ color: v.isVerified ? C.textPrimary : C.textTertiary }}>
                  Creator Name
                </p>
                <p className="text-[11px]" style={{ color: C.textMuted }}>
                  {v.isVerified
                    ? "This is how your badge appears next to your name."
                    : "Badge appears once you're verified."}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
