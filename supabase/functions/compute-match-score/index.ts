import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// ── Types ──────────────────────────────────────────────────────────────────────

interface ScoreRequest {
  creator_id?: string;
  campaign_id: string;
  creator_ids?: string[];   // for batch mode
  force_refresh?: boolean;  // bypass cache
}

interface CreatorRow {
  user_id: string;
  niche: string[];
  platforms: string[];
  location: string | null;
  instagram_followers: number;
  instagram_handle: string | null;
  instagram_connected: boolean;
  follower_count: number;
  min_budget: number | null;
  max_budget: number | null;
  content_types: string[];
}

interface CampaignRow {
  id: string;
  user_id: string;
  title: string;
  niche: string[];
  platforms: string[];
  target_location: string | null;
  target_audience: string | null;
  budget_min: number | null;
  budget_max: number | null;
  content_type: string | null;
  requirements: string | null;
}

interface TrustRow {
  tier: string;
  score: number;
  avg_response_time_hours: number | null;
  total_campaigns: number;
  avg_rating: number;
  revision_rate: number;
}

// ── Score dimensions ──────────────────────────────────────────────────────────

function scorePlatform(creator: CreatorRow, campaign: CampaignRow): number {
  if (!campaign.platforms?.length) return 75;
  const matches = creator.platforms.filter(p =>
    campaign.platforms.some(cp => cp.toLowerCase() === p.toLowerCase())
  );
  if (matches.length === 0) return 0;
  if (matches.length >= campaign.platforms.length) return 100;
  return Math.round((matches.length / campaign.platforms.length) * 100);
}

function scoreNiche(creator: CreatorRow, campaign: CampaignRow): number {
  if (!campaign.niche?.length) return 70;
  const creatorNiches = creator.niche.map(n => n.toLowerCase());
  const campaignNiches = campaign.niche.map(n => n.toLowerCase());

  // Exact match
  const exact = creatorNiches.filter(n => campaignNiches.includes(n));
  if (exact.length > 0) return 100;

  // Partial / related match
  const related = creatorNiches.filter(n =>
    campaignNiches.some(cn => cn.includes(n) || n.includes(cn))
  );
  return related.length > 0 ? 65 : 20;
}

function scoreAudience(creator: CreatorRow, campaign: CampaignRow): number {
  // Prefer verified IG follower count over self-reported
  const followers = creator.instagram_connected && creator.instagram_followers > 0
    ? creator.instagram_followers
    : creator.follower_count;

  if (followers === 0) return 30;

  // Nano <10k, Micro 10k–100k, Mid 100k–500k, Macro 500k–1M, Mega >1M
  // Brands generally want micro–macro; we score based on real audience size
  if (followers >= 10_000 && followers <= 500_000) return 100;
  if (followers >= 1_000 && followers < 10_000) return 75;
  if (followers > 500_000 && followers <= 2_000_000) return 85;
  if (followers > 2_000_000) return 70;
  return 40; // very small
}

function scoreLocation(creator: CreatorRow, campaign: CampaignRow): number {
  if (!campaign.target_location) return 80;
  if (!creator.location) return 40;

  const cl = creator.location.toLowerCase();
  const tl = campaign.target_location.toLowerCase();

  if (cl === tl) return 100;

  // GCC region check
  const gcc = ["saudi arabia", "uae", "kuwait", "qatar", "bahrain", "oman", "ksa", "dubai", "abu dhabi", "riyadh"];
  const creatorInGcc = gcc.some(c => cl.includes(c));
  const campaignInGcc = gcc.some(c => tl.includes(c));
  if (creatorInGcc && campaignInGcc) return 85;

  // Partial overlap
  const clParts = cl.split(/[,\s]+/);
  const tlParts = tl.split(/[,\s]+/);
  const overlap = clParts.filter(p => p.length > 2 && tlParts.some(tp => tp.includes(p) || p.includes(tp)));
  if (overlap.length > 0) return 70;

  return 25;
}

function scoreRequirements(creator: CreatorRow, campaign: CampaignRow): number {
  let score = 70;

  // Budget check
  if (campaign.budget_min !== null && creator.min_budget !== null) {
    if (creator.min_budget > (campaign.budget_max ?? Infinity)) {
      score -= 40; // creator too expensive
    } else if (creator.min_budget <= campaign.budget_min) {
      score += 15; // fits perfectly
    }
  }

  // Content type match
  if (campaign.content_type && creator.content_types?.length > 0) {
    const match = creator.content_types.some(
      ct => ct.toLowerCase().includes(campaign.content_type!.toLowerCase())
    );
    score += match ? 15 : -10;
  }

  return Math.max(0, Math.min(100, score));
}

// ── Trust modifier ────────────────────────────────────────────────────────────

const TRUST_MODIFIERS: Record<string, number> = {
  elite: 8, trusted: 4, reliable: 3, rising: 2, new: 0,
};

