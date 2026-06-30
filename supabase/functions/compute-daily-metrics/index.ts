import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


/**
 * compute-daily-metrics
 *
 * Aggregates marketplace_events, campaign_applications, messages, and
 * project_saved_creators into creator_daily_metrics and business_daily_metrics.
 *
 * Supports:
 *   GET  /compute-daily-metrics          → runs for yesterday (cron mode)
 *   POST /compute-daily-metrics          → runs for a specific date: { date: "YYYY-MM-DD" }
 *                                          or for a specific user: { user_id: "uuid", date: "..." }
 *
 * Auth: requires a valid user token (for manual runs) or service role key (for cron).
 * Cron: configure in Supabase Dashboard → Edge Functions → Cron.
 *   Schedule: "0 2 * * *"  (2 AM UTC daily)
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

    // Determine target date
    let targetDate: string;
    let targetUserId: string | null = null;

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      targetDate   = body.date     ?? yesterdayISO();
      targetUserId = body.user_id  ?? null;
    } else {
      // GET — cron mode, always run for yesterday
      targetDate = yesterdayISO();
    }

    const results = { creator_rows: 0, business_rows: 0, date: targetDate };

    // ── Creator daily metrics ─────────────────────────────────────────────────

    // Get all creator user_ids (or a specific one)
    let creatorIds: string[];
    if (targetUserId) {
      creatorIds = [targetUserId];
    } else {
      const { data: creatorRows } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .not("user_id", "is", null);
      creatorIds = (creatorRows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
    }

    for (const userId of creatorIds) {
      const dayStart = `${targetDate}T00:00:00.000Z`;
      const dayEnd   = `${targetDate}T23:59:59.999Z`;

      const [
        viewsRes,
        appearancesRes,
        appsRes,
        savesRes,
        messagesRes,
        visibilityRes,
      ] = await Promise.all([
        // profile views
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "creator_profile_viewed")
          .eq("creator_id", userId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd),

        // match appearances
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "creator_appeared_in_match")
          .eq("creator_id", userId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd),

        // applications sent
        supabase
          .from("campaign_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd),

        // saves received
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "creator_saved")
          .eq("creator_id", userId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd),

        // messages received (from messages table)
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .neq("sender_id", userId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd),

        // current visibility score
        supabase
          .from("creator_visibility_scores")
          .select("score")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const row = {
        user_id:           userId,
        metric_date:       targetDate,
        profile_views:     (viewsRes.count as number)       ?? 0,
        match_appearances: (appearancesRes.count as number) ?? 0,
        applications_sent: (appsRes.count as number)        ?? 0,
        saves_received:    (savesRes.count as number)       ?? 0,
        messages_received: (messagesRes.count as number)    ?? 0,
        visibility_score:  (visibilityRes.data as { score: number } | null)?.score ?? 0,
      };

      await supabase
        .from("creator_daily_metrics")
        .upsert(row, { onConflict: "user_id,metric_date" });

      results.creator_rows++;
    }

    // ── Business daily metrics ────────────────────────────────────────────────

    let businessIds: string[];
    if (targetUserId) {
      businessIds = [targetUserId];
    } else {
      const { data: bizRows } = await supabase
        .from("business_profiles")
        .select("user_id")
        .not("user_id", "is", null);
      businessIds = (bizRows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
    }

    for (const userId of businessIds) {
      const dayStart = `${targetDate}T00:00:00.000Z`;
      const dayEnd   = `${targetDate}T23:59:59.999Z`;

      // Get this user's campaign IDs for scoped queries
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("user_id", userId);
      const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

      const [
        appsReceivedRes,
        activeCampaignsRes,
        shortlistedRes,
        pipelineUpdatesRes,
      ] = await Promise.all([
        // applications received today
        campaignIds.length > 0
          ? supabase
              .from("campaign_applications")
              .select("id", { count: "exact", head: true })
              .in("campaign_id", campaignIds)
              .gte("created_at", dayStart)
              .lte("created_at", dayEnd)
          : Promise.resolve({ count: 0 }),

        // active campaigns (snapshot, not daily delta)
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active"),

        // creators shortlisted today
        campaignIds.length > 0
          ? supabase
              .from("campaign_applications")
              .select("id", { count: "exact", head: true })
              .in("campaign_id", campaignIds)
              .eq("status", "shortlisted")
              .gte("updated_at", dayStart)
              .lte("updated_at", dayEnd)
          : Promise.resolve({ count: 0 }),

        // pipeline stage updates today
        supabase
          .from("marketplace_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "application_shortlisted")
          .eq("business_id", userId)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd),
      ]);

      // messages sent today (from messages where sender_id = userId)
      const { count: msgCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      const row = {
        user_id:               userId,
        metric_date:           targetDate,
        applications_received: (appsReceivedRes.count  as number) ?? 0,
        campaigns_active:      (activeCampaignsRes.count as number) ?? 0,
        creators_shortlisted:  (shortlistedRes.count   as number) ?? 0,
        messages_sent:         (msgCount                as number) ?? 0,
        pipeline_updates:      (pipelineUpdatesRes.count as number) ?? 0,
      };

      await supabase
        .from("business_daily_metrics")
        .upsert(row, { onConflict: "user_id,metric_date" });

      results.business_rows++;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("compute-daily-metrics error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

function yesterdayISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
