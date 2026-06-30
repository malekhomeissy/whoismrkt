import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


/**
 * compute-visibility-scores
 *
 * Computes and stores visibility scores for all creators (or a specific one).
 *
 * Supports:
 *   GET  /compute-visibility-scores             → all creators
 *   POST /compute-visibility-scores             → { user_id: "uuid" } for single creator
 *
 * Formula:
 *   profile_completeness (30%) — filled fields on creator_profiles
 *   activity_score       (25%) — recent views + applications + saves
 *   response_score       (20%) — avg response time from trust scores
 *   instagram_verified   (15%) — bonus for connected IG
 *   trust_score          (10%) — normalized trust score
 *
 * weekly_change = current_score - score from 7 days ago (stored in previous_score)
 *
 * Schedule: "0 3 * * *"  (3 AM UTC daily, after compute-daily-metrics)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let targetUserId: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      targetUserId = body.user_id ?? null;
    }

    // Get creator list
    let creatorIds: string[];
    if (targetUserId) {
      creatorIds = [targetUserId];
    } else {
      const { data: rows } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .not("user_id", "is", null);
      creatorIds = (rows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
    }

    let updated = 0;

    for (const userId of creatorIds) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data in parallel
      const [
        creatorRes,
        trustRes,
        existingRes,
        viewsRes,
        savesRes,
        appearancesRes,
        appsRes,
      ] = await Promise.all([
        supabase
          .from("creator_profiles")
          .select(
            "display_name,bio,niche,platforms,categories,instagram_connected," +
            "instagram_followers,follower_count,location,profile_image_url," +
            "portfolio_url,content_types,min_budget"
          )
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("creator_trust_scores")
          .select("score,tier,avg_response_time_hours")
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("creator_visibility_scores")
          .select("score")
          .eq("user_id", userId)
          .maybeSingle(),

        // Profile views last 30 days
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "creator_profile_viewed")
          .eq("creator_id", userId)
          .gte("created_at", thirtyDaysAgo),

        // Saves last 30 days
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "creator_saved")
          .eq("creator_id", userId)
          .gte("created_at", thirtyDaysAgo),

        // Match appearances last 30 days
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "creator_appeared_in_match")
          .eq("creator_id", userId)
          .gte("created_at", thirtyDaysAgo),

        // Applications last 30 days
        supabase
          .from("campaign_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo),
      ]);

      const cp = creatorRes.data as Record<string, unknown> | null;
      const trust = trustRes.data as { score: number; tier: string; avg_response_time_hours: number | null } | null;
      const existing = existingRes.data as { score: number } | null;

      const views       = (viewsRes.count        as number) ?? 0;
      const saves       = (savesRes.count         as number) ?? 0;
      const appearances = (appearancesRes.count   as number) ?? 0;
      const appCount    = (appsRes.count          as number) ?? 0;

      // ── 1. Profile completeness (0–100) ───────────────────────────────────
      if (!cp) continue;

      const fields = [
        cp.display_name,
        cp.bio,
        cp.niche,
        Array.isArray(cp.platforms) && (cp.platforms as string[]).length > 0,
        Array.isArray(cp.categories) && (cp.categories as string[]).length > 0,
        cp.location,
        cp.profile_image_url,
        cp.portfolio_url,
        Array.isArray(cp.content_types) && (cp.content_types as string[]).length > 0,
        cp.min_budget != null,
      ];
      const filledFields   = fields.filter(Boolean).length;
      const profileScore   = Math.round((filledFields / fields.length) * 100);

      // ── 2. Activity score (0–100) — recent engagement signals ─────────────
      // Logarithmic scale: diminishing returns after first ~20 events
      const activityRaw =
        Math.min(views * 2, 40)       // up to 40 pts from views
        + Math.min(saves * 5, 30)     // up to 30 pts from saves
        + Math.min(appearances * 1, 20) // up to 20 pts from match appearances
        + Math.min(appCount * 3, 10); // up to 10 pts from applying
      const activityScore = Math.min(100, activityRaw);

      // ── 3. Response score (0–100) ─────────────────────────────────────────
      let responseScore = 50; // default: unknown
      if (trust?.avg_response_time_hours != null) {
        const h = trust.avg_response_time_hours;
        if      (h <= 2)  responseScore = 100;
        else if (h <= 6)  responseScore = 85;
        else if (h <= 12) responseScore = 70;
        else if (h <= 24) responseScore = 55;
        else if (h <= 48) responseScore = 35;
        else              responseScore = 15;
      }

      // ── 4. Instagram verified bonus (0 or 100) ────────────────────────────
      const instagramVerified = !!(cp.instagram_connected && (cp.instagram_followers as number) > 0);
      const instagramScore    = instagramVerified ? 100 : 0;

      // ── 5. Trust score (0–100) ────────────────────────────────────────────
      const trustScore = trust?.score ?? 0;

      // ── Weighted composite ────────────────────────────────────────────────
      const rawScore =
        profileScore   * 0.30 +
        activityScore  * 0.25 +
        responseScore  * 0.20 +
        instagramScore * 0.15 +
        trustScore     * 0.10;

      const finalScore   = Math.min(100, Math.max(0, Math.round(rawScore)));
      const previousScore = existing?.score ?? 0;
      const weeklyChange  = finalScore - previousScore;

      await supabase
        .from("creator_visibility_scores")
        .upsert({
          user_id:              userId,
          score:                finalScore,
          previous_score:       previousScore,
          weekly_change:        weeklyChange,
          profile_completeness: profileScore,
          activity_score:       activityScore,
          response_score:       responseScore,
          instagram_verified:   instagramVerified,
          recent_views:         Math.min(views,       9999),
          recent_saves:         Math.min(saves,       9999),
          recent_appearances:   Math.min(appearances, 9999),
          last_calculated_at:   now.toISOString(),
        }, { onConflict: "user_id" });

      updated++;
    }

    return new Response(JSON.stringify({ ok: true, updated, total: creatorIds.length }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("compute-visibility-scores error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
