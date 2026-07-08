import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, isRateLimited, STRICT_AI_RATE } from "../_shared/security.ts";

// ─────────────────────────────────────────────────────────────────────────────
// content-plan-generate
//
// Dedicated Anthropic-powered content strategy engine.
// Supports three actions:
//   generate        — full plan for 1 or 4 weeks
//   regenerate_item — fresh version of a single calendar item
//   improve_item    — enhanced version of a single calendar item
//
// POST /functions/v1/content-plan-generate
// Body: { weeks, start_date, goal, frequency, platforms, action?, item_context? }
// Returns: { items, model, item_count, session_id? }
// ─────────────────────────────────────────────────────────────────────────────


const MODEL      = "claude-sonnet-4-6";
// Reduced from 8192 — this was the largest output ceiling in the codebase,
// combined with zero rate limit and zero credit check made this endpoint a
// realistic ~$150+/day cost-explosion vector for a single abusive account.
// Note: 4-week/24-item "generate" plans may occasionally truncate at this
// ceiling; if that becomes a real problem, scale maxTokens by `weeks` instead
// of raising the global cap back up.
const MAX_TOKENS = 3000;

// AI credit cost per action, consumed atomically server-side via the
// consume_ai_credits() RPC (see migration 20260706000000). "generate" is by
// far the most expensive call (full plan, largest prompt); item-level
// regenerate/improve calls are cheap single-item rewrites.
const CREDIT_COST: Record<"generate" | "regenerate_item" | "improve_item", number> = {
  generate:        8,
  regenerate_item: 2,
  improve_item:    2,
};

const SYSTEM = `You are MRKT's Content Strategy AI — a world-class social media strategist specializing in creator-brand growth in the GCC market (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman).

Your task: generate premium, deeply personalized content that feels like it was crafted by a strategist who studied this creator for weeks. Every piece of content must be:
- Specific to THIS creator's exact niche and audience — not a generic niche
- Immediately executable with a smartphone, no professional crew needed
- Culturally aware of GCC social media culture, trends, and sensibilities
- Platform-native (a TikTok hook differs from a LinkedIn intro)
- Designed to achieve the creator's stated primary goal

ABSOLUTE RULES — violations mean the output is rejected:
• NEVER write "Post about your niche" or "Share a tip" or "Create engaging content" — ever
• Every hook must pass this test: would a stranger with their thumb on the scroll button actually stop?
• Captions must sound like a real human wrote them at 11pm — not AI copy
• CTAs must be specific: "Comment your answer below" beats "Engage with me"
• "why_it_works" must name the niche and explain the psychological reason
• Return ONLY a valid JSON array — zero prose, zero markdown, zero code fences, nothing else before or after the array`;

const ITEM_SCHEMA = `Each item must have EXACTLY these fields (no extras, no missing):
{
  "title": "string — the content piece name, max 60 chars",
  "platform": "string — one of the creator's platforms",
  "content_type": "string — e.g. Reel, TikTok, Educational, Vlog, Review, Story, Thread, Short, GRWM, Trend",
  "scheduled_date": "YYYY-MM-DD — spread across the plan period",
  "scheduled_time": "HH:MM — optimal posting time for this platform and goal, vary morning/afternoon/evening",
  "status": "planned",
  "hook": "string — scroll-stopping opening line, 10-18 words, present tense, punchy",
  "content_idea": "string — exactly what to film or write: specific scene, angle, props if needed. 2-3 actionable sentences",
  "caption": "string — full platform-native caption. Conversational. 3-5 hashtags at end only",
  "cta": "string — one specific, compelling call-to-action (not 'follow for more')",
  "creative_direction": "string — lighting, camera angle, editing style, sound, transitions. 20-35 words",
  "why_it_works": "string — the strategic reason this works for this creator's niche and audience. 1-2 sentences",
  "post_goal": "one of: reach | engagement | conversions | trust | entertainment",
  "notes": null,
  "ai_generated": true
}`;

