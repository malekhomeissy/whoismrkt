// ─────────────────────────────────────────────────────────────────────────────
// /k/[username] — Public Creator Media Kit
// No auth required. Professional creator profile for external sharing.
// Replaces PDF decks. Tracks views for creator analytics.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import {
  Globe2, Instagram, Youtube, Twitter, MapPin, Users, BarChart2,
  ExternalLink, Star, ShieldCheck, ArrowUpRight, Share2,
  CheckCircle2, Sparkles, Calendar, Mail, Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/k/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — MRKT Creator Media Kit` },
      { name: "description", content: `Professional creator media kit for @${params.username} on MRKT.` },
      { property: "og:title", content: `@${params.username} — Creator Media Kit` },
      { property: "og:type", content: "profile" },
    ],
  }),
  component: MediaKitPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorData {
  user_id:           string;
  display_name:      string;
  username:          string;
  bio:               string | null;
  avatar_url:        string | null;
  location:          string | null;
  location_city:     string | null;
  niche:             string | null;
  categories:        string[];
  platforms:         string[];
  follower_count:    number | null;
  engagement_rate:   number | null;
  audience_location: string | null;
  primary_language:  string | null;
  portfolio_urls:    string[] | null;
  media_kit_url:     string | null;
  is_verified:       boolean;
  is_beta_pioneer:   boolean;
  preferred_content_types: string[] | null;
  // From profiles
  trust_score?:      number | null;
  trust_tier?:       string | null;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const EYEBROW = "text-[9.5px] uppercase tracking-[0.34em] font-semibold";
const card    = { background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" };
const muted   = { color: "oklch(1 0 0 / 42%)" };
const dimmed  = { color: "oklch(1 0 0 / 26%)" };

function platformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return <Instagram className="h-3.5 w-3.5" />;
  if (p.includes("youtube"))   return <Youtube   className="h-3.5 w-3.5" />;
  if (p.includes("twitter") || p.includes("x.com")) return <Twitter className="h-3.5 w-3.5" />;
  if (p.includes("tiktok"))    return <span className="text-[11px] font-bold">Tk</span>;
  return <Globe2 className="h-3.5 w-3.5" />;
}

function fmtFollowers(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function TrustBadge({ tier, score }: { tier: string; score: number }) {
  const config: Record<string, { label: string; color: string; bg: string; border: string }> = {
    elite:   { label: "Elite",   color: "oklch(0.70 0.08 68)",  bg: "oklch(0.78 0.14 76 / 10%)", border: "oklch(0.78 0.14 76 / 28%)" },
    trusted: { label: "Trusted", color: "oklch(0.62 0.12 158)", bg: "oklch(0.72 0.18 152 / 10%)", border: "oklch(0.72 0.18 152 / 24%)" },
    rising:  { label: "Rising",  color: "oklch(0.72 0.10 224)", bg: "oklch(0.62 0.10 224 / 10%)", border: "oklch(0.62 0.10 224 / 22%)" },
    new:     { label: "New",     color: "oklch(1 0 0 / 45%)",   bg: "oklch(1 0 0 / 4%)",          border: "oklch(1 0 0 / 10%)" },
  };
  const c = config[tier] ?? config.new;
  return (
    <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <BarChart2 className="h-3 w-3" style={{ color: c.color }} />
      <span className="text-[11px] font-semibold" style={{ color: c.color }}>
        {c.label} · {score}/100
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MediaKitPage() {
  const { username } = Route.useParams();
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await (supabase as any)
        .from("creator_profiles")
        .select(`
          user_id, display_name, username, bio, avatar_url, location, location_city,
          niche, categories, platforms, follower_count, engagement_rate,
          audience_location, primary_language, portfolio_urls, media_kit_url,
          is_verified, is_beta_pioneer, preferred_content_types
        `)
        .eq("username", username)
        .maybeSingle();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      // Fetch trust score
      const { data: trust } = await (supabase as any)
        .from("creator_trust_scores")
        .select("score, tier")
        .eq("user_id", data.user_id)
        .maybeSingle();

      // Track media kit view
      await (supabase as any).from("media_kit_views").insert({ creator_id: data.user_id });

      setCreator({
        ...data,
        trust_score: trust?.score ?? null,
        trust_tier:  trust?.tier ?? "new",
      });
      setLoading(false);
    }
    load();
  }, [username]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="text-[13px]" style={muted}>This creator profile doesn't exist.</div>
          <Link to="/login" className="text-[12px] underline" style={dimmed}>Join MRKT</Link>
        </div>
      </div>
    );
  }

  const platforms    = creator.platforms ?? [];
  const categories   = creator.categories ?? [];
  const portfolio    = creator.portfolio_urls ?? [];
  const contentTypes = creator.preferred_content_types ?? [];
  const location     = creator.location_city || creator.location;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <section className="relative px-6 pt-36 pb-20 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -8%, oklch(0.13 0.02 224) 0%, oklch(0 0 0) 60%)" }}
        />
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">

            {/* Avatar */}
            <div className="shrink-0">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name}
                  className="h-24 w-24 rounded-2xl object-cover"
                  style={{ border: "2px solid oklch(1 0 0 / 10%)" }}
                />
              ) : (
                <div
                  className="h-24 w-24 rounded-2xl flex items-center justify-center text-[2.5rem] font-bold"
                  style={{ background: "oklch(0.72 0.10 224 / 18%)", color: "oklch(0.72 0.10 224)" }}
                >
                  {creator.display_name[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {creator.is_beta_pioneer && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{ background: "oklch(0.70 0.08 68 / 12%)", border: "1px solid oklch(0.70 0.08 68 / 28%)" }}
                    title="Pioneer Creator — one of MRKT's founding creators, hand-selected for quality and early commitment"
                  >
                    <Star className="h-3 w-3" style={{ color: "oklch(0.70 0.08 68)" }} />
                    <span className="text-[10.5px] font-semibold" style={{ color: "oklch(0.70 0.08 68)" }}>Pioneer</span>
                  </div>
                )}
                {creator.is_verified && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{ background: "oklch(0.62 0.12 158 / 12%)", border: "1px solid oklch(0.62 0.12 158 / 28%)" }}
                    title="Verified Creator — identity and platform presence verified by MRKT"
                  >
                    <ShieldCheck className="h-3 w-3" style={{ color: "oklch(0.62 0.12 158)" }} />
                    <span className="text-[10.5px] font-semibold" style={{ color: "oklch(0.62 0.12 158)" }}>Verified</span>
                  </div>
                )}
                {creator.trust_score !== null && creator.trust_tier && (
                  <TrustBadge tier={creator.trust_tier} score={creator.trust_score ?? 0} />
                )}
              </div>

              <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-[-0.045em] leading-[0.96] mb-2">
                {creator.display_name}
              </h1>
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-[13px]" style={muted}>@{creator.username}</span>
                {location && (
                  <>
                    <span style={dimmed}>·</span>
                    <MapPin className="h-3 w-3" style={muted} />
                    <span className="text-[13px]" style={muted}>{location}</span>
                  </>
                )}
                {creator.primary_language && (
                  <>
                    <span style={dimmed}>·</span>
                    <span className="text-[12px]" style={dimmed}>{creator.primary_language}</span>
                  </>
                )}
              </div>
              {creator.bio && (
                <p className="text-[1rem] leading-[1.75] font-light max-w-2xl" style={muted}>
                  {creator.bio}
                </p>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <Link
                  to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-7 h-11 text-[13px] font-semibold"
                >
                  <Mail className="h-4 w-4" />
                  Work with {creator.display_name.split(" ")[0]}
                </Link>
                <button
                  onClick={copyLink}
                  className="btn-ghost inline-flex items-center gap-2 rounded-full px-5 h-11 text-[13px]"
                >
                  <Share2 className="h-4 w-4" />
                  {copied ? "Copied!" : "Share Kit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ROW ══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-10 hairline-t">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Followers",       value: fmtFollowers(creator.follower_count) },
              { label: "Engagement Rate", value: creator.engagement_rate ? `${creator.engagement_rate.toFixed(1)}%` : "—" },
              { label: "Audience",        value: creator.audience_location || "MENA" },
              { label: "Content Type",    value: contentTypes[0] || creator.niche || "Creator" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-5 text-center" style={card}>
                <div className="font-display text-[1.75rem] font-bold tracking-tight mb-1" style={{ color: "oklch(1 0 0 / 88%)" }}>
                  {s.value}
                </div>
                <div className={EYEBROW} style={dimmed}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PLATFORMS ══════════════════════════════════════════════════════════ */}
      {platforms.length > 0 && (
        <section className="px-6 py-10 hairline-t">
          <div className="mx-auto max-w-4xl">
            <div className={`${EYEBROW} mb-6`} style={dimmed}>Platforms</div>
            <div className="flex flex-wrap gap-2">
              {platforms.map(p => (
                <div
                  key={p}
                  className="flex items-center gap-2 rounded-full px-4 py-2"
                  style={card}
                >
                  <span style={muted}>{platformIcon(p)}</span>
                  <span className="text-[12.5px] font-medium" style={{ color: "oklch(1 0 0 / 70%)" }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ NICHES & CATEGORIES ════════════════════════════════════════════════ */}
      {(creator.niche || categories.length > 0) && (
        <section className="px-6 py-10 hairline-t">
          <div className="mx-auto max-w-4xl">
            <div className={`${EYEBROW} mb-6`} style={dimmed}>Content Niche</div>
            <div className="flex flex-wrap gap-2">
              {creator.niche && (
                <div className="rounded-full px-4 py-2" style={{ background: "oklch(0.72 0.10 224 / 10%)", border: "1px solid oklch(0.72 0.10 224 / 22%)", color: "oklch(0.72 0.10 224)" }}>
                  <span className="text-[12.5px] font-semibold">{creator.niche}</span>
                </div>
              )}
              {categories.map(c => (
                <div key={c} className="rounded-full px-4 py-2" style={card}>
                  <span className="text-[12.5px]" style={muted}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ PORTFOLIO ══════════════════════════════════════════════════════════ */}
      {portfolio.length > 0 && (
        <section className="px-6 py-10 hairline-t">
          <div className="mx-auto max-w-4xl">
            <div className={`${EYEBROW} mb-6`} style={dimmed}>Portfolio</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {portfolio.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl overflow-hidden flex items-center justify-center aspect-video transition-all"
                  style={{ ...card, position: "relative" }}
                >
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center">
                    {url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2" style={muted}>
                        <Briefcase className="h-6 w-6" />
                        <span className="text-[11px]">Portfolio {i + 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl" style={{ background: "oklch(0 0 0 / 50%)" }}>
                    <ExternalLink className="h-5 w-5" style={{ color: "oklch(1 0 0 / 80%)" }} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══ TRUST & VERIFICATION ═══════════════════════════════════════════════ */}
      <section className="px-6 py-10 hairline-t">
        <div className="mx-auto max-w-4xl">
          <div className={`${EYEBROW} mb-6`} style={dimmed}>Trust & Verification</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {creator.is_verified && (
              <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "oklch(0.62 0.12 158 / 6%)", border: "1px solid oklch(0.62 0.12 158 / 18%)" }}>
                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "oklch(0.62 0.12 158)" }} />
                <div>
                  <div className="text-[12.5px] font-semibold mb-1" style={{ color: "oklch(0.62 0.12 158)" }}>MRKT Verified</div>
                  <div className="text-[11px] leading-relaxed" style={dimmed}>Identity and platform presence verified by the MRKT team.</div>
                </div>
              </div>
            )}
            {creator.is_beta_pioneer && (
              <div className="rounded-2xl p-5 flex items-start gap-3" style={{ background: "oklch(0.70 0.08 68 / 6%)", border: "1px solid oklch(0.70 0.08 68 / 18%)" }}>
                <Star className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "oklch(0.70 0.08 68)" }} />
                <div>
                  <div className="text-[12.5px] font-semibold mb-1" style={{ color: "oklch(0.70 0.08 68)" }}>Pioneer Creator</div>
                  <div className="text-[11px] leading-relaxed" style={dimmed}>One of MRKT's founding creators. Hand-selected for quality, commitment, and community.</div>
                </div>
              </div>
            )}
            {creator.trust_score !== null && (
              <div className="rounded-2xl p-5 flex items-start gap-3" style={card}>
                <BarChart2 className="h-5 w-5 shrink-0 mt-0.5" style={muted} />
                <div>
                  <div className="text-[12.5px] font-semibold mb-1" style={{ color: "oklch(1 0 0 / 75%)" }}>
                    Trust Score {creator.trust_score}/100
                  </div>
                  <div className="text-[11px] leading-relaxed" style={dimmed}>
                    Based on campaign completion, brand ratings, and response quality.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ WORK WITH CTA ══════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <div className={`${EYEBROW} mb-6`} style={dimmed}>Start a collaboration</div>
          <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-[-0.045em] leading-[0.96] mb-6">
            Ready to work with
            <br />
            <span style={{ color: "oklch(1 0 0 / 35%)" }}>{creator.display_name}?</span>
          </h2>
          <p className="text-[1rem] leading-relaxed mb-8" style={muted}>
            Reach out through MRKT to discuss campaigns, rates, and availability. Contracts, deliverables, and payments — all in one place.
          </p>
          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-semibold"
          >
            Connect on MRKT <ArrowUpRight className="h-5 w-5" />
          </Link>
          <div className="mt-6 text-[12px]" style={dimmed}>
            Powered by <span style={{ color: "oklch(1 0 0 / 50%)" }}>MRKT</span> — the creator collaboration OS for MENA
          </div>
        </div>
      </section>
    </div>
  );
}
