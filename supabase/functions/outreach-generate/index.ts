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

    const body = await req.json();
    const prompt = outreachGeneratePrompt({
      type:         body.type ?? "initial",
      creator:      body.creator      ?? { name: "Creator", niche: "Lifestyle", followers: 0, platforms: [] },
      campaign:     body.campaign     ?? { title: "Campaign", description: "", budget: "TBD", platforms: [] },
      businessName: body.businessName ?? "Brand",
      context:      body.context,
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
