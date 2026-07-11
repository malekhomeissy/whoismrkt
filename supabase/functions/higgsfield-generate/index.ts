import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/security.ts";

// ─────────────────────────────────────────────────────────────────────────────
// higgsfield-generate
//
// POST /functions/v1/higgsfield-generate
//
// Body:
//   prompt                  string   required
//   asset_type              "image" | "video"   required
//   aspect_ratio            string   optional  e.g. "9:16", "1:1", "16:9"
//   platform                string   optional
//   content_planner_item_id string   optional
//
// Credit pricing (MRKT platform credits, separate from Higgsfield credits):
//   image → IMAGE_CREDIT_COST  (1)
//   video → VIDEO_CREDIT_COST  (3)
//   MONTHLY_CREDIT_LIMIT total per user per month (10)
//
// Higgsfield consumer API: fnf-api-gw.higgsfield.ai/fnf
// Auth: Authorization: Bearer {oat_token}
// Workspace: hf-workspace-id header
// ─────────────────────────────────────────────────────────────────────────────


const HIGGSFIELD_BASE  = "https://fnf-api-gw.higgsfield.ai/fnf";
const CLERK_TOKEN_URL  = "https://clerk.higgsfield.ai/oauth/token";
const CLERK_CLIENT_ID  = "sRGCQJvvJkPrrtRj";
const VIDEO_MODEL      = "soul";

const MONTHLY_CREDIT_LIMIT = 10;
const IMAGE_CREDIT_COST    = 1;
const VIDEO_CREDIT_COST    = 3;

// ── Token auto-refresh ────────────────────────────────────────────────────────

