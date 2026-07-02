// ─────────────────────────────────────────────────────────────────────────────
// instagram-sync edge function
//
// Re-fetches the creator's Instagram follower count using the stored
// long-lived access token and updates creator_profiles.
//
// Called when the creator clicks "Refresh Instagram Data" on the
// verification page.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = new Set([
  "https://usemrkt.app",
  "https://www.usemrkt.app",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://usemrkt.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // ── Authenticate ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json(req, { error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SVC);

    // ── Load stored token ──────────────────────────────────────────────────
    const { data: tokenRow } = await admin
      .from("creator_oauth_tokens")
      .select("access_token, ig_user_id, expires_at")
      .eq("user_id", user.id)
      .eq("provider", "instagram")
      .maybeSingle();

    if (!tokenRow?.access_token) {
      return json(req, { error: "not_connected", message: "Instagram is not connected. Please connect first." });
    }

    if (!tokenRow.ig_user_id) {
      return json(req, { error: "no_ig_user_id", message: "Instagram account ID missing. Please reconnect." });
    }

    // ── Fetch latest data via Instagram Login API ─────────────────────────
    const igRes = await fetch(
      `https://graph.instagram.com/me?` +
      `fields=id,username,followers_count,profile_picture_url,media_count` +
      `&access_token=${tokenRow.access_token}`
    );
    const ig = await igRes.json();

    if (ig.error) {
      if (ig.error.code === 190) {
        // Token expired — mark as disconnected so UI shows reconnect prompt
        await admin
          .from("creator_profiles")
          .update({ instagram_connected: false })
          .eq("user_id", user.id);
        return json(req, { error: "token_expired", message: "Instagram connection expired. Please reconnect." });
      }
      throw new Error(ig.error.message);
    }

    const syncedAt = new Date().toISOString();

    // ── Update creator_profiles ────────────────────────────────────────────
    await admin.from("creator_profiles").update({
      instagram_handle:               ig.username         ?? null,
      instagram_followers:            ig.followers_count  ?? null,
      instagram_followers_synced_at:  syncedAt,
      instagram_profile_picture_url:  ig.profile_picture_url ?? null,
    }).eq("user_id", user.id);

    return json(req, {
      success:   true,
      instagram: {
        username:            ig.username          ?? "",
        followers_count:     ig.followers_count   ?? 0,
        profile_picture_url: ig.profile_picture_url ?? null,
        media_count:         ig.media_count        ?? null,
        synced_at:           syncedAt,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(req, { error: "internal", message }, 500);
  }
});
