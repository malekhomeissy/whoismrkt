import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/security.ts";

// ─────────────────────────────────────────────────────────────────────────────
// higgsfield-status
//
// POST /functions/v1/higgsfield-status
//
// Body:
//   asset_id   string   required  — the generated_assets.id to check
// ─────────────────────────────────────────────────────────────────────────────

const HIGGSFIELD_BASE = "https://fnf-api-gw.higgsfield.ai/fnf";
const CLERK_TOKEN_URL = "https://clerk.higgsfield.ai/oauth/token";
const CLERK_CLIENT_ID = "sRGCQJvvJkPrrtRj";

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

    // ── 2. Parse request ─────────────────────────────────────────────────────

    const body = await req.json() as { asset_id: string };
    const { asset_id } = body;

    if (!asset_id) return json({ error: "asset_id is required" }, 400);

    // ── 3. Load asset ────────────────────────────────────────────────────────

    const { data: asset, error: fetchErr } = await supabase
      .from("generated_assets")
      .select("*")
      .eq("id", asset_id)
      .eq("user_id", user.id)        // RLS double-check: must own the asset
      .single();

    if (fetchErr || !asset) {
      return json({ error: "Asset not found" }, 404);
    }

    // ── 4. Short-circuit if already resolved ─────────────────────────────────

    if (asset.status === "completed" || asset.status === "failed") {
      return json({ asset });
    }

    // ── 5. Poll Higgsfield API ───────────────────────────────────────────────

    let hfToken: { accessToken: string; workspaceId: string };
    try {
      hfToken = await getHiggsfieldToken(serviceClient);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return json({ error: msg }, 503);
    }

    const requestId = asset.higgsfield_request_id;
    if (!requestId) {
      const { data: updated } = await supabase
        .from("generated_assets")
        .update({ status: "failed", error_message: "No Higgsfield request ID found" })
        .eq("id", asset_id)
        .select()
        .single();
      return json({ asset: updated ?? asset });
    }

    // GET /fnf/developer/v2alpha/jobs/{job_id}
    const statusRes = await fetch(
      `${HIGGSFIELD_BASE}/developer/v2alpha/jobs/${requestId}`,
      {
        headers: {
          "Authorization":   `Bearer ${hfToken.accessToken}`,
          "hf-workspace-id": hfToken.workspaceId,
          "User-Agent":      "hf-cli/1.0.2",
        },
      },
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text().catch(() => "");
      console.error(`Higgsfield status error ${statusRes.status}:`, errText);
      return json({ asset, higgsfield_error: errText });
    }

    const statusData = await statusRes.json() as {
      status?:     string;
      result_url?: string | null;
      error?:      string;
      message?:    string;
    };

    const higgsfieldStatus = (statusData.status ?? "").toLowerCase();

    // ── 6. Handle terminal states ─────────────────────────────────────────────

    if (higgsfieldStatus === "completed") {
      const outputUrl = statusData.result_url ?? null;

      const { data: updated, error: updateErr } = await supabase
        .from("generated_assets")
        .update({ status: "completed", output_url: outputUrl })
        .eq("id", asset_id)
        .select()
        .single();

      if (updateErr) console.error("DB update error:", updateErr);
      return json({ asset: updated ?? { ...asset, status: "completed", output_url: outputUrl } });
    }

    if (higgsfieldStatus === "failed" || higgsfieldStatus === "error" || higgsfieldStatus === "cancelled") {
      const errMsg = statusData.error ?? statusData.message ?? `Generation ${higgsfieldStatus}`;

      const { data: updated } = await supabase
        .from("generated_assets")
        .update({ status: "failed", error_message: errMsg })
        .eq("id", asset_id)
        .select()
        .single();

      return json({ asset: updated ?? { ...asset, status: "failed", error_message: errMsg } });
    }

    // ── 7. Still in-progress ──────────────────────────────────────────────────

    return json({ asset, higgsfield_status: statusData.status ?? "processing", error: statusData.error ?? null });

  } catch (err) {
    console.error("Unhandled error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
