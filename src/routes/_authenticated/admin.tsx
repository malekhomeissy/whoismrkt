// ─────────────────────────────────────────────────────────────────────────────
// /admin — Founder Command Center
// Server-side admin guard via is_admin() RPC. No client-side email trust.
// Tabs: Overview · Users · Pioneer · Contracts · Trust · AI · Log
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CREDIT_VALUE_USD } from "@/lib/aiCredits";
import { toast } from "sonner";
import {
  Users, Building2, Megaphone, Zap, TrendingUp, ShieldCheck,
  RefreshCw, Activity, ChevronRight, ArrowUpRight, Cpu,
  Star, FileText, CheckCircle2, XCircle, Clock, AlertCircle,
  Search, ScrollText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Command Center — MRKT Internal" }] }),
  component: AdminPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

const card    = { background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" };
const muted   = { color: "oklch(1 0 0 / 40%)" };
const dimmed  = { color: "oklch(1 0 0 / 26%)" };
const text    = { color: "oklch(1 0 0 / 88%)" };

type Tab = "overview" | "users" | "pioneer" | "contracts" | "trust" | "ai" | "log" | "abuse";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={card}>
      <div className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3" style={dimmed}>{label}</div>
      <div className="font-display text-[2rem] font-bold tracking-[-0.04em] leading-none" style={{ color: accent ?? "oklch(1 0 0 / 88%)" }}>
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px]" style={muted}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Icon className="h-4 w-4" style={{ color: "oklch(1 0 0 / 36%)" }} />
      <h2 className="text-[11px] uppercase tracking-[0.28em] font-semibold" style={dimmed}>{title}</h2>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number; totalCreators: number; totalBusinesses: number;
  verifiedCreators: number; betaPioneers: number;
  totalCampaigns: number; activeCampaigns: number; totalApplications: number; totalMessages: number;
  totalCreditsUsed: number; totalAiCostUsd: number; proUsers: number;
  newUsersWeek: number; newCampaignsWeek: number; newAppsWeek: number;
  totalContracts: number; acceptedContracts: number; pendingContracts: number;
}

interface CreatorRow {
  id: string; user_id: string; display_name: string; username: string;
  is_verified: boolean; is_beta_pioneer: boolean; follower_count: number | null;
  niche: string | null; created_at: string;
}

interface ContractRow {
  id: string; campaign_title: string; title: string; status: string;
  created_at: string; sent_at: string | null; accepted_at: string | null;
  signed_at: string | null; signer_email: string | null;
  creator_name?: string; business_name?: string;
}

interface ActionLogRow {
  id: string; admin_id: string; admin_email: string;
  action: string; target_id: string | null; target_type: string | null;
  payload: Record<string, unknown> | null; created_at: string;
}

interface AbuseReportRow {
  id: string; reporter_id: string; reported_user_id: string | null;
  content_id: string | null; reason: string; description: string | null;
  status: string; created_at: string;
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0, totalCreators: 0, totalBusinesses: 0, verifiedCreators: 0, betaPioneers: 0,
  totalCampaigns: 0, activeCampaigns: 0, totalApplications: 0, totalMessages: 0,
  totalCreditsUsed: 0, totalAiCostUsd: 0, proUsers: 0,
  newUsersWeek: 0, newCampaignsWeek: 0, newAppsWeek: 0,
  totalContracts: 0, acceptedContracts: 0, pendingContracts: 0,
};

// ─── Main page ────────────────────────────────────────────────────────────────