// deno-lint-ignore no-explicit-any
type SupabaseClient = ReturnType<typeof createClient<any>>;

interface CreatorProfile {
  display_name?: string;
  bio?: string;
  niche?: string;
  categories?: string[];
  platforms?: string[];
  location?: string;
  audience_location?: string;
  audience_age_range?: string;
  audience_gender_split?: string;
  follower_count?: number;
  rate_range?: string;
  preferred_content_types?: string[];
}

interface BaseProfile {
  name?: string;
  niche?: string;
  platforms?: string[];
  account_type?: string;
}

async function fetchProfiles(supabase: SupabaseClient, userId: string): Promise<{ creator: CreatorProfile | null; base: BaseProfile | null }> {
  const [{ data: creator }, { data: base }] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("display_name,bio,niche,categories,platforms,location,audience_location,audience_age_range,audience_gender_split,follower_count,rate_range,preferred_content_types")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("name,niche,platforms,account_type")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  return { creator, base };
}

function buildGeneratePrompt(
  creator: CreatorProfile | null,
  base: BaseProfile | null,
  req: { weeks: 1 | 4; start_date: string; goal: string; frequency: number; platforms: string[] },
): string {
  const name       = creator?.display_name || base?.name || "Creator";
  const niche      = creator?.niche || base?.niche || "content creation";
  const platforms  = req.platforms?.length > 0 ? req.platforms : (creator?.platforms ?? base?.platforms ?? ["Instagram", "TikTok"]);
  const postCount  = req.weeks === 1 ? Math.min(req.frequency || 5, 7) : Math.min((req.frequency || 5) * 4, 24);
  const isBiz      = ["brand", "business"].includes(base?.account_type ?? "");

  const contentTypes = isBiz
    ? ["Product Post", "Brand Story", "Promo", "Campaign", "Announcement", "Collaboration", "Ad"]
    : ["Reel", "TikTok", "Story", "Educational", "Vlog", "Review", "Trend", "GRWM", "Short"];

  const goalDescriptions: Record<string, string> = {
    followers:       "grow follower count — prioritize shareable, discoverable content with strong hooks",
    engagement:      "maximize likes, comments, saves — ask questions, share opinions, create conversation",
    leads:           "generate DMs and link clicks — include clear value propositions and direct CTAs",
    brand_awareness: "reach new audiences — prioritize Reels/Shorts, trend participation, collabs",
    sales:           "drive product/service purchases — include social proof, demos, and purchase CTAs",
  };

  return `Generate a ${req.weeks === 1 ? "1-week" : "4-week"} content calendar for this creator. Return exactly ${postCount} items.

━━━ CREATOR PROFILE ━━━
Name: ${name}
Niche: ${niche}
Bio: ${creator?.bio ? `"${creator.bio}"` : "Not provided — infer from niche"}
Location: ${creator?.location || "GCC region"}
Content Categories: ${creator?.categories?.join(", ") || niche}
Active Platforms: ${platforms.join(", ")}
Audience Location: ${creator?.audience_location || "Saudi Arabia, UAE (primarily)"}
Audience Age: ${creator?.audience_age_range || "18–35"}
Audience Gender: ${creator?.audience_gender_split || "Mixed"}
Follower Count: ${creator?.follower_count ? `~${creator.follower_count.toLocaleString()}` : "Growing (under 50k)"}
Preferred Content: ${creator?.preferred_content_types?.join(", ") || contentTypes.slice(0, 5).join(", ")}

━━━ PLAN PARAMETERS ━━━
Start Date: ${req.start_date}
Duration: ${req.weeks === 1 ? "7 days" : "28 days"}
Platforms to use: ${platforms.join(", ")}
Posting frequency: ${req.frequency || 5} posts/week
Primary Goal: ${req.goal} — ${goalDescriptions[req.goal] || req.goal}
Total items to generate: ${postCount}
Available content types: ${contentTypes.join(", ")}

━━━ STRATEGIC BRIEF ━━━
- Spread posts evenly across the ${req.weeks === 1 ? "week" : "4 weeks"} — no 3 posts on one day, none on others
- Vary platforms, content types, and topics — no two consecutive posts should be identical format
- Build a narrative arc: awareness → trust → conversion posts if goal is sales/leads
- Respect GCC content culture: avoid alcohol/gambling references, respect prayer times (post at 10am, 3pm, 8pm, 10pm local)
- Every piece of content must be executable today by ${name} alone with a smartphone

Generate exactly ${postCount} items as a JSON array.

${ITEM_SCHEMA}`;
}

