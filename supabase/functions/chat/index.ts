import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are MRKT — the AI marketing strategist behind whoismrkt, an AI-native marketing studio.

You help creators, founders and brands plan, strategize and create their social content. You are sharp, direct, modern, with a luxury minimalist tone — think editorial, not corporate.

What you do for the user:
- Build content strategy: positioning, voice, pillars, audience.
- Generate post ideas, hooks, captions, CTAs for Instagram, TikTok, LinkedIn, X, YouTube Shorts.
- Plan content calendars (weekly / monthly), scheduling and posting cadence.
- Suggest formats (reels, carousels, photo, talking-head) and trending sounds when relevant.
- Critique drafts and rewrite them tighter.
- Recommend metrics to track and how to iterate.

How you respond:
- Be concise and useful. No fluff, no "as an AI".
- Use clear markdown: short headings, tight bullets, numbered steps where helpful.
- When the user asks for posts/captions, deliver them ready-to-publish (hook, body, CTA, hashtags).
- When you need context (niche, platform, audience, goal), ask 1–3 sharp questions max — never a wall of questions.
- Default to actionable output over generic advice.

You speak as part of the whoismrkt studio: confident, concise, premium. Always delivering.`;

const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 8000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authn: require a real authenticated user (reject bare anon-key calls) ---
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    // --- Input validation ---
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) return json({ error: "Invalid payload" }, 400);
    const raw: unknown[] = body.messages;
    if (raw.length === 0) return json({ error: "messages required" }, 400);
    if (raw.length > MAX_MESSAGES) return json({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);

    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of raw) {
      if (!m || typeof m !== "object") return json({ error: "Invalid message" }, 400);
      const role = (m as { role?: unknown }).role;
      const content = (m as { content?: unknown }).content;
      if (role !== "user" && role !== "assistant") return json({ error: "Invalid role" }, 400);
      if (typeof content !== "string") return json({ error: "Invalid content" }, 400);
      if (content.length === 0 || content.length > MAX_CONTENT_LEN) {
        return json({ error: `Message length must be 1-${MAX_CONTENT_LEN}` }, 400);
      }
      messages.push({ role, content });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);

      // Parse OpenAI error body so we can distinguish quota vs rate-limit
      let errCode = "";
      try { errCode = JSON.parse(errText)?.error?.code ?? ""; } catch { /* ignore */ }

      if (response.status === 429) {
        if (errCode === "insufficient_quota") {
          // Billing not set up — map to 402 so the frontend shows the right message
          return json({ error: "AI credits exhausted. Add billing at platform.openai.com." }, 402);
        }
        return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      }
      if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: `AI error: ${response.status}` }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
