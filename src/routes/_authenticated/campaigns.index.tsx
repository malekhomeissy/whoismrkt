import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, Megaphone, Users, Eye, Edit } from "lucide-react";

export const Route = createFileRoute("/_authenticated/campaigns/")({
  component: CampaignsDashboard,
});

import { C } from "@/lib/theme";

type CampaignApplication = { id: string; status: string; created_at: string };

type Campaign = {
  id: string;
  title: string;
  status: string;
  is_published: boolean;
  business_industry: string | null;
  compensation_type: string;
  compensation_amount_fixed: number | null;
  compensation_budget_min: number | null;
  compensation_budget_max: number | null;
  required_platforms: string[];
  deadline: string | null;
  created_at: string;
  updated_at: string;
  campaign_applications: CampaignApplication[];
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: C.textMuted,             bg: "oklch(1 0 0 / 5%)"                  },
  active:    { label: "Active",    color: "oklch(0.62 0.12 158)",  bg: "oklch(0.72 0.18 152 / 14%)"         },
  paused:    { label: "Paused",    color: "oklch(0.70 0.08 68)",   bg: "oklch(0.78 0.14 76 / 12%)"          },
  closed:    { label: "Closed",    color: C.textMuted,             bg: "oklch(1 0 0 / 5%)"                  },
  completed: { label: "Completed", color: "oklch(0.62 0.12 158)",  bg: "oklch(0.72 0.18 152 / 14%)"         },
};

function formatBudget(c: Campaign): string {
  if (c.compensation_amount_fixed) return `$${c.compensation_amount_fixed.toLocaleString()}`;
  if (c.compensation_budget_min && c.compensation_budget_max) {
    return `$${c.compensation_budget_min.toLocaleString()} – $${c.compensation_budget_max.toLocaleString()}`;
  }
  return c.compensation_type === "gifted" ? "Gifted" : c.compensation_type.replace(/_/g, " ");
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em" }}>
      {cfg.label}
    </span>
  );
}