function AdminPage() {
  const { user } = useAuth();

  // null = checking, false = not admin, true = admin
  const [isAdmin, setIsAdmin]     = useState<boolean | null>(null);
  const [tab, setTab]             = useState<Tab>("overview");
  const [stats, setStats]         = useState<AdminStats>(EMPTY_STATS);
  const [creators, setCreators]   = useState<CreatorRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [actionLog, setActionLog] = useState<ActionLogRow[]>([]);
  const [abuseReports, setAbuseReports] = useState<AbuseReportRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Server-side admin check ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_admin").then(({ data, error }) => {
      setIsAdmin(error ? false : Boolean(data));
    });
  }, [user]);

  // ── Data loaders ─────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      usersR, creatorsR, bizR, verifiedR, pioneersR,
      campaignsR, activeCampsR, appsR, msgsR,
      aiR, proR, newUsersR, newCampsR, newAppsR,
      contractsR, acceptedR, pendingR,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("creator_profiles").select("id", { count: "exact", head: true }),
      supabase.from("business_profiles").select("id", { count: "exact", head: true }),
      supabase.from("creator_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_beta_pioneer", true),
      supabase.from("campaigns").select("id", { count: "exact", head: true }),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).in("status", ["active", "published"]),
      supabase.from("campaign_applications").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("ai_credits").select("used_credits"),
      supabase.from("ai_credits").select("id", { count: "exact", head: true }).eq("is_pro", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("campaigns").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("campaign_applications").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("contracts").select("id", { count: "exact", head: true }),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      supabase.from("contracts").select("id", { count: "exact", head: true }).eq("status", "sent"),
    ]);
    const credRows = (aiR.data ?? []) as { used_credits: number }[];
    const used = credRows.reduce((s: number, r: { used_credits: number }) => s + (r.used_credits ?? 0), 0);
    setStats({
      totalUsers: usersR.count ?? 0, totalCreators: creatorsR.count ?? 0, totalBusinesses: bizR.count ?? 0,
      verifiedCreators: verifiedR.count ?? 0, betaPioneers: pioneersR.count ?? 0,
      totalCampaigns: campaignsR.count ?? 0, activeCampaigns: activeCampsR.count ?? 0,
      totalApplications: appsR.count ?? 0, totalMessages: msgsR.count ?? 0,
      totalCreditsUsed: used, totalAiCostUsd: parseFloat((used * CREDIT_VALUE_USD).toFixed(2)),
      proUsers: proR.count ?? 0,
      newUsersWeek: newUsersR.count ?? 0, newCampaignsWeek: newCampsR.count ?? 0, newAppsWeek: newAppsR.count ?? 0,
      totalContracts: contractsR.count ?? 0, acceptedContracts: acceptedR.count ?? 0, pendingContracts: pendingR.count ?? 0,
    });
    setLastRefresh(new Date());
    setLoading(false);
  }, [isAdmin]);

  const loadCreators = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("creator_profiles")
      .select("id, user_id, display_name, username, is_verified, is_beta_pioneer, follower_count, niche, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setCreators((data ?? []) as CreatorRow[]);
  }, [isAdmin]);

  const loadContracts = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("contracts")
      .select("id, campaign_title, title, status, created_at, sent_at, accepted_at, signed_at, signer_email, creator_name, business_name")
      .order("created_at", { ascending: false })
      .limit(100);
    setContracts((data ?? []) as ContractRow[]);
  }, [isAdmin]);

  const loadActionLog = useCallback(async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase.rpc("get_admin_action_log", { p_limit: 100 });
    if (!error) setActionLog((data ?? []) as ActionLogRow[]);
  }, [isAdmin]);

  const loadAbuseReports = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("abuse_reports")
      .select("id,reporter_id,reported_user_id,content_id,reason,description,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setAbuseReports((data ?? []) as AbuseReportRow[]);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin === true) {
      loadStats();
      loadCreators();
      loadContracts();
      loadActionLog();
      loadAbuseReports();
    }
  }, [isAdmin, loadStats, loadCreators, loadContracts, loadActionLog, loadAbuseReports]);

  // ── Admin actions ─────────────────────────────────────────────────────────────

  async function grantPioneer(userId: string, name: string) {
    if (!user) return;
    setActionPending(userId);
    const { error } = await supabase.rpc("admin_grant_pioneer", {
      p_user_id:  userId,
      p_admin_id: user.id,
      p_note:     "Granted via admin command center",
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(`Pioneer granted to ${name}`);
      await Promise.all([loadCreators(), loadStats(), loadActionLog()]);
    }
    setActionPending(null);
  }

  async function revokePioneer(userId: string, name: string) {
    if (!user) return;
    setActionPending(userId);
    const { error } = await supabase.rpc("admin_revoke_pioneer", {
      p_user_id:  userId,
      p_admin_id: user.id,
      p_note:     "Revoked via admin command center",
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(`Pioneer revoked for ${name}`);
      await Promise.all([loadCreators(), loadStats(), loadActionLog()]);
    }
    setActionPending(null);
  }

  async function verifyCreator(creatorProfileId: string, name: string) {
    if (!user) return;
    setActionPending(creatorProfileId + "_verify");
    const { error } = await supabase.rpc("admin_verify_creator", {
      p_creator_id: creatorProfileId,
      p_admin_id:   user.id,
      p_note:       "Verified via admin command center",
    });
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success(`${name} is now Verified`);
      await Promise.all([loadCreators(), loadStats(), loadActionLog()]);
    }
    setActionPending(null);
  }

  // ── States ────────────────────────────────────────────────────────────────────

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0 0 0)" }}>
        <div className="text-[12px]" style={dimmed}>Checking access…</div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "oklch(0 0 0)" }}>
        <ShieldCheck className="h-8 w-8" style={dimmed} />
        <div className="text-[13px]" style={muted}>Nothing to see here.</div>
        <Link to="/home" className="text-[12px]" style={dimmed}>Go home</Link>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString();
  const pct = (n: number, d: number) => d > 0 ? `${Math.round((n / d) * 100)}%` : "—";

  const filteredCreators = creators.filter(c =>
    !search ||
    c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.niche?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",  label: "Overview" },
    { id: "users",     label: "Users" },
    { id: "pioneer",   label: `Pioneer (${stats.betaPioneers})` },
    { id: "contracts", label: "Contracts" },
    { id: "trust",     label: "Trust" },
    { id: "ai",        label: "AI & Costs" },
    { id: "abuse",     label: "Abuse Reports" },
    { id: "log",       label: "Action Log" },
  ];

  return (
    <div className="min-h-screen text-foreground" style={{ background: "oklch(0 0 0)" }}>

      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
        style={{ background: "oklch(0 0 0 / 90%)", backdropFilter: "blur(16px)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.36em] font-semibold mb-0.5" style={dimmed}>MRKT Internal</div>
          <h1 className="font-display text-[1.25rem] font-bold tracking-tight" style={text}>Command Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "oklch(0.62 0.12 158)" }} />
            <span className="text-[10px]" style={{ color: "oklch(0.62 0.12 158)" }}>Admin verified</span>
          </div>
          <div className="text-[11px]" style={dimmed}>
            {loading ? "Loading…" : lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={() => { loadStats(); loadCreators(); loadContracts(); loadActionLog(); }}
            disabled={loading}
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ ...card, opacity: loading ? 0.4 : 1 }}
          >
            <RefreshCw className="h-3.5 w-3.5" style={muted} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-6 flex gap-1 pt-4 pb-0 overflow-x-auto" style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-[12px] font-medium rounded-t-lg transition-colors whitespace-nowrap"
            style={{
              color: tab === t.id ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 36%)",
              borderBottom: tab === t.id ? "2px solid oklch(0.72 0.10 224)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="px-6 py-8 max-w-6xl mx-auto">

        {/* ══ OVERVIEW ════════════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div className="space-y-10">
            <section>
              <SectionTitle icon={Activity} title="Platform" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Total Users"   value={fmt(stats.totalUsers)}    sub={`+${stats.newUsersWeek} this week`} />
                <Stat label="Creators"      value={fmt(stats.totalCreators)} sub={`${stats.verifiedCreators} verified`} />
                <Stat label="Businesses"    value={fmt(stats.totalBusinesses)} />
                <Stat label="Beta Pioneers" value={fmt(stats.betaPioneers)}  sub={pct(stats.betaPioneers, stats.totalCreators) + " of creators"} accent="oklch(0.70 0.08 68)" />
              </div>
            </section>
            <section>
              <SectionTitle icon={Megaphone} title="Marketplace" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Campaigns"       value={fmt(stats.totalCampaigns)}    sub={`${stats.activeCampaigns} active`} />
                <Stat label="New (7d)"        value={fmt(stats.newCampaignsWeek)}  accent="oklch(0.62 0.12 158)" />
                <Stat label="Applications"    value={fmt(stats.totalApplications)} sub={`+${stats.newAppsWeek} this week`} />
                <Stat label="Messages"        value={fmt(stats.totalMessages)} />
              </div>
            </section>
            <section>
              <SectionTitle icon={FileText} title="Contracts" />
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Total"    value={fmt(stats.totalContracts)} />
                <Stat label="Accepted" value={fmt(stats.acceptedContracts)} accent="oklch(0.62 0.12 158)" />
                <Stat label="Pending"  value={fmt(stats.pendingContracts)} accent="oklch(0.70 0.08 68)" />
              </div>
            </section>
            <section>
              <SectionTitle icon={TrendingUp} title="Growth (7d)" />
              <div className="grid grid-cols-3 gap-3">
                <Stat label="New Users"     value={fmt(stats.newUsersWeek)}     accent="oklch(0.62 0.12 158)" />
                <Stat label="New Campaigns" value={fmt(stats.newCampaignsWeek)} accent="oklch(0.62 0.12 158)" />
                <Stat label="New Apps"      value={fmt(stats.newAppsWeek)}      accent="oklch(0.62 0.12 158)" />
              </div>
            </section>
            <div>
              <SectionTitle icon={ChevronRight} title="Quick Links" />
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Find Creators", to: "/find-creators" },
                  { label: "Campaigns",     to: "/campaigns/" },
                  { label: "Pipeline",      to: "/pipeline" },
                  { label: "Analytics",     to: "/analytics" },
                ].map(l => (
                  <Link
                    key={l.to}
                    to={l.to as "/find-creators"}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 h-9 text-[12px] font-medium"
                    style={card}
                  >
                    {l.label} <ArrowUpRight className="h-3 w-3" style={muted} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ USERS ═══════════════════════════════════════════════════════════ */}
        {tab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={dimmed} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search creators…"
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-[12.5px] outline-none"
                  style={{ ...card, color: "oklch(1 0 0 / 80%)" }}
                />
              </div>
              <div className="text-[12px]" style={dimmed}>{filteredCreators.length} creators</div>
            </div>
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {filteredCreators.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="flex min-w-[160px] flex-1 items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "oklch(0.72 0.10 224 / 18%)", color: "oklch(0.72 0.10 224)" }}>
                      {c.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium" style={text}>{c.display_name || "—"}</div>
                      <div className="truncate text-[10.5px]" style={dimmed}>@{c.username || "—"}</div>
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-[12px]" style={muted}>{c.niche || "—"}</div>
                  <div className="w-16 shrink-0 text-[12px]" style={muted}>
                    {c.follower_count ? `${(c.follower_count / 1000).toFixed(1)}K` : "—"}
                  </div>
                  <div className="flex w-28 shrink-0 flex-wrap items-center gap-1.5">
                    {c.is_beta_pioneer && (
                      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold" style={{ background: "oklch(0.70 0.08 68 / 15%)", color: "oklch(0.70 0.08 68)", border: "1px solid oklch(0.70 0.08 68 / 30%)" }}>Pioneer</span>
                    )}
                    {c.is_verified && (
                      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold" style={{ background: "oklch(0.62 0.12 158 / 15%)", color: "oklch(0.62 0.12 158)", border: "1px solid oklch(0.62 0.12 158 / 30%)" }}>Verified</span>
                    )}
                    {!c.is_beta_pioneer && !c.is_verified && <span className="text-[9.5px]" style={dimmed}>None</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!c.is_verified && (
                      <button
                        onClick={() => verifyCreator(c.id, c.display_name)}
                        disabled={actionPending === c.id + "_verify"}
                        className="rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-opacity disabled:opacity-40"
                        style={{ background: "oklch(0.62 0.12 158 / 15%)", color: "oklch(0.62 0.12 158)", border: "1px solid oklch(0.62 0.12 158 / 25%)" }}
                      >Verify</button>
                    )}
                    {!c.is_beta_pioneer ? (
                      <button
                        onClick={() => grantPioneer(c.user_id, c.display_name)}
                        disabled={actionPending === c.user_id}
                        className="rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-opacity disabled:opacity-40"
                        style={{ background: "oklch(0.70 0.08 68 / 15%)", color: "oklch(0.70 0.08 68)", border: "1px solid oklch(0.70 0.08 68 / 25%)" }}
                      >Grant Pioneer</button>
                    ) : (
                      <button
                        onClick={() => revokePioneer(c.user_id, c.display_name)}
                        disabled={actionPending === c.user_id}
                        className="rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-opacity disabled:opacity-40"
                        style={{ ...card, color: "oklch(1 0 0 / 40%)" }}
                      >Revoke Pioneer</button>
                    )}
                  </div>
                </div>
              ))}
              {filteredCreators.length === 0 && (
                <div className="px-4 py-8 text-center text-[12px]" style={dimmed}>{loading ? "Loading…" : "No creators found"}</div>
              )}
            </div>
          </div>
        )}

        {/* ══ PIONEER PROGRAM ══════════════════════════════════════════════════ */}
        {tab === "pioneer" && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.70 0.08 68 / 8%)", border: "1px solid oklch(0.70 0.08 68 / 20%)" }}>
              <div className="text-[11px] uppercase tracking-[0.28em] font-semibold mb-2" style={{ color: "oklch(0.70 0.08 68)" }}>Pioneer Program</div>
              <p className="text-[13px] leading-relaxed" style={muted}>
                Pioneer status is granted to the first <strong style={text}>50 creators</strong> who meet the quality bar.
                Target: 50 creators, {stats.betaPioneers} granted so far.
              </p>
              <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (stats.betaPioneers / 50) * 100)}%`, background: "oklch(0.70 0.08 68)" }} />
              </div>
              <div className="mt-2 text-[11px]" style={dimmed}>{stats.betaPioneers} / 50 target</div>
            </div>

            <SectionTitle icon={Star} title="All Pioneers" />
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {creators.filter(c => c.is_beta_pioneer).map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="flex min-w-[160px] flex-1 items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "oklch(0.70 0.08 68 / 18%)", color: "oklch(0.70 0.08 68)" }}>
                      {c.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium" style={text}>{c.display_name}</div>
                      <div className="truncate text-[10.5px]" style={dimmed}>@{c.username}</div>
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-[12px]" style={muted}>{c.niche || "—"}</div>
                  <div className="w-16 shrink-0 text-[12px]" style={muted}>{c.follower_count ? `${(c.follower_count / 1000).toFixed(1)}K` : "—"}</div>
                  <div className="w-24 shrink-0">
                    {c.is_verified
                      ? <span className="text-[11px]" style={{ color: "oklch(0.62 0.12 158)" }}>✓ Verified</span>
                      : <span className="text-[11px]" style={dimmed}>—</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!c.is_verified && (
                      <button onClick={() => verifyCreator(c.id, c.display_name)} disabled={!!actionPending}
                        className="rounded-lg px-2 py-1 text-[10px] transition-opacity disabled:opacity-40"
                        style={{ background: "oklch(0.62 0.12 158 / 12%)", color: "oklch(0.62 0.12 158)", border: "1px solid oklch(0.62 0.12 158 / 22%)" }}>
                        Verify
                      </button>
                    )}
                    <button onClick={() => revokePioneer(c.user_id, c.display_name)} disabled={actionPending === c.user_id}
                      className="rounded-lg px-2.5 py-1.5 text-[10.5px] transition-opacity disabled:opacity-40"
                      style={{ background: "oklch(0.52 0.15 24 / 10%)", color: "oklch(0.52 0.15 24)", border: "1px solid oklch(0.52 0.15 24 / 20%)" }}>
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
              {creators.filter(c => c.is_beta_pioneer).length === 0 && (
                <div className="px-4 py-8 text-center text-[12px]" style={dimmed}>No pioneers yet</div>
              )}
            </div>

            <SectionTitle icon={Users} title="Eligible — Grant Pioneer" />
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {creators.filter(c => !c.is_beta_pioneer).slice(0, 30).map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="flex min-w-[160px] flex-1 items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(1 0 0 / 50%)" }}>
                      {c.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium" style={text}>{c.display_name || "—"}</div>
                      <div className="truncate text-[10.5px]" style={dimmed}>@{c.username}</div>
                    </div>
                  </div>
                  <div className="w-24 shrink-0 text-[12px]" style={muted}>{c.niche || "—"}</div>
                  <div className="w-16 shrink-0 text-[12px]" style={muted}>{c.follower_count ? `${(c.follower_count / 1000).toFixed(1)}K` : "—"}</div>
                  <div className="w-8 shrink-0">
                    {c.is_verified ? <span style={{ color: "oklch(0.62 0.12 158)" }}>✓</span> : <span style={dimmed}>—</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!c.is_verified && (
                      <button onClick={() => verifyCreator(c.id, c.display_name)} disabled={!!actionPending}
                        className="rounded-lg px-2 py-1 text-[10px] transition-opacity disabled:opacity-40"
                        style={{ background: "oklch(0.62 0.12 158 / 12%)", color: "oklch(0.62 0.12 158)", border: "1px solid oklch(0.62 0.12 158 / 22%)" }}>
                        Verify
                      </button>
                    )}
                    <button onClick={() => grantPioneer(c.user_id, c.display_name)} disabled={!!actionPending}
                      className="rounded-lg px-2.5 py-1 text-[10px] font-medium transition-opacity disabled:opacity-40"
                      style={{ background: "oklch(0.70 0.08 68 / 15%)", color: "oklch(0.70 0.08 68)", border: "1px solid oklch(0.70 0.08 68 / 25%)" }}>
                      Grant Pioneer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CONTRACTS ════════════════════════════════════════════════════════ */}
        {tab === "contracts" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total Contracts"    value={fmt(stats.totalContracts)} />
              <Stat label="Accepted / Signed"  value={fmt(stats.acceptedContracts)} accent="oklch(0.62 0.12 158)" />
              <Stat label="Awaiting Response"  value={fmt(stats.pendingContracts)} accent="oklch(0.70 0.08 68)" />
            </div>
            <SectionTitle icon={FileText} title="Recent Contracts" />
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {contracts.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="min-w-[140px] flex-1 truncate text-[12px]" style={text}>{c.campaign_title || c.title}</div>
                  <div className="w-40 shrink-0 truncate text-[12px]" style={muted}>{c.business_name || "—"} → {c.creator_name || "—"}</div>
                  <div className="w-24 shrink-0">
                    <span className="rounded-full px-2 py-0.5 text-[9.5px] font-semibold" style={{
                      background: c.status === "accepted" ? "oklch(0.62 0.12 158 / 15%)" : c.status === "sent" ? "oklch(0.70 0.08 68 / 15%)" : c.status === "declined" ? "oklch(0.52 0.15 24 / 15%)" : "oklch(1 0 0 / 5%)",
                      color: c.status === "accepted" ? "oklch(0.62 0.12 158)" : c.status === "sent" ? "oklch(0.70 0.08 68)" : c.status === "declined" ? "oklch(0.52 0.15 24)" : "oklch(1 0 0 / 40%)",
                      border: "1px solid oklch(1 0 0 / 8%)",
                    }}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </div>
                  <div className="w-20 shrink-0 text-[11px]" style={dimmed}>{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "—"}</div>
                  <div className="w-28 shrink-0">
                    {c.signed_at ? (
                      <div>
                        <div className="text-[11px]" style={{ color: "oklch(0.62 0.12 158)" }}>{new Date(c.signed_at).toLocaleDateString()}</div>
                        {c.signer_email && <div className="truncate text-[10px]" style={dimmed}>{c.signer_email}</div>}
                      </div>
                    ) : <span className="text-[11px]" style={dimmed}>—</span>}
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="px-4 py-8 text-center text-[12px]" style={dimmed}>No contracts yet</div>
              )}
            </div>
          </div>
        )}

        {/* ══ TRUST ════════════════════════════════════════════════════════════ */}
        {tab === "trust" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Verified Creators" value={fmt(stats.verifiedCreators)} sub={pct(stats.verifiedCreators, stats.totalCreators) + " of creators"} />
              <Stat label="Beta Pioneers"     value={fmt(stats.betaPioneers)}     sub="+5 trust bonus each" accent="oklch(0.70 0.08 68)" />
              <Stat label="Verification Rate" value={pct(stats.verifiedCreators, stats.totalCreators)}
                accent={(stats.verifiedCreators / Math.max(1, stats.totalCreators)) >= 0.4 ? "oklch(0.62 0.12 158)" : "oklch(0.70 0.08 68)"}
                sub="target: >40%" />
            </div>
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.62 0.10 224 / 6%)", border: "1px solid oklch(0.62 0.10 224 / 20%)" }}>
              <div className="text-[11px] uppercase tracking-[0.28em] font-semibold mb-3" style={{ color: "oklch(0.72 0.10 224)" }}>Trust Tier Formula</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { tier: "New",     score: "< 45",  camps: "< 1" },
                  { tier: "Rising",  score: "≥ 45",  camps: "≥ 1" },
                  { tier: "Trusted", score: "≥ 70",  camps: "≥ 5" },
                  { tier: "Elite",   score: "≥ 88",  camps: "≥ 15" },
                ].map(t => (
                  <div key={t.tier} className="rounded-xl p-3" style={card}>
                    <div className="text-[12px] font-semibold mb-1.5" style={text}>{t.tier}</div>
                    <div className="text-[10.5px]" style={dimmed}>Score {t.score}</div>
                    <div className="text-[10.5px]" style={dimmed}>Campaigns {t.camps}</div>
                  </div>
                ))}
              </div>
            </div>
            <SectionTitle icon={ShieldCheck} title="Quick Verify — Unverified Creators" />
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {creators.filter(c => !c.is_verified).slice(0, 20).map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="min-w-[140px] flex-1">
                    <div className="text-[12.5px] font-medium" style={text}>{c.display_name || "—"}</div>
                    <div className="text-[10.5px]" style={dimmed}>@{c.username}</div>
                  </div>
                  <div className="w-24 shrink-0 text-[12px]" style={muted}>{c.niche || "—"}</div>
                  <div className="w-16 shrink-0 text-[12px]" style={muted}>{c.follower_count ? `${(c.follower_count / 1000).toFixed(1)}K` : "—"}</div>
                  <div className="w-20 shrink-0">
                    {c.is_beta_pioneer ? <span style={{ color: "oklch(0.70 0.08 68)" }}>★ Pioneer</span> : <span style={dimmed}>—</span>}
                  </div>
                  <button
                    onClick={() => verifyCreator(c.id, c.display_name)}
                    disabled={actionPending === c.id + "_verify"}
                    className="rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-opacity disabled:opacity-40"
                    style={{ background: "oklch(0.62 0.12 158 / 15%)", color: "oklch(0.62 0.12 158)", border: "1px solid oklch(0.62 0.12 158 / 25%)" }}
                  >Verify</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ AI & COSTS ═══════════════════════════════════════════════════════ */}
        {tab === "ai" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Credits Used"  value={fmt(stats.totalCreditsUsed)} accent="oklch(0.72 0.10 224)" />
              <Stat label="AI Cost (Est.)" value={`$${stats.totalAiCostUsd}`} sub={`at $${CREDIT_VALUE_USD}/credit`} />
              <Stat label="Avg / User"    value={stats.totalUsers > 0 ? Math.round(stats.totalCreditsUsed / stats.totalUsers) : "—"} sub="credits per user" />
              <Stat label="Pro Users"     value={fmt(stats.proUsers)} accent="oklch(0.70 0.08 68)" />
            </div>
            <div className="rounded-2xl p-5" style={card}>
              <div className="text-[11px] uppercase tracking-[0.28em] font-semibold mb-4" style={dimmed}>Credit Cost Basis</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  ["Content Idea", "1 cr"],
                  ["Strategist Message", "2 cr"],
                  ["Application Draft", "3 cr"],
                  ["Match Analysis", "3 cr"],
                  ["Calendar Plan", "5 cr"],
                  ["Profile Audit", "10 cr"],
                ].map(([label, cost]) => (
                  <div key={label} className="flex justify-between items-center rounded-lg px-3 py-2" style={{ background: "oklch(1 0 0 / 3%)" }}>
                    <span className="text-[11px]" style={text}>{label}</span>
                    <span className="text-[10.5px] font-mono" style={{ color: "oklch(0.72 0.10 224)" }}>{cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ ACTION LOG ═══════════════════════════════════════════════════════ */}
        {/* ══ ABUSE REPORTS ══════════════════════════════════════════════════ */}
        {tab === "abuse" && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {abuseReports.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="w-20 shrink-0 whitespace-nowrap text-[11px]" style={dimmed}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  <div className="w-24 shrink-0">
                    <span className="rounded-full px-2 py-0.5 text-[9.5px] font-mono" style={{ background: "oklch(0.52 0.15 24 / 12%)", color: "oklch(0.72 0.15 24)" }}>
                      {r.reason}
                    </span>
                  </div>
                  <div className="w-20 shrink-0">
                    <span className="rounded-full px-2 py-0.5 text-[9.5px]" style={{
                      background: r.status === "resolved" ? "oklch(0.62 0.12 158 / 12%)" : "oklch(0.70 0.08 68 / 12%)",
                      color: r.status === "resolved" ? "oklch(0.62 0.12 158)" : "oklch(0.70 0.08 68)",
                    }}>
                      {r.status}
                    </span>
                  </div>
                  <div className="min-w-[140px] max-w-[220px] flex-1 truncate text-[11px]" style={muted}>
                    {r.description ?? "—"}
                  </div>
                  <div className="w-20 shrink-0 truncate text-[10.5px] font-mono" style={dimmed}>
                    {r.reporter_id.slice(0, 8)}…
                  </div>
                  <div className="w-20 shrink-0 truncate text-[10.5px] font-mono" style={dimmed}>
                    {r.reported_user_id ? r.reported_user_id.slice(0, 8) + "…" : "—"}
                  </div>
                </div>
              ))}
              {abuseReports.length === 0 && (
                <div className="px-4 py-8 text-center text-[12px]" style={dimmed}>No abuse reports</div>
              )}
            </div>
          </div>
        )}

        {tab === "log" && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.05]" style={card}>
              {actionLog.map((l) => (
                <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:flex-nowrap">
                  <div className="w-32 shrink-0 whitespace-nowrap text-[11px]" style={dimmed}>
                    {new Date(l.created_at).toLocaleString()}
                  </div>
                  <div className="w-32 shrink-0 truncate text-[11px]" style={muted}>{l.admin_email}</div>
                  <div className="w-32 shrink-0">
                    <span className="rounded-full px-2 py-0.5 text-[9.5px] font-mono" style={{ background: "oklch(0.72 0.10 224 / 12%)", color: "oklch(0.72 0.10 224)" }}>
                      {l.action}
                    </span>
                  </div>
                  <div className="w-32 shrink-0 truncate text-[10.5px] font-mono" style={dimmed}>
                    {l.target_id ? l.target_id.slice(0, 8) + "…" : "—"}
                    {l.target_type && <span style={{ marginLeft: 4, color: "oklch(1 0 0 / 20%)" }}>({l.target_type})</span>}
                  </div>
                  <div className="min-w-[140px] flex-1 truncate text-[11px]" style={muted}>
                    {l.payload?.note as string || l.payload?.reason as string || "—"}
                  </div>
                </div>
              ))}
              {actionLog.length === 0 && (
                <div className="px-4 py-8 text-center text-[12px]" style={dimmed}>No admin actions yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
