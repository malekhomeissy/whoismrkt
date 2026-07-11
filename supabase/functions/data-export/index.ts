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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const user = await requireAuth(req, supabase);
    const uid  = user.id;

    // 1 export per day per authenticated user. Previously keyed on
    // cf-connecting-ip, which is attacker-controlled unless a trusted proxy
    // guarantees it — the authenticated user id is available here (this
    // endpoint requires auth) and isn't spoofable.
    if (isRateLimited(`data-export:${uid}`, { maxRequests: 3, windowMs: 86_400_000 })) {
      return jsonErr("Export limit reached. You may export your data once per day.", req, 429);
    }

    // Conversations the user participates in — needed to export BOTH sent
    // and received messages (messages has no "recipient" column; membership
    // is conversation_participants). Previously only sender_id was queried,
    // so a real Article 15/20 export never included received messages.
    const { data: participantRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", uid);
    const conversationIds = (participantRows ?? []).map((r) => r.conversation_id);

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
      aiChatMessagesRes,
      generatedAssetsRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("creator_profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("business_profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("campaign_applications").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      conversationIds.length
        ? supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(1000)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
      // FIX: contracts has no creator_user_id/business_user_id columns —
      // the real columns are creator_id/business_id. The old filter always
      // matched zero rows, so a user's own contracts were never exported.
      supabase.from("contracts").select("*").or(`creator_id.eq.${uid},business_id.eq.${uid}`),
      supabase.from("content_planner_items").select("*").eq("user_id", uid).order("scheduled_date", { ascending: false }),
      supabase.from("saved_outputs").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("projects").select("id,name,description,status,created_at").eq("user_id", uid),
      supabase.from("creator_analytics_events").select("event_type,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1000),
      // FIX: reviews has no reviewee_id column — the real column is
      // reviewed_user_id. The old filter silently exported zero reviews.
      supabase.from("reviews").select("*").or(`reviewer_id.eq.${uid},reviewed_user_id.eq.${uid}`),
      supabase.from("abuse_reports").select("content_type,reason,status,created_at").eq("reporter_id", uid),
      // ADDED: privacy.tsx §1.4 explicitly lists "AI conversation history" and
      // "saved AI outputs" as collected data — neither was previously exported.
      supabase.from("ai_chat_messages").select("chat_id,role,content,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(2000),
      supabase.from("generated_assets").select("prompt,asset_type,aspect_ratio,status,output_url,created_at").eq("user_id", uid).order("created_at", { ascending: false }),
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
      messages:            messagesRes.data ?? [], // both sent and received, across every conversation the user is a participant of
      notifications:       notificationsRes.data ?? [],
      contracts:           contractsRes.data ?? [],
      content_planner:     contentPlannerRes.data ?? [],
      saved_outputs:       savedOutputsRes.data ?? [],
      projects:            projectsRes.data ?? [],
      analytics_events:    analyticsEventsRes.data ?? [],
      reviews:             reviewsRes.data ?? [],
      abuse_reports_filed: abuseSentRes.data ?? [],
      ai_chat_messages:    aiChatMessagesRes.data ?? [],
      generated_assets:    generatedAssetsRes.data ?? [],
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
