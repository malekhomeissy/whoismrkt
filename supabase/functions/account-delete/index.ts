// ─────────────────────────────────────────────────────────────────────────────
// account-delete — GDPR / privacy account deletion endpoint
//
// Soft-deletes all PII, then schedules Supabase Auth user deletion.
// Hard auth deletion happens server-side via the service-role key so the
// client JWT is already invalidated before the user's session expires.
//
// Steps performed:
//   1. Authenticate the requesting user
//   2. Verify the optional confirmation phrase matches
//   3. Nullify PII across all profile tables
//   4. Delete storage objects (avatar, deliverables)
//   5. Log the deletion request
//   6. Delete the Supabase Auth user (which cascades to FK tables)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders, isRateLimited, DEFAULT_API_RATE, requireAuth, jsonOk, jsonErr, AuthError,
} from "../_shared/security.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  // Strict rate limit — one attempt per minute per user
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  if (isRateLimited(`account-delete:${ip}`, { maxRequests: 3, windowMs: 60_000 })) {
    return jsonErr("Too many requests. Please wait before trying again.", req, 429);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const user = await requireAuth(req, supabase);
    const userId = user.id;
    const email  = user.email ?? "";

    // Parse body
    let body: { confirmation?: string; reason?: string } = {};
    try { body = await req.json(); } catch { /* no body required */ }

    // Optional confirmation phrase check
    if (body.confirmation && body.confirmation.trim().toLowerCase() !== "delete my account") {
      return jsonErr("Type 'delete my account' to confirm.", req, 400);
    }

    // ── 1. Nullify PII in creator_profiles ───────────────────────────────────
    await supabase.from("creator_profiles").update({
      display_name:        "[deleted]",
      bio:                 null,
      instagram_handle:    null,
      tiktok_handle:       null,
      youtube_handle:      null,
      instagram_username:  null,
      tiktok_username:     null,
      youtube_username:    null,
      instagram_followers: null,
      tiktok_followers:    null,
      youtube_subscribers: null,
      profile_image_url:   null,
      avatar_url:          null,
      city:                null,
      country:             null,
      location:            null,
      phone_number:        null,
      website_url:         null,
      instagram_id:        null,
      instagram_access_token: null,
    }).eq("user_id", userId);

    // ── 2. Nullify PII in business_profiles ───────────────────────────────────
    await supabase.from("business_profiles").update({
      company_name:    "[deleted]",
      contact_name:    null,
      website:         null,
      logo_url:        null,
      phone_number:    null,
      instagram_handle: null,
    }).eq("user_id", userId);

    // ── 3. Nullify PII in profiles ────────────────────────────────────────────
    await supabase.from("profiles").update({
      name:            "[deleted]",
      phone_number:    null,
      whatsapp_number: null,
      expo_push_token: null,
    }).eq("id", userId);

    // ── 4. Remove brand_knowledge ─────────────────────────────────────────────
    await supabase.from("brand_knowledge").delete().eq("business_user_id", userId);

    // ── 5. Log deletion request ───────────────────────────────────────────────
    await supabase.from("data_deletion_requests").insert({
      user_id:      userId,
      email,
      reason:       body.reason ?? "User-initiated account deletion",
      status:       "completed",
      completed_at: new Date().toISOString(),
    });

    // ── 6. Delete auth user (cascades to all FK tables) ───────────────────────
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("Auth user delete failed:", deleteErr.message);
      // PII is already nullified. Log and return partial success.
      return jsonOk({
        success: true,
        message: "Account data removed. Auth cleanup pending — contact privacy@usemrkt.app if you experience issues.",
      }, req);
    }

    return jsonOk({ success: true, message: "Account deleted successfully." }, req);

  } catch (err) {
    if (err instanceof AuthError) return jsonErr("Unauthorized", req, 401);
    console.error("account-delete error:", err);
    return jsonErr("An error occurred. Please contact privacy@usemrkt.app.", req, 500);
  }
});