// ── Main score computation ────────────────────────────────────────────────────

function computeScore(creator: CreatorRow, campaign: CampaignRow, trust: TrustRow | null) {
  const platform     = scorePlatform(creator, campaign);
  const niche        = scoreNiche(creator, campaign);
  const audience     = scoreAudience(creator, campaign);
  const location     = scoreLocation(creator, campaign);
  const requirements = scoreRequirements(creator, campaign);

  const weighted =
    platform     * 0.25 +
    niche        * 0.25 +
    audience     * 0.20 +
    location     * 0.15 +
    requirements * 0.15;

  const trustModifier = TRUST_MODIFIERS[trust?.tier ?? "new"] ?? 0;
  const score = Math.min(100, Math.round(weighted + trustModifier));

  const successProbability = Math.min(92, Math.max(8, Math.round(score * 0.76 + trustModifier + 8)));

  const strengths: string[] = [];
  const warnings: string[] = [];

  if (platform >= 80) strengths.push("Platform alignment");
  if (niche    >= 80) strengths.push("Niche fit");
  if (audience >= 80) strengths.push("Audience size");
  if (location >= 80) strengths.push("Location match");

  if (platform     < 50) warnings.push("Platform mismatch");
  if (niche        < 40) warnings.push("Niche gap");
  if (requirements < 40) warnings.push("Budget or requirements mismatch");

  const instagramVerified = creator.instagram_connected && creator.instagram_followers > 0;
  if (instagramVerified) strengths.push("Verified Instagram");

  const avgResponseTime = trust?.avg_response_time_hours ?? null;
  if (avgResponseTime !== null && avgResponseTime <= 6) strengths.push("Fast responder");
  if (avgResponseTime !== null && avgResponseTime > 48) warnings.push("Slow response time");

  return {
    score,
    success_probability: successProbability,
    explanation_json: {
      strengths,
      warnings,
      breakdown: { platform, niche, audience, location, requirements },
      trust_tier: trust?.tier ?? "new",
      trust_score: trust?.score ?? 0,
      instagram_verified: instagramVerified,
      total_campaigns: trust?.total_campaigns ?? 0,
      avg_rating: trust?.avg_rating ?? null,
      avg_response_time_hours: avgResponseTime,
    },
  };
}

// ── HTTP handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body: ScoreRequest = await req.json();
    const { campaign_id, force_refresh = false } = body;

    // Resolve creator IDs
    const creatorIds: string[] = body.creator_ids?.length
      ? body.creator_ids
      : body.creator_id
        ? [body.creator_id]
        : [];

    if (!campaign_id || creatorIds.length === 0) {
      return new Response(JSON.stringify({ error: "campaign_id and at least one creator_id required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch campaign once
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id, user_id, title, niche, platforms, target_location, target_audience, budget_min, budget_max, content_type, requirements")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown> = {};

    for (const creatorId of creatorIds) {
      // Check cache first (skip if force_refresh)
      if (!force_refresh) {
        const { data: cached } = await supabase
          .from("match_score_cache")
          .select("score, success_probability, explanation_json, expires_at")
          .eq("creator_id", creatorId)
          .eq("campaign_id", campaign_id)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (cached) {
          results[creatorId] = {
            score: cached.score,
            success_probability: cached.success_probability,
            explanation: cached.explanation_json,
            from_cache: true,
          };
          continue;
        }
      }

      // Fetch creator profile
      const { data: creatorProfile } = await supabase
        .from("creator_profiles")
        .select("user_id, niche, platforms, location, instagram_followers, instagram_handle, instagram_connected, follower_count, min_budget, max_budget, content_types")
        .eq("user_id", creatorId)
        .single();

      if (!creatorProfile) {
        results[creatorId] = { error: "Creator profile not found" };
        continue;
      }

      // Fetch trust score
      const { data: trust } = await supabase
        .from("creator_trust_scores")
        .select("tier, score, avg_response_time_hours, total_campaigns, avg_rating, revision_rate")
        .eq("user_id", creatorId)
        .single();

      const computed = computeScore(creatorProfile as CreatorRow, campaign as CampaignRow, trust as TrustRow | null);

      // Upsert cache
      await supabase.from("match_score_cache").upsert({
        creator_id: creatorId,
        campaign_id,
        business_id: campaign.user_id,
        score: computed.score,
        success_probability: computed.success_probability,
        explanation_json: computed.explanation_json,
        computed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "creator_id,campaign_id" });

      results[creatorId] = {
        score: computed.score,
        success_probability: computed.success_probability,
        explanation: computed.explanation_json,
        from_cache: false,
      };
    }

    // Single creator: return flat object for convenience
    if (creatorIds.length === 1) {
      return new Response(JSON.stringify(results[creatorIds[0]]), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("compute-match-score error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