function CampaignCard({ campaign, navigate }: { campaign: Campaign; navigate: ReturnType<typeof useNavigate> }) {
  const apps          = campaign.campaign_applications;
  const totalApps     = apps.length;
  const pendingCount  = apps.filter(a => a.status === "pending").length;
  const acceptedCount = apps.filter(a => a.status === "accepted").length;

  const hasPending = pendingCount > 0;

  return (
    <div
      className="card-lift"
      style={{
        background: C.surface,
        border: `1px solid ${hasPending ? "oklch(1 0 0 / 25%)" : C.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <StatusBadge status={campaign.status} />
            {!campaign.is_published && campaign.status !== "draft" && (
              <span style={{ fontSize: 11, color: C.yellow, fontWeight: 500 }}>· Unpublished</span>
            )}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: 0, lineHeight: 1.3 }}>
            {campaign.title}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
            {campaign.business_industry && (
              <span style={{ fontSize: 12, color: C.textMuted }}>{campaign.business_industry}</span>
            )}
            <span style={{ fontSize: 12, color: "oklch(1 0 0 / 20%)" }}>·</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>{formatBudget(campaign)}</span>
            {campaign.required_platforms.length > 0 && (
              <>
                <span style={{ fontSize: 12, color: "oklch(1 0 0 / 20%)" }}>·</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  {campaign.required_platforms.slice(0, 2).join(", ")}
                  {campaign.required_platforms.length > 2 && ` +${campaign.required_platforms.length - 2}`}
                </span>
              </>
            )}
            {campaign.deadline && (
              <>
                <span style={{ fontSize: 12, color: "oklch(1 0 0 / 20%)" }}>·</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  Due {new Date(campaign.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Applicant stats */}
      <div style={{ display: "flex", gap: 24, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>{totalApps}</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 4 }}>Applicants</div>
        </div>
        {pendingCount > 0 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.yellow, lineHeight: 1 }}>{pendingCount}</div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 4 }}>Awaiting Review</div>
          </div>
        )}
        {acceptedCount > 0 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.green, lineHeight: 1 }}>{acceptedCount}</div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 4 }}>Accepted</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate({ to: `/campaigns/${campaign.id}/applicants` as "/" })}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: hasPending ? "oklch(1 0 0 / 12%)" : "oklch(1 0 0 / 6%)",
            border: `1px solid ${hasPending ? "oklch(1 0 0 / 28%)" : C.border}`,
            borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: hasPending ? C.accent : C.textSecondary,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Users style={{ width: 14, height: 14 }} />
          {hasPending ? `Review ${pendingCount} new` : `Applicants (${totalApps})`}
        </button>
        <button
          onClick={() => navigate({ to: `/campaigns/${campaign.id}/preview` as "/" })}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: C.textMuted,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Eye style={{ width: 14, height: 14 }} />
          Preview
        </button>
        <button
          onClick={() => navigate({ to: `/campaigns/${campaign.id}/edit` as "/" })}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: C.textMuted,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Edit style={{ width: 14, height: 14 }} />
          Edit
        </button>
      </div>
    </div>
  );
}

type FilterKey = "all" | "active" | "draft" | "closed";

function CampaignsDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterKey>("all");

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("campaigns")
      .select([
        "id", "title", "status", "is_published", "business_industry",
        "compensation_type", "compensation_amount_fixed",
        "compensation_budget_min", "compensation_budget_max",
        "required_platforms", "deadline", "created_at", "updated_at",
        "campaign_applications(id,status,created_at)",
      ].join(","))
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });
    setLoading(false);
    setCampaigns((data as unknown as Campaign[]) ?? []);
  }

  const filtered = campaigns.filter(c => {
    if (filter === "all")    return true;
    if (filter === "active") return c.status === "active";
    if (filter === "draft")  return c.status === "draft";
    if (filter === "closed") return c.status === "closed" || c.status === "completed";
    return true;
  });

  const totalApps    = campaigns.reduce((s, c) => s + c.campaign_applications.length, 0);
  const activeCount  = campaigns.filter(c => c.status === "active").length;
  const draftCount   = campaigns.filter(c => c.status === "draft").length;
  const closedCount  = campaigns.filter(c => c.status === "closed" || c.status === "completed").length;
  const pendingTotal = campaigns.reduce((s, c) => s + c.campaign_applications.filter(a => a.status === "pending").length, 0);

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all",    label: "All",     count: campaigns.length },
    { key: "active", label: "Active",  count: activeCount      },
    { key: "draft",  label: "Draft",   count: draftCount       },
    { key: "closed", label: "Closed",  count: closedCount      },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: C.bg }}>
    <div className="flex-1 overflow-y-auto min-h-0">
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 36px 100px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Campaigns</h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: "6px 0 0" }}>
              Manage your influencer campaigns and review applicants
            </p>
          </div>
          <Link
            to="/campaign-create"
            className="btn-primary"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 14,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            New Campaign
          </Link>
        </div>

        {/* Stats */}
        {campaigns.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Total Campaigns",  value: campaigns.length, color: C.textPrimary },
              { label: "Active",           value: activeCount,      color: C.green       },
              { label: "Total Applicants", value: totalApps,        color: C.textPrimary },
              ...(pendingTotal > 0 ? [{ label: "Needs Review", value: pendingTotal, color: C.yellow }] : []),
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "14px 20px",
                  minWidth: 120,
                  flex: "1 1 0",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 5 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        {campaigns.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  background: filter === f.key ? "oklch(1 0 0 / 10%)" : "transparent",
                  color:      filter === f.key ? C.textPrimary         : C.textMuted,
                  transition: "all 0.1s",
                }}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton" style={{ height: 20, width: "30%" }} />
                  <div className="skeleton" style={{ height: 16, width: "55%" }} />
                </div>
                <div style={{ display: "flex", gap: 24, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton" style={{ height: 24, width: 32 }} />
                    <div className="skeleton" style={{ height: 11, width: 64 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="skeleton" style={{ height: 34, width: 140, borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 34, width: 90, borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 34, width: 70, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 40px",
              background: C.surface,
              borderRadius: 16,
              border: `1px dashed ${C.border}`,
            }}
          >
            <Megaphone style={{ width: 40, height: 40, color: C.textMuted, margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
              No campaigns yet
            </h2>
            <p style={{ fontSize: 14, color: C.textMuted, maxWidth: 360, margin: "0 auto 24px" }}>
              Post your first campaign brief to start finding the right creators for your brand.
            </p>
            <Link
              to="/campaign-create"
              className="btn-primary"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px",
                borderRadius: 10,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Create Your First Campaign
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted, fontSize: 14 }}>
            No campaigns match this filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(c => (
              <CampaignCard key={c.id} campaign={c} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
