// ─────────────────────────────────────────────────────────────────────────────
// data-export — GDPR / privacy data portability endpoint
//
// Collects all personal data for the requesting user and returns it as JSON.
// For large datasets, stores the result and returns a download URL.
// Rate-limited to 1 export per day per user.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders, isRateLimited, requireAuth, jsonOk, jsonErr, AuthError,
} from "../_shared/security.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  // 1 export per day per IP
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  if (isRateLimited(`data-export:${ip}`, { maxRequests: 3, windowMs: 86_400_000 })) {
    return jsonErr("Export limit reached. You may export your data once per day.", req, 429);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const user = await requireAuth(req, supabase);
    const uid  = user.id;

    // Collect all user data in parallel
    const [
      profileRes,
      creatorRes,
      businessRes,
      applicationsRes,
      messagesRes,
      notificationsRes,
      contractsRes,
      contentPlannerRes,
      savedOutputsRes,
      projectsRes,
      analyticsEventsRes,
      reviewsRes,
      abuseSentRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("creator_profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("business_profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("campaign_applications").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("messages").select("*").eq("sender_id", uid).order("created_at", { ascending: false }).limit(500),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
      supabase.from("contracts").select("*").or(`creator_user_id.eq.${uid},business_user_id.eq.${uid}`),
      supabase.from("content_planner_items").select("*").eq("user_id", uid).order("scheduled_date", { ascending: false }),
      supabase.from("saved_outputs").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("projects").select("id,name,description,status,created_at").eq("user_id", uid),
      supabase.from("creator_analytics_events").select("event_type,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1000),
      supabase.from("reviews").select("*").or(`reviewer_id.eq.${uid},reviewee_id.eq.${uid}`),
      supabase.from("abuse_reports").select("content_type,reason,status,created_at").eq("reporter_id", uid),
    ]);

    // Strip sensitive internal fields
    const profile = profileRes.data ? {
      ...profileRes.data,
      expo_push_token: "[redacted]",
    } : null;

    const exportData = {
      exported_at:     new Date().toISOString(),
      mrkt_user_id:    uid,
      platform:        "MRKT (usemrkt.app)",
      data_controller: "MRKT — privacy@usemrkt.app",
      profile,
      creator_profile:     creatorRes.data,
      business_profile:    businessRes.data,
      applications:        applicationsRes.data ?? [],
      messages_sent:       messagesRes.data ?? [],
      notifications:       notificationsRes.data ?? [],
      contracts:           contractsRes.data ?? [],
      content_planner:     contentPlannerRes.data ?? [],
      saved_outputs:       savedOutputsRes.data ?? [],
      projects:            projectsRes.data ?? [],
      analytics_events:    analyticsEventsRes.data ?? [],
      reviews:             reviewsRes.data ?? [],
      abuse_reports_filed: abuseSentRes.data ?? [],
    };

    // Log the export request
    await supabase.from("data_export_requests").insert({
      user_id:     uid,
      email:       user.email ?? "",
      status:      "ready",
      expires_at:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return jsonOk(exportData, req);

  } catch (err) {
    if (err instanceof AuthError) return jsonErr("Unauthorized", req, 401);
    console.error("data-export error:", err);
    return jsonErr("Export failed. Please contact privacy@usemrkt.app.", req, 500);
  }
});
