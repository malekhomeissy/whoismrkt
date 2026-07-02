// ─────────────────────────────────────────────────────────────────────────────
// instagram-connect edge function
//
// Uses Instagram Login API (direct Instagram OAuth — no Facebook Page required).
// Works with Instagram Business and Creator accounts.
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

  const META_APP_ID     = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON   = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!META_APP_ID || !META_APP_SECRET) {
    return json(req, { error: "meta_not_configured", message: "META_APP_ID and META_APP_SECRET not set." }, 500);
  }

  try {
    // ── Authenticate the calling user ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json(req, { error: "unauthorized" }, 401);

    // ── Parse body ─────────────────────────────────────────────────────────
    const { code, redirect_uri } = await req.json() as { code: string; redirect_uri: string };
    if (!code || !redirect_uri) return json(req, { error: "missing_params", message: "code and redirect_uri are required" }, 400);

    // ── Step 1: Exchange code → short-lived token (Instagram Login API) ────
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     META_APP_ID,
        client_secret: META_APP_SECRET,
        grant_type:    "authorization_code",
        redirect_uri,
        code,
      }),
    });
    const shortData = await shortRes.json();
    if (shortData.error_type || shortData.error) {
      const msg = shortData.error_message ?? shortData.error?.message ?? "Token exchange failed";
      return json(req, { error: "oauth_failed", message: msg });
    }
    const shortLivedToken: string = shortData.access_token;

    // ── Step 2: Exchange short-lived → long-lived (~60 days) ──────────────
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}` +
      `&access_token=${shortLivedToken}`
    );
    const longData = await longRes.json();
    if (longData.error) {
      return json(req, { error: "token_exchange_failed", message: longData.error.message });
    }
    const longLivedToken: string = longData.access_token ?? shortLivedToken;
    const expiresIn: number      = longData.expires_in   ?? 5_183_944; // ~60 days

    // ── Step 3: Fetch Instagram account data ──────────────────────────────
    const igRes = await fetch(
      `https://graph.instagram.com/me?` +
      `fields=id,username,followers_count,profile_picture_url,media_count,account_type` +
      `&access_token=${longLivedToken}`
    );
    const ig = await igRes.json();
    if (ig.error) {
      return json(req, { error: "ig_fetch_failed", message: ig.error.message });
    }

    const admin     = createClient(SUPABASE_URL, SUPABASE_SVC);
    const expiresAt = new Date(Date.now() + expiresIn * 1_000).toISOString();
    const syncedAt  = new Date().toISOString();

    // ── Step 4: Store token ────────────────────────────────────────────────
    await admin.from("creator_oauth_tokens").upsert({
      user_id:      user.id,
      provider:     "instagram",
      access_token: longLivedToken,
      ig_user_id:   ig.id,
      expires_at:   expiresAt,
      updated_at:   syncedAt,
    }, { onConflict: "user_id,provider" });

    // ── Step 5: Update creator_profiles ────────────────────────────────────
    await admin.from("creator_profiles").update({
      instagram_connected:            true,
      instagram_user_id:              ig.id,
      instagram_handle:               ig.username,
      instagram_followers:            ig.followers_count       ?? 0,
      instagram_followers_synced_at:  syncedAt,
      instagram_profile_picture_url:  ig.profile_picture_url  ?? null,
    }).eq("user_id", user.id);

    return json(req, {
      success:   true,
      instagram: {
        username:            ig.username,
        followers_count:     ig.followers_count       ?? 0,
        profile_picture_url: ig.profile_picture_url   ?? null,
        media_count:         ig.media_count            ?? null,
        account_type:        ig.account_type           ?? null,
        synced_at:           syncedAt,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json(req, { error: "internal", message }, 500);
  }
});
