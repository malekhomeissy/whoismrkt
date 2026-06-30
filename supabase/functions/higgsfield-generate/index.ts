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
// ─────────────────────────────────────────────────────────────────────────────


const HIGGSFIELD_BASE      = "https://fnf.higgsfield.ai";
const IMAGE_MODEL          = "nano_banana_2";   // Nano Banana Pro
const VIDEO_MODEL          = "seedance1_5";     // Seedance 1.5 Pro

const MONTHLY_CREDIT_LIMIT = 10;
const IMAGE_CREDIT_COST    = 1;
const VIDEO_CREDIT_COST    = 3;

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

    // ── 3. Credit balance check ──────────────────────────────────────────────

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: usageRows } = await supabase
      .from("generated_assets")
      .select("credits_used")
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString());

    const creditsUsed = (usageRows ?? []).reduce(
      (sum: number, row: { credits_used: number }) => sum + (row.credits_used ?? 1),
      0,
    );
    const creditsRemaining = MONTHLY_CREDIT_LIMIT - creditsUsed;

    if (creditsRemaining < creditCost) {
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

    // ── 5. Higgsfield API — create job ───────────────────────────────────────

    const apiKey = Deno.env.get("HIGGSFIELD_API_KEY");
    if (!apiKey) return json({ error: "HIGGSFIELD_API_KEY is not configured" }, 503);

    const model = asset_type === "video" ? VIDEO_MODEL : IMAGE_MODEL;

    const higgsfieldRes = await fetch(`${HIGGSFIELD_BASE}/agents/jobs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        job_set_type: model,
        params: {
          prompt:       prompt.trim(),
          aspect_ratio,
        },
      }),
    });

    if (!higgsfieldRes.ok) {
      const errText = await higgsfieldRes.text().catch(() => "");
      console.error(`Higgsfield error ${higgsfieldRes.status}:`, errText);
      return json(
        { error: `Generation failed (${higgsfieldRes.status})`, details: errText },
        502,
      );
    }

    // Response is an array of job IDs: ["job_id"]
    const jobIds = await higgsfieldRes.json() as string[];
    const jobId  = Array.isArray(jobIds) ? jobIds[0] : null;

    // ── 6. Fetch initial job state (often already completed for images) ───────

    let initialUrl: string | null  = null;
    let jobStatus:  string         = "generating";

    if (jobId) {
      const statusRes = await fetch(`${HIGGSFIELD_BASE}/agents/jobs/${jobId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      if (statusRes.ok) {
        const jobData = await statusRes.json() as {
          status?:     string;
          result_url?: string | null;
        };
        initialUrl = jobData.result_url ?? null;
        if (jobData.status === "completed" || initialUrl) jobStatus = "completed";
        if (jobData.status === "failed")                  jobStatus = "failed";
      }
    }

    // ── 7. Persist to DB ─────────────────────────────────────────────────────

    const { data: asset, error: insertErr } = await supabase
      .from("generated_assets")
      .insert({
        user_id:                 user.id,
        content_planner_item_id: content_planner_item_id ?? null,
        prompt:                  prompt.trim(),
        provider:                "higgsfield",
        asset_type,
        aspect_ratio,
        credits_used:            creditCost,
        status:                  jobStatus,
        output_url:              initialUrl ?? null,
        higgsfield_request_id:   jobId,
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
        credits_used:      creditsUsed + creditCost,
        credits_remaining: creditsRemaining - creditCost,
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