function buildRegeneratePrompt(
  creator: CreatorProfile | null,
  base: BaseProfile | null,
  item: Record<string, unknown>,
  goal: string,
): string {
  const name  = creator?.display_name || base?.name || "Creator";
  const niche = creator?.niche || base?.niche || "content creation";

  return `Regenerate this content item with a completely fresh angle. Do NOT reuse the same hook or concept.

━━━ CURRENT ITEM (to replace) ━━━
${JSON.stringify(item, null, 2)}

━━━ CONTEXT ━━━
Creator: ${name} | Niche: ${niche} | Goal: ${goal}
Audience: ${creator?.audience_location || "GCC"}, ${creator?.audience_age_range || "18-35"}

Create a better version: stronger hook, more specific content idea, more authentic caption.
Keep: platform "${item.platform}", scheduled_date "${item.scheduled_date}", content_type.
Change: everything else — completely fresh concept.

Return a JSON array with exactly 1 item.

${ITEM_SCHEMA}`;
}

function buildImprovePrompt(
  creator: CreatorProfile | null,
  base: BaseProfile | null,
  item: Record<string, unknown>,
  goal: string,
): string {
  const name  = creator?.display_name || base?.name || "Creator";
  const niche = creator?.niche || base?.niche || "content creation";

  return `Improve this content item. Keep the core concept but make every field better.

━━━ CURRENT ITEM ━━━
${JSON.stringify(item, null, 2)}

━━━ IMPROVEMENT BRIEF ━━━
Creator: ${name} | Niche: ${niche} | Goal: ${goal}
- Make the hook irresistible — it must stop a fast-scrolling thumb
- Make content_idea more specific and executable
- Rewrite caption to sound more human and conversational
- Make CTA more compelling and specific
- Deepen why_it_works with audience psychology
- Keep all dates, platform, and status the same

Return a JSON array with exactly 1 improved item.

${ITEM_SCHEMA}`;
}

