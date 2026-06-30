// ─────────────────────────────────────────────────────────────────────────────
// /businesses/$businessId — Public business profile
// Visible to creators considering applying to campaigns.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import {
  Building2, Globe, Users, MapPin, Briefcase,
  ArrowLeft, CheckCircle2, ExternalLink, Megaphone,
} from "lucide-react";
import { C } from "@/lib/theme";

export const Route = createFileRoute("/businesses/$businessId")({
  head: () => ({ meta: [{ title: "Business Profile — MRKT" }] }),
  component: BusinessProfilePage,
});

interface BusinessProfile {
  id:               string;
  user_id:          string;
  company_name:     string;
  industry:         string | null;
  company_size:     string | null;
  website:          string | null;
  location:         string | null;
  description:      string | null;
  logo_url:         string | null;
  is_verified:      boolean;
  campaign_count:   number;
  active_campaigns: number;
  created_at:       string;
}

interface PublicCampaign {
  id:          string;
  title:       string;
  description: string | null;
  status:      string;
  created_at:  string;
  budget_min:  number | null;
  budget_max:  number | null;
}

const AVATAR_COLORS = [
  "oklch(0.68 0.12 25)",  "oklch(0.66 0.09 250)",
  "oklch(0.64 0.11 160)", "oklch(0.70 0.10 300)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function BusinessProfilePage() {
  const { businessId } = Route.useParams();
  const [profile,   setProfile]   = useState<BusinessProfile | null>(null);
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any).rpc("get_business_public_profile", {
          p_business_id: businessId,
        });
        if (error || data?.error) { setNotFound(true); return; }
        setProfile(data as BusinessProfile);

        // Load public active campaigns
        const { data: camps } = await (supabase as any)
          .from("campaigns")
          .select("id, title, description, status, created_at, budget_min, budget_max")
          .eq("user_id", businessId)
          .in("status", ["active"])
          .order("created_at", { ascending: false })
          .limit(6);
        setCampaigns(camps ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: C.canvas }}>
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="h-24 w-24 rounded-3xl animate-pulse mb-6" style={{ background: "oklch(1 0 0 / 6%)" }} />
          <div className="h-7 w-56 rounded-lg animate-pulse mb-3" style={{ background: "oklch(1 0 0 / 6%)" }} />
          <div className="h-4 w-80 rounded-lg animate-pulse" style={{ background: "oklch(1 0 0 / 4%)" }} />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen" style={{ background: C.canvas }}>
        <Nav />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <Building2 className="h-10 w-10 mx-auto mb-4" style={{ color: C.faint }} />
          <h1 className="text-[20px] font-bold mb-2" style={{ color: C.text }}>Business not found</h1>
          <p className="text-[14px] mb-8" style={{ color: C.muted }}>This business profile may have been removed.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-[13px]" style={{ color: C.chrome }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = profile.company_name.slice(0, 2).toUpperCase();
  const bg       = avatarBg(profile.company_name);

  return (
    <div className="min-h-screen" style={{ background: C.canvas }}>
      <Nav />

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">

        {/* Back */}
        <Link
          to="/for-creators"
          className="inline-flex items-center gap-1.5 text-[12px] mb-8 transition-colors"
          style={{ color: C.faint }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.muted; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.faint; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Find Campaigns
        </Link>

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-8">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.company_name}
              className="h-20 w-20 rounded-2xl object-cover shrink-0"
              style={{ border: `1px solid ${C.border}` }}
            />
          ) : (
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-[22px] font-bold shrink-0"
              style={{ background: bg, color: "oklch(0.98 0 0)" }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] md:text-[26px] font-bold leading-tight" style={{ color: C.text }}>
                {profile.company_name}
              </h1>
              {profile.is_verified && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold shrink-0"
                  style={{ background: "oklch(0.62 0.10 224 / 12%)", color: "oklch(0.62 0.10 224)", border: "1px solid oklch(0.62 0.10 224 / 26%)" }}
                >
                  <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2">
              {profile.industry && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                  <Briefcase className="h-3 w-3" /> {profile.industry}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                  <MapPin className="h-3 w-3" /> {profile.location}
                </span>
              )}
              {profile.company_size && (
                <span className="flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
                  <Users className="h-3 w-3" /> {profile.company_size}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] transition-colors"
                  style={{ color: C.chrome }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(0.90 0.005 0)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.chrome; }}
                >
                  <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {[
            { label: "Active Campaigns",  value: String(profile.active_campaigns) },
            { label: "Total Campaigns",   value: String(profile.campaign_count)   },
            { label: "On MRKT Since",     value: new Date(profile.created_at).getFullYear().toString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl px-4 py-4 text-center"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <p className="text-[20px] font-bold" style={{ color: C.text }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {profile.description && (
          <div className="rounded-2xl px-5 py-4 mb-8" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: C.faint }}>About</p>
            <p className="text-[13.5px] leading-relaxed" style={{ color: C.textSub }}>{profile.description}</p>
          </div>
        )}

        {/* Active campaigns */}
        {campaigns.length > 0 && (
          <div>
            <h2 className="text-[14px] font-semibold mb-3" style={{ color: C.text }}>
              Active Campaigns
            </h2>
            <div className="space-y-3">
              {campaigns.map((camp) => (
                <Link
                  key={camp.id}
                  to="/campaigns/$campaignId"
                  params={{ campaignId: camp.id }}
                  className="flex items-start gap-3 rounded-2xl px-4 py-4 transition-all group"
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "oklch(1 0 0 / 18%)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}
                  >
                    <Megaphone className="h-3.5 w-3.5" style={{ color: C.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: C.text }}>{camp.title}</p>
                    {camp.description && (
                      <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: C.muted }}>
                        {camp.description}
                      </p>
                    )}
                    {(camp.budget_min != null || camp.budget_max != null) && (
                      <p className="text-[11.5px] mt-1.5 font-medium" style={{ color: C.chrome }}>
                        {camp.budget_min != null && camp.budget_max != null
                          ? `$${camp.budget_min.toLocaleString()} – $${camp.budget_max.toLocaleString()}`
                          : camp.budget_min != null
                            ? `From $${camp.budget_min.toLocaleString()}`
                            : `Up to $${camp.budget_max!.toLocaleString()}`
                        }
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-1 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: C.faint }} />
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
