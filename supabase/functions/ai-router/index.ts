// ─────────────────────────────────────────────────────────────────────────────
// MRKT AI Router  (HTTP gateway — v2)
//
// Unified AI endpoint for any client that needs to call "MRKT AI" directly
// without a feature-specific edge function. Delegates all execution to the
// shared router module: provider selection, fallback, latency tracking, logging.
//
// POST /functions/v1/ai-router
// Body: { task_type, prompt, context?, metadata? }
// (system_prompt is not accepted from the client — see note below)
//
// Returns: { response, feature, latency_ms, usage }
//
// Provider routing is deterministic — task_type alone decides the provider.
// Users see "MRKT AI". Provider names never appear in responses.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI, ROUTES } from "../_shared/router.ts";
import {
  corsHeaders, isRateLimited, STRICT_AI_RATE, sanitizeForPrompt, sanitizeString,
} from "../_shared/security.ts";


// ─── Daily rate limits (requests/day/user per provider) ───────────────────────
const DAILY_LIMITS: Record<string, number> = {
  anthropic:  50,
  openai:     100,
  higgsfield: 10,
};

const MAX_PROMPT_LEN  = 4_000;
const MAX_CONTEXT_LEN = 4_000;

// Atomic — a single UPSERT (INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING)
// under Postgres row-level locking, closing the check-then-log race that
// existed when this counted rows in ai_requests after the fact.
async function checkDailyLimit(
  serviceClient: ReturnType<typeof createClient>,
  userId:        string,
  provider:      string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = DAILY_LIMITS[provider] ?? 100;
  const { data, error } = await serviceClient.rpc("check_and_increment_ai_router_quota", {
    p_user_id: userId,
    p_provider: provider,
    p_daily_limit: limit,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: row.allowed, used: row.used, limit: row.quota_limit };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

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
    if (authErr || !user) return respond({ error: "Unauthorized" }, 401);

    // ── 2. Per-minute rate limit ───────────────────────────────────────────────
    // ai-router previously had no per-minute guard at all — only the (racy)
    // daily count below. A burst of requests within a minute had nothing
    // slowing it down.
    if (isRateLimited(`ai-router:${user.id}`, STRICT_AI_RATE)) {
      return respond({ error: "Too many requests. Please wait a moment before trying again." }, 429);
    }

    // ── 3. Parse and validate request ─────────────────────────────────────────
    // Note: `system_prompt` is intentionally NOT accepted from the client.
    // MRKT's persona/guardrails are always built server-side (see
    // systemPromptFor() in _shared/router.ts) — a client-supplied override
    // previously let any caller replace MRKT's guardrails entirely and turn
    // this endpoint into an unrestricted proxy to the underlying model,
    // billed to MRKT's own API keys.
    const body = await req.json() as {
      task_type: string;
      prompt:    string;
      context?:  string;
      metadata?: Record<string, unknown>;
    };

    const task_type = sanitizeString(body.task_type, 100);
    const prompt    = sanitizeForPrompt(sanitizeString(body.prompt, MAX_PROMPT_LEN));
    const context   = body.context ? sanitizeForPrompt(sanitizeString(body.context, MAX_CONTEXT_LEN)) : undefined;

    if (!task_type) return respond({ error: "task_type is required" }, 400);
    if (!prompt)    return respond({ error: "prompt is required" }, 400);

    // ── 4. Validate feature is known ──────────────────────────────────────────
    const route = ROUTES[task_type];
    if (!route) {
      return respond({
        error:           `Unknown task_type: "${task_type}"`,
        available_tasks: Object.keys(ROUTES),
      }, 400);
    }

    // Higgsfield tasks must use their dedicated function
    if (route.primary === "higgsfield") {
      return respond({
        error:    "Visual generation tasks must go to the higgsfield-generate function",
        redirect: "higgsfield-generate",
      }, 400);
    }

    // ── 5. Daily quota check (atomic — see check_and_increment_ai_router_quota) ─
    const { allowed, used, limit } = await checkDailyLimit(serviceClient, user.id, route.primary);
    if (!allowed) {
      const resetAt = new Date();
      resetAt.setHours(24, 0, 0, 0);
      return respond({
        error:     `Daily limit reached (${limit} requests/day for this feature type)`,
        used,
        limit,
        resets_at: resetAt.toISOString(),
      }, 429);
    }

    // ── 6. Build messages — include context if provided ───────────────────────
    const userContent = context ? `Context:\n${context}\n\n${prompt}` : prompt;

    // ── 7. Call MRKT AI — systemPrompt is always the server-side default ───────
    const result = await callAI({
      feature:  task_type,
      messages: [{ role: "user", content: userContent }],
      userId:   user.id,
      supabase: serviceClient,
    });

    // ── 8. Return — never expose provider name to client ─────────────────────
    return respond({
      response:   result.content,
      feature:    task_type,
      latency_ms: result.latencyMs,
      fallback:   result.fallbackUsed,
      usage: {
        input_tokens:   result.inputTokens,
        output_tokens:  result.outputTokens,
        estimated_cost: result.estimatedCostUsd,
        requests_today: used,
        daily_limit:    limit,
      },
    });

  } catch (err) {
    console.error("[MRKT AI Router] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";

    if (message.includes("429") || message.includes("rate limit")) {
      return respond({ error: "MRKT AI is busy right now. Try again in a moment." }, 429);
    }
    if (message.includes("All providers failed")) {
      return respond({ error: "MRKT AI is temporarily unavailable. Try again shortly." }, 503);
    }

    return respond({ error: "Something went wrong. Please try again." }, 500);
  }
});
