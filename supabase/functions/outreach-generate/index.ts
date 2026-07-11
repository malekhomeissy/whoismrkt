// ─────────────────────────────────────────────────────────────────────────────
// outreach-generate  (v2 — MRKT AI Router)
//
// Generates AI outreach messages for businesses to send to creators.
// Routes through MRKT AI Router: OpenAI → Anthropic fallback.
//
// POST body:
//   type          "initial" | "followup" | "negotiation" | "proposal"
//   creator       { name, niche, followers, platforms }
//   campaign      { title, description, budget, platforms }
//   businessName  string
//   context?      string  (previous exchange for followup/negotiation)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { callAI }                 from "../_shared/router.ts";
import { outreachGeneratePrompt } from "../_shared/prompts.ts";
import {
  corsHeaders, isRateLimited, STRICT_AI_RATE, sanitizeForPrompt, sanitizeString, sanitizeStringArray,
} from "../_shared/security.ts";


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

    if (isRateLimited(`outreach-generate:${user.id}`, STRICT_AI_RATE)) {
      return respond({ error: "Too many requests. Please wait a moment before generating again." }, 429);
    }

    const body = await req.json();
    const allowedTypes = ["initial", "followup", "negotiation", "proposal"];
    const reqType = allowedTypes.includes(body.type) ? body.type : "initial";

    const rawCreator  = body.creator  ?? {};
    const rawCampaign = body.campaign ?? {};

    const prompt = outreachGeneratePrompt({
      type: reqType,
      creator: {
        name:      sanitizeString(rawCreator.name ?? "Creator", 200),
        niche:     sanitizeString(rawCreator.niche ?? "Lifestyle", 200),
        followers: Number.isFinite(rawCreator.followers) ? rawCreator.followers : 0,
        platforms: sanitizeStringArray(rawCreator.platforms, 10, 60),
      },
      campaign: {
        title:       sanitizeString(rawCampaign.title ?? "Campaign", 200),
        description: sanitizeForPrompt(sanitizeString(rawCampaign.description ?? "", 2000)),
        budget:      sanitizeString(rawCampaign.budget ?? "TBD", 100),
        platforms:   sanitizeStringArray(rawCampaign.platforms, 10, 60),
      },
      businessName: sanitizeString(body.businessName ?? "Brand", 200),
      context:      body.context ? sanitizeForPrompt(sanitizeString(body.context, 2000)) : undefined,
    });

    const result = await callAI({
      feature:  "outreach_generate",
      messages: [{ role: "user", content: prompt }],
      userId:   user.id,
      supabase,
    });

    let parsed: { messages: unknown[] } = { messages: [] };
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch { /* return empty messages */ }

    return respond({ messages: parsed.messages ?? [] });

  } catch (err) {
    console.error("outreach-generate error:", err);
    return respond({ error: "Internal error" }, 500);
  }
});
