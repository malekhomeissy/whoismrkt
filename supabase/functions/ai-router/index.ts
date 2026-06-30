// ─────────────────────────────────────────────────────────────────────────────
// MRKT AI Router  (HTTP gateway — v2)
//
// Unified AI endpoint for any client that needs to call "MRKT AI" directly
// without a feature-specific edge function. Delegates all execution to the
// shared router module: provider selection, fallback, latency tracking, logging.
//
// POST /functions/v1/ai-router
// Body: { task_type, prompt, context?, system_prompt?, metadata? }
//
// Returns: { response, feature, latency_ms, usage }
//
// Provider routing is deterministic — task_type alone decides the provider.
// Users see "MRKT AI". Provider names never appear in responses.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAI, ROUTES } from "../_shared/router.ts";


// ─── Daily rate limits (requests/day/user per provider) ───────────────────────
const DAILY_LIMITS: Record<string, number> = {
  anthropic:  50,
  openai:     100,
  higgsfield: 10,
};

async function checkDailyLimit(
  supabase: ReturnType<typeof createClient>,
  userId:   string,
  provider: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("ai_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", provider)
    .neq("status", "failed")
    .gte("created_at", dayStart.toISOString());

  const used  = count ?? 0;
  const limit = DAILY_LIMITS[provider] ?? 100;
  return { allowed: used < limit, used, limit };
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

    // ── 2. Parse and validate request ─────────────────────────────────────────
    const body = await req.json() as {
      task_type:      string;
      prompt:         string;
      context?:       string;
      system_prompt?: string;
      metadata?:      Record<string, unknown>;
    };

    const { task_type, prompt, context, system_prompt } = body;

    if (!task_type?.trim()) return respond({ error: "task_type is required" }, 400);
    if (!prompt?.trim())    return respond({ error: "prompt is required" }, 400);

    // ── 3. Validate feature is known ──────────────────────────────────────────
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

    // ── 4. Rate limit check ───────────────────────────────────────────────────
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

    // ── 5. Build messages — include context if provided ───────────────────────
    const userContent = context?.trim()
      ? `Context:\n${context.trim()}\n\n${prompt.trim()}`
      : prompt.trim();

    // ── 6. Call MRKT AI ───────────────────────────────────────────────────────
    const result = await callAI({
      feature:      task_type,
      messages:     [{ role: "user", content: userContent }],
      systemPrompt: system_prompt?.trim() || undefined,
      userId:       user.id,
      supabase:     serviceClient,
    });

    // ── 7. Return — never expose provider name to client ─────────────────────
    return respond({
      response:   result.content,
      feature:    task_type,
      latency_ms: result.latencyMs,
      fallback:   result.fallbackUsed,
      usage: {
        input_tokens:   result.inputTokens,
        output_tokens:  result.outputTokens,
        estimated_cost: result.estimatedCostUsd,
        requests_today: used + 1,
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
