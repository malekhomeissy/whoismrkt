// ─────────────────────────────────────────────────────────────────────────────
// generate-intelligence
//
// Generates personalized, data-driven intelligence insights for the MRKT home
// dashboard. Uses Claude to produce 4-5 non-generic insights based on real
// user activity. Called once per home page load; results shown in the
// "MRKT Intelligence" panel.
//
// Input (POST body):
//   role        "creator" | "business"
//   stats       object with user's current platform stats
//   context     user profile context (name, niche, categories, etc.)
//
// Output:
//   insights: Array<{ text, link, category }>
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL      = "claude-haiku-4-5-20251001"; // Fast + cheap for insights
const MAX_TOKENS = 1024;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const CREATOR_LINKS: Record<string, string> = {
  profile:      "/creator-onboarding",
  analytics:    "/analytics",
  opportunities:"/opportunities",
  applications: "/applications",
  content:      "/content-planner",
  messages:     "/messages",
  chat:         "/chat",
  trust:        "/analytics",
};

const BUSINESS_LINKS: Record<string, string> = {
  pipeline:    "/pipeline",
  campaigns:   "/campaigns",
  create:      "/campaign-create",
  matches:     "/matches",
  messages:    "/messages",
  find:        "/find-creators",
  chat:        "/chat",
};

type InsightItem = { text: string; link: string; category: string };

function buildCreatorPrompt(stats: Record<string, unknown>, ctx: Record<string, unknown>): string {
  return `You are the MRKT platform intelligence engine. Generate exactly 4 insights for a creator's home dashboard.

Creator Context:
- Name: ${ctx.displayName ?? "Creator"}
- Niche: ${ctx.niche ?? "General"}
- Categories: ${JSON.stringify(ctx.categories ?? [])}
- Platforms: ${JSON.stringify(ctx.platforms ?? [])}
- Follower count: ${ctx.followerCount ?? "unknown"}
- Location: ${ctx.location ?? "unknown"}

Platform Stats (this week):
- Profile views: ${stats.profileViews ?? 0}
- Profile view change: ${stats.profileViewsChange ?? 0}%
- Match appearances: ${stats.matchAppearances ?? 0}
- Active applications: ${stats.myApplications ?? 0}
- Unread messages: ${stats.unreadMessages ?? 0}
- Saved opportunities: ${stats.savedCount ?? 0}
- Visibility score: ${stats.visibilityScore ?? 0}
- Upcoming content pieces: ${stats.upcomingCount ?? 0}
- New opportunities matching profile: ${stats.opportunityCount ?? 0}

Rules:
1. Each insight must reference a SPECIFIC number or fact from the stats above
2. Be specific and actionable — never generic
3. Each insight should feel different (don't repeat themes)
4. Tone: calm, smart, slightly urgent where needed. Not motivational-poster language.
5. Keep each insight under 90 characters
6. Each insight must include a "link" key pointing to one of: profile, analytics, opportunities, applications, content, messages, chat, trust

Return ONLY valid JSON with no surrounding text:
{
  "insights": [
    { "text": "...", "link": "opportunities", "category": "match" },
    { "text": "...", "link": "analytics", "category": "visibility" },
    { "text": "...", "link": "applications", "category": "action" },
    { "text": "...", "link": "content", "category": "content" }
  ]
}`;
}

function buildBusinessPrompt(stats: Record<string, unknown>, ctx: Record<string, unknown>): string {
  return `You are the MRKT platform intelligence engine. Generate exactly 4 insights for a business's home dashboard.

Business Context:
- Name: ${ctx.displayName ?? "Business"}
- Industry: ${ctx.industry ?? "General"}

Platform Stats (current):
- Pending applications awaiting review: ${stats.pendingApps ?? 0}
- Active campaigns: ${stats.activeCampaigns ?? 0}
- Creators in pipeline: ${stats.pipelineTotal ?? 0}
- Shortlisted creators: ${stats.shortlisted ?? 0}
- Unread messages: ${stats.unreadMessages ?? 0}
- Creator recommendations available: ${stats.recommendationCount ?? 0}
- Best match score among recommendations: ${stats.topMatchScore ?? 0}%

Rules:
1. Each insight must reference a SPECIFIC number or fact from the stats above
2. Be specific and actionable — not generic
3. Never repeat themes across insights
4. Tone: executive, direct, no fluff
5. Keep each insight under 90 characters
6. Each insight must include a "link" key pointing to one of: pipeline, campaigns, create, matches, messages, find, chat

Return ONLY valid JSON with no surrounding text:
{
  "insights": [
    { "text": "...", "link": "pipeline", "category": "action" },
    { "text": "...", "link": "matches", "category": "match" },
    { "text": "...", "link": "messages", "category": "message" },
    { "text": "...", "link": "create", "category": "campaign" }
  ]
}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const body = await req.json();
    const { role, stats, context: ctx } = body as {
      role:    "creator" | "business";
      stats:   Record<string, unknown>;
      context: Record<string, unknown>;
    };

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const prompt = role === "creator"
      ? buildCreatorPrompt(stats, ctx)
      : buildBusinessPrompt(stats, ctx);

    const response = await fetch(ANTHROPIC_API_URL, {
      method:  "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const rawText = data.content[0]?.text?.trim() ?? "{}";

    // Parse the JSON from Claude
    let parsed: { insights: InsightItem[] } = { insights: [] };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback: return empty so UI falls back to static
    }

    // Map link keys to real URLs
    const linkMap = role === "creator" ? CREATOR_LINKS : BUSINESS_LINKS;
    const insights = (parsed.insights ?? []).map((ins) => ({
      text:     ins.text,
      link:     linkMap[ins.link] ?? (role === "creator" ? "/opportunities" : "/pipeline"),
      category: ins.category ?? "general",
    }));

    // Log to ai_requests fire-and-forget
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);
    db.from("ai_requests").insert({
      function_name: "generate-intelligence",
      model:         MODEL,
      prompt_tokens: 0,
      success:       true,
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ insights }), { headers: CORS });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg, insights: [] }), {
      status:  500,
      headers: CORS,
    });
  }
});