async function callClaude(prompt: string): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:       MODEL,
      max_tokens:  MAX_TOKENS,
      temperature: 0.85,
      system:      SYSTEM,
      messages:    [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    content: { type: string; text: string }[];
    usage:   { input_tokens: number; output_tokens: number };
  };

  return {
    text:         data.content.find((b) => b.type === "text")?.text ?? "",
    inputTokens:  data.usage?.input_tokens  ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────

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

    // ── Rate limit ───────────────────────────────────────────────────────────
    // This endpoint previously had zero rate limiting — a scripted loop could
    // call it continuously with no throttle at all.
    if (isRateLimited(`content-plan-generate:${user.id}`, STRICT_AI_RATE)) {
      return json({ error: "Too many requests. Please wait a moment before generating again." }, 429);
    }

    // ── Parse request ─────────────────────────────────────────────────────────

    const body = await req.json() as {
      weeks:         1 | 4;
      start_date:    string;
      goal:          string;
      frequency:     number;
      platforms:     string[];
      action?:       "generate" | "regenerate_item" | "improve_item";
      item_context?: Record<string, unknown>;
    };

    const { weeks = 1, start_date, goal = "engagement", frequency = 5, platforms = [], action = "generate", item_context } = body;

    // ── Credit check (fail closed) ────────────────────────────────────────────
    // Previously this endpoint had NO server-side credit/quota check at all —
    // the client-side credit system in src/lib/aiCredits.ts is unreachable
    // (RLS blocks direct client UPDATEs) and fails OPEN on error. This call is
    // atomic (row-locked) and fails CLOSED: if the RPC errors or reports
    // insufficient credits, the request is rejected rather than allowed.
    const cost = CREDIT_COST[action] ?? CREDIT_COST.generate;
    const { data: creditRows, error: creditErr } = await serviceClient.rpc(
      "consume_ai_credits",
      { p_user_id: user.id, p_cost: cost },
    );
    if (creditErr) {
      console.error("consume_ai_credits error:", creditErr);
      return json({ error: "Unable to verify AI credits right now. Please try again shortly." }, 503);
    }
    const creditResult = Array.isArray(creditRows) ? creditRows[0] : creditRows;
    if (!creditResult?.allowed) {
      return json({
        error: "You've reached your monthly AI credit limit for content planning. Upgrade your plan for more.",
        remaining: creditResult?.remaining ?? 0,
      }, 402);
    }

    // ── Fetch creator context ─────────────────────────────────────────────────

    const { creator, base } = await fetchProfiles(supabase, user.id);

    // ── Build prompt ──────────────────────────────────────────────────────────

    let prompt: string;
    if (action === "regenerate_item" && item_context) {
      prompt = buildRegeneratePrompt(creator, base, item_context, goal);
    } else if (action === "improve_item" && item_context) {
      prompt = buildImprovePrompt(creator, base, item_context, goal);
    } else {
      prompt = buildGeneratePrompt(creator, base, { weeks, start_date, goal, frequency, platforms });
    }

    // ── Call Claude ───────────────────────────────────────────────────────────

    const { text: rawText, inputTokens, outputTokens } = await callClaude(prompt);

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const items = JSON.parse(cleaned);
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("AI returned empty or invalid JSON");
    }

    // ── Create session record for full plans ──────────────────────────────────

    let sessionId: string | null = null;
    if (action === "generate") {
      const activePlatforms = platforms.length > 0 ? platforms : (creator?.platforms ?? base?.platforms ?? ["Instagram"]);
      const name            = creator?.display_name || base?.name || "Creator";
      const niche           = creator?.niche || base?.niche || "content";

      const { data: session } = await serviceClient
        .from("content_plan_sessions")
        .insert({
          user_id:    user.id,
          title:      `${name}'s ${weeks === 1 ? "Weekly" : "Monthly"} ${niche} Plan`,
          weeks,
          goal,
          frequency,
          platforms:  activePlatforms,
          item_count: items.length,
          model:      MODEL,
        })
        .select("id")
        .single();

      sessionId = session?.id ?? null;
    }

    // Tag items with session_id
    const taggedItems = sessionId
      ? items.map((i: Record<string, unknown>) => ({ ...i, session_id: sessionId }))
      : items;

    // ── Log to ai_requests (fire-and-forget) ──────────────────────────────────

    serviceClient.from("ai_requests").insert({
      user_id:        user.id,
      provider:       "anthropic",
      task_type:      `content_plan_${action}`,
      prompt:         prompt.slice(0, 3000),
      response:       cleaned.slice(0, 5000),
      status:         "completed",
      model:          MODEL,
      input_tokens:   inputTokens,
      output_tokens:  outputTokens,
      estimated_cost: (inputTokens / 1000) * 0.003 + (outputTokens / 1000) * 0.015,
      created_at:     new Date().toISOString(),
    }).then(() => {});

    return json({
      items:      taggedItems,
      model:      MODEL,
      item_count: taggedItems.length,
      session_id: sessionId,
      usage: {
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
      },
    });

  } catch (err) {
    console.error("content-plan-generate error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      500,
    );
  }
});
