import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/security.ts";

// ─────────────────────────────────────────────────────────────────────────────
// higgsfield-status
//
// POST /functions/v1/higgsfield-status
//
// Body:
//   asset_id   string   required  — the generated_assets.id to check
//
// Flow:
//   1. Verify user auth
//   2. Load asset record (must belong to user)
//   3. If already completed/failed → return immediately (no Higgsfield call)
//   4. GET Higgsfield /v2/requests/status/{request_id}
//   5. If COMPLETED → update DB with output_url, return updated asset
//   6. If FAILED    → update DB with error_message, return updated asset
//   7. Otherwise    → return current generating state
// ─────────────────────────────────────────────────────────────────────────────


const HIGGSFIELD_BASE = "https://fnf.higgsfield.ai";

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

    // ── 5. Poll Higgsfield ───────────────────────────────────────────────────

    const apiKey = Deno.env.get("HIGGSFIELD_API_KEY");
    if (!apiKey) return json({ error: "HIGGSFIELD_API_KEY is not configured" }, 503);

    const requestId = asset.higgsfield_request_id;
    if (!requestId) {
      // No request ID — mark as failed
      const { data: updated } = await supabase
        .from("generated_assets")
        .update({ status: "failed", error_message: "No Higgsfield request ID found" })
        .eq("id", asset_id)
        .select()
        .single();
      return json({ asset: updated ?? asset });
    }

    const statusRes = await fetch(
      `${HIGGSFIELD_BASE}/agents/jobs/${requestId}`,
      {
        headers: { "Authorization": `Bearer ${apiKey}` },
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

    return json({ asset, higgsfield_status: statusData.status ?? "processing" });

  } catch (err) {
    console.error("Unhandled error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
