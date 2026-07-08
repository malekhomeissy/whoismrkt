// ─────────────────────────────────────────────────────────────────────────────
// growth-advice  (v2 — MRKT AI Router)
//
// Personalized growth recommendations for creators and businesses.
// Routes through MRKT AI Router: OpenAI → Anthropic fallback.
//
// POST body:
//   role     "creator" | "business"
//   profile  object (creator_profiles or business_profiles row)
//   stats    object (visibility_score, applications, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { callAI }            from "../_shared/router.ts";
import { growthAdvicePrompt } from "../_shared/prompts.ts";
import { corsHeaders, isRateLimited, STRICT_AI_RATE } from "../_shared/security.ts";


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authErr } =
      await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return respond({ error: "Unauthorized" }, 401);

    if (isRateLimited(`growth-advice:${user.id}`, STRICT_AI_RATE)) {
      return respond({ error: "Too many requests. Please wait a moment." }, 429);
    }

    const { role, profile, stats } = await req.json();

    const now = new Date();
    const prompt = growthAdvicePrompt({
      role:    role ?? "creator",
      profile: profile ?? {},
      stats:   stats   ?? {},
      dayName: now.toLocaleDateString("en-US", { weekday: "long" }),
      month:   now.toLocaleDateString("en-US", { month: "long" }),
      date:    now.getDate(),
      year:    now.getFullYear(),
    });

    const result = await callAI({
      feature:  "growth_advice",
      messages: [{ role: "user", content: prompt }],
      userId:   user.id,
      supabase,
    });

    let parsed: { advice: unknown[] } = { advice: [] };
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch { /* return empty advice */ }

    return respond({ advice: parsed.advice ?? [] });

  } catch (err) {
    console.error("growth-advice error:", err);
    return respond({ error: "Internal error" }, 500);
  }
});