async function getHiggsfieldToken(serviceClient: ReturnType<typeof createClient>): Promise<{
  accessToken: string;
  workspaceId: string;
}> {
  const { data: rows, error } = await serviceClient
    .from("system_config")
    .select("key, value")
    .in("key", ["higgsfield_access_token", "higgsfield_refresh_token", "higgsfield_expires_at", "higgsfield_workspace_id"]);

  if (error || !rows?.length) throw new Error("Higgsfield credentials not found in system_config");

  const cfg: Record<string, string> = {};
  for (const row of rows) cfg[row.key] = row.value;

  const expiresAt   = parseInt(cfg["higgsfield_expires_at"] ?? "0", 10);
  const nowSec      = Math.floor(Date.now() / 1000);
  const workspaceId = cfg["higgsfield_workspace_id"] ?? "";

  // Refresh if within 5 minutes of expiry
  if (expiresAt - nowSec < 300) {
    const refreshToken = cfg["higgsfield_refresh_token"];
    if (!refreshToken) throw new Error("No Higgsfield refresh token — re-authenticate via `higgsfield auth login`");

    const res = await fetch(CLERK_TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: CLERK_CLIENT_ID }).toString(),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Higgsfield token refresh failed (${res.status}): ${txt}`);
    }

    const tokens = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
    const newExpiry = nowSec + (tokens.expires_in ?? 86400);

    await serviceClient.from("system_config").upsert([
      { key: "higgsfield_access_token",  value: tokens.access_token,                 updated_at: new Date().toISOString() },
      { key: "higgsfield_refresh_token", value: tokens.refresh_token ?? refreshToken, updated_at: new Date().toISOString() },
      { key: "higgsfield_expires_at",    value: String(newExpiry),                    updated_at: new Date().toISOString() },
    ]);

    console.log("Higgsfield token auto-refreshed, expires", new Date(newExpiry * 1000).toISOString());
    return { accessToken: tokens.access_token, workspaceId };
  }

  return { accessToken: cfg["higgsfield_access_token"] ?? "", workspaceId };
}

const PLATFORM_RATIO: Record<string, string> = {
  instagram: "1:1",
  tiktok:    "9:16",
  youtube:   "16:9",
  linkedin:  "16:9",
  x:         "16:9",
  facebook:  "16:9",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── 2. Parse & validate ──────────────────────────────────────────────────

    const body = await req.json() as {
      prompt:                   string;
      asset_type:               "image" | "video";
      aspect_ratio?:            string;
      platform?:                string;
      content_planner_item_id?: string;
    };

    const { prompt, asset_type, content_planner_item_id } = body;

    if (!prompt?.trim()) return json({ error: "prompt is required" }, 400);
    if (asset_type !== "image" && asset_type !== "video")
      return json({ error: "asset_type must be 'image' or 'video'" }, 400);

    const creditCost = asset_type === "video" ? VIDEO_CREDIT_COST : IMAGE_CREDIT_COST;

    // ── 3. Credit balance check (atomic) ─────────────────────────────────────
    // Previously a sum-then-generate-then-insert against generated_assets —
    // not atomic, so concurrent requests near the cap could all pass the
    // check. consume_higgsfield_credits() checks and reserves the credit in
    // one row-locked RPC call, before the provider is ever invoked. As with
    // consume_ai_credits() (content-plan-generate), a credit reserved here is
    // not refunded if the provider call subsequently fails — the same
    // fail-closed trade-off already established for AI credit accounting
    // elsewhere in this codebase.

    const { data: creditRows, error: creditErr } = await serviceClient.rpc(
      "consume_higgsfield_credits",
      { p_user_id: user.id, p_cost: creditCost, p_monthly_limit: MONTHLY_CREDIT_LIMIT },
    );
    if (creditErr) {
      console.error("consume_higgsfield_credits error:", creditErr);
      return json({ error: "Unable to verify credits right now. Please try again shortly." }, 503);
    }
    const creditResult = Array.isArray(creditRows) ? creditRows[0] : creditRows;
    const creditsUsed      = creditResult?.used ?? MONTHLY_CREDIT_LIMIT;
    const creditsRemaining = creditResult?.remaining ?? 0;

    if (!creditResult?.allowed) {
      return json(
        {
          error:             "Not enough credits",
          credits_used:      creditsUsed,
          credits_remaining: creditsRemaining,
          cost:              creditCost,
          limit:             MONTHLY_CREDIT_LIMIT,
          resets:            new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          message:           asset_type === "video"
            ? `Videos cost ${VIDEO_CREDIT_COST} credits. You have ${creditsRemaining} credit${creditsRemaining === 1 ? "" : "s"} left.`
            : "You have no credits left this month.",
        },
        429,
      );
    }

    // ── 4. Resolve aspect ratio ──────────────────────────────────────────────

    const aspect_ratio =
      body.aspect_ratio ||
      (body.platform ? PLATFORM_RATIO[body.platform.toLowerCase()] : null) ||
      (asset_type === "video" ? "9:16" : "1:1");

    // ── 5. Generate ──────────────────────────────────────────────────────────

    let outputUrl:   string | null = null;
    let jobStatus                  = "completed";
    let requestId:   string | null = null;
    let provider                   = "openai";

    if (asset_type === "image") {
      // Images → OpenAI DALL-E 3
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 503);

      // Map aspect_ratio to DALL-E 3 size
      const sizeMap: Record<string, string> = {
        "1:1":  "1024x1024",
        "16:9": "1792x1024",
        "9:16": "1024x1792",
      };
      const size = sizeMap[aspect_ratio] ?? "1024x1024";

      const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          model:   "dall-e-3",
          prompt:  prompt.trim(),
          n:       1,
          size,
          quality: "standard",
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text().catch(() => "");
        console.error(`OpenAI error ${openaiRes.status}:`, errText);
        return json({ error: `Generation failed (${openaiRes.status})`, details: errText }, 502);
      }

      const openaiData = await openaiRes.json() as { data?: { url?: string }[] };
      outputUrl = openaiData.data?.[0]?.url ?? null;

    } else {
      // Videos → Higgsfield with auto-refresh
      provider  = "higgsfield";
      jobStatus = "generating";

      let hfToken: { accessToken: string; workspaceId: string };
      try {
        hfToken = await getHiggsfieldToken(serviceClient);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Token error:", msg);
        return json({ error: msg }, 503);
      }

      const hfRes = await fetch(
        `${HIGGSFIELD_BASE}/developer/v2alpha/videos/${VIDEO_MODEL}/generations`,
        {
          method: "POST",
          headers: {
            "Authorization":   `Bearer ${hfToken.accessToken}`,
            "hf-workspace-id": hfToken.workspaceId,
            "User-Agent":      "hf-cli/1.0.2",
            "Content-Type":    "application/json",
          },
          body: JSON.stringify({ params: { prompt: prompt.trim(), aspect_ratio } }),
        },
      );

      if (!hfRes.ok) {
        const errText = await hfRes.text().catch(() => "");
        console.error(`Higgsfield error ${hfRes.status}:`, errText);
        return json({ error: `Generation failed (${hfRes.status})`, details: errText }, 502);
      }

      const hfData = await hfRes.json() as { id?: string; status?: string; result_url?: string | null };
      requestId = hfData.id ?? null;
      if (hfData.status === "completed") {
        jobStatus = "completed";
        outputUrl = hfData.result_url ?? null;
      }
    }

    // ── 7. Persist to DB ─────────────────────────────────────────────────────

    const { data: asset, error: insertErr } = await supabase
      .from("generated_assets")
      .insert({
        user_id:                 user.id,
        content_planner_item_id: content_planner_item_id ?? null,
        prompt:                  prompt.trim(),
        provider,
        asset_type,
        aspect_ratio,
        credits_used:            creditCost,
        status:                  jobStatus,
        output_url:              outputUrl ?? null,
        higgsfield_request_id:   requestId,
        error_message:           null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      return json({ error: "Failed to save generation record", details: insertErr.message }, 500);
    }

    return json({
      asset,
      usage: {
        // creditsUsed/creditsRemaining already reflect this request's cost —
        // consume_higgsfield_credits() returns the POST-consumption balance.
        credits_used:      creditsUsed,
        credits_remaining: creditsRemaining,
        limit:             MONTHLY_CREDIT_LIMIT,
        cost:              creditCost,
      },
    });

  } catch (err) {
    console.error("Unhandled error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
