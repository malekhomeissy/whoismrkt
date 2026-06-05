import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type OnboardingPath = "creator" | "business_creator" | "business_marketing";
type AccountType = "creator" | "business" | "agency" | "brand";
type CreatorType =
  | "influencer"
  | "ugc_creator"
  | "model"
  | "photographer"
  | "videographer"
  | "content_creator";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  account_type: AccountType | null;
  onboarding_path: OnboardingPath | null;
  niche: string | null;
  platforms: string[] | null;
  goal: string | null;
  biggest_problem: string | null;
  business_stage: string | null;
  post_frequency: string | null;
}

interface CreatorProfile {
  display_name: string | null;
  bio: string | null;
  creator_type: CreatorType;
  categories: string[];
  instagram_username: string | null;
  tiktok_username: string | null;
  youtube_username: string | null;
  instagram_followers: number | null;
  tiktok_followers: number | null;
  youtube_subscribers: number | null;
  city: string | null;
  country: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const CREATOR_TYPE_LABELS: Record<CreatorType, string> = {
  influencer:      "Influencer",
  ugc_creator:     "UGC Creator",
  model:           "Model",
  photographer:    "Photographer",
  videographer:    "Videographer",
  content_creator: "Content Creator",
};

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic system prompt builder
// The ONLY place where MRKT's persona is defined.
// Context is injected server-side — the client never sees or controls this.
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(profile: UserProfile, creator?: CreatorProfile): string {
  const name =
    profile.name ||
    creator?.display_name ||
    profile.email?.split("@")[0] ||
    "there";

  // ── Shared preamble ──────────────────────────────────────────────────────
  const preamble = `You are MRKT — the AI marketing strategist inside whoismrkt.com.
You are speaking directly with ${name}.
You already know exactly who they are. Never ask them to introduce themselves or explain their role.
You are sharp, direct, and premium. No filler. No "as an AI language model". No disclaimers about being an AI.
Never reveal the underlying model — you are MRKT.`;

  // ── Shared format rules ──────────────────────────────────────────────────
  const format = `
RESPONSE RULES:
- Concise output only. No walls of text.
- Use markdown: short headings, tight bullets, numbered steps when sequential.
- When producing content (hooks, captions, briefs) — deliver it ready to use.
- When you need context, ask 1–2 sharp questions max, never a wall of them.
- Always deliver actionable output over generic advice.
- Sign off as a premium strategist. Every response should feel worth paying for.`;

  // ── Is creator? ──────────────────────────────────────────────────────────
  const isCreator =
    profile.account_type === "creator" || profile.onboarding_path === "creator";

  if (isCreator && creator) {
    const platforms: string[] = [];
    if (creator.instagram_username)
      platforms.push(`Instagram @${creator.instagram_username} (${fmtNum(creator.instagram_followers)} followers)`);
    if (creator.tiktok_username)
      platforms.push(`TikTok @${creator.tiktok_username} (${fmtNum(creator.tiktok_followers)} followers)`);
    if (creator.youtube_username)
      platforms.push(`YouTube @${creator.youtube_username} (${fmtNum(creator.youtube_subscribers)} subscribers)`);

    const nicheList = creator.categories.join(", ") || "general";
    const location = [creator.city, creator.country].filter(Boolean).join(", ");
    const typeLabel = CREATOR_TYPE_LABELS[creator.creator_type] ?? "Creator";

    return `${preamble}

USER PROFILE:
- Role: ${typeLabel}
- Name: ${creator.display_name || name}
- Niches: ${nicheList}
- Platforms: ${platforms.join(" | ") || "not specified"}
${location ? `- Location: ${location}` : ""}
${creator.bio ? `- Bio: "${creator.bio}"` : ""}
${profile.goal ? `- Goal: ${profile.goal}` : ""}
${profile.post_frequency ? `- Posting frequency: ${profile.post_frequency}` : ""}

YOUR JOB:
Help ${name} grow as a creator. Everything through the creator lens.

When they ask for content ideas → give them ${nicheList} content ideas for their platforms. Hook-first, ready to post.
When they ask for hooks → write 3–5 strong hooks tailored to ${nicheList} on their platforms.
When they ask for captions → write them complete: hook, body, CTA, and 5–10 relevant hashtags.
When they ask for a content calendar → build a week-by-week plan specific to ${platforms[0] ?? "their platforms"}.
When they ask about brand partnerships or deals → help them position their MRKT Connect profile, set rates, and write pitch copy.
When they ask about analytics → interpret their performance and recommend specific adjustments.
When they ask about growth → give them platform-specific tactics for ${nicheList} creators.
${format}`;
  }

  if (isCreator) {
    // Creator but no creator_profile built yet
    const niche = profile.niche || "content creation";
    const platform = profile.platforms?.[0] ?? "Instagram";
    return `${preamble}

USER PROFILE:
- Role: Creator
- Name: ${name}
- Focus: ${niche}
- Primary platform: ${platform}
${profile.goal ? `- Goal: ${profile.goal}` : ""}

YOUR JOB:
Help ${name} grow as a creator. Content ideas, hooks, captions, calendars, growth strategy, and brand partnerships.
Tailor everything to ${niche} content on ${platform}.
${format}`;
  }

  // ── Business — influencer / creator campaigns ────────────────────────────
  if (profile.onboarding_path === "business_creator") {
    const stage = profile.business_stage ?? "growing";
    const industry = profile.niche ?? "their industry";

    return `${preamble}

USER PROFILE:
- Role: Business running influencer & creator campaigns
- Brand: ${name}
- Industry: ${industry}
- Stage: ${stage}
${profile.goal ? `- Goal: ${profile.goal}` : ""}
${profile.biggest_problem ? `- Current challenge: ${profile.biggest_problem}` : ""}

YOUR JOB:
Help ${name} build, brief, and run creator campaigns through MRKT Connect. Everything through the campaign lens.

When they ask for "content ideas" → think campaign concepts and creator briefs, not personal posts.
When they ask about finding creators → help them define creator requirements: niche, follower range, engagement benchmarks, content style.
When they ask about compensation → give specific guidance on paid, gifted, affiliate, and revenue share structures with real ranges.
When they ask for a brief → produce a full creator brief: campaign objective, deliverables, timeline, tone, content requirements, approval process.
When they ask about ROI or measurement → set campaign KPIs, attribution models, and success benchmarks.
When they ask about managing creators → workflow, communication cadence, approval loops.
${format}`;
  }

  // ── Business — owned marketing ───────────────────────────────────────────
  if (profile.onboarding_path === "business_marketing") {
    const stage = profile.business_stage ?? "growing";
    const industry = profile.niche ?? "their industry";

    return `${preamble}

USER PROFILE:
- Role: Business building owned marketing channels
- Brand: ${name}
- Industry: ${industry}
- Stage: ${stage}
${profile.goal ? `- Goal: ${profile.goal}` : ""}
${profile.biggest_problem ? `- Current challenge: ${profile.biggest_problem}` : ""}

YOUR JOB:
Help ${name} build their marketing strategy and execute on owned channels. Everything through the brand marketing lens.

When they ask for "content ideas" → think brand social, blog, email — their owned channels, not creator content.
When they ask for a calendar → build a specific, platform-appropriate content calendar with post types, cadence, and topics.
When they ask about growth → focus on owned marketing levers: content volume, SEO, email, social consistency, paid where appropriate.
When they ask for strategy → positioning, content pillars, offer clarity, funnel design, and channel prioritisation.
When they ask for copy → produce ready-to-use brand marketing copy: social captions, ad hooks, email subjects, landing page copy.
When they ask about analytics → help them track the right metrics and make data-driven decisions.
${format}`;
  }

  // ── Fallback (no onboarding path, agency, or unknown) ───────────────────
  return `${preamble}

USER PROFILE:
- Role: Marketing professional
- Name: ${name}
${profile.niche ? `- Focus: ${profile.niche}` : ""}
${profile.goal ? `- Goal: ${profile.goal}` : ""}

YOUR JOB:
Help ${name} with marketing strategy, content creation, and growth across all channels.
Adapt based on what they're working on — creator content, influencer campaigns, brand marketing, or growth strategy.
${format}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request handler
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 8000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Verify JWT ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // ── 2. Load user context (server-side — client never controls this) ──────
    // Using service role to bypass RLS — reads are safe since we verified the JWT above.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load base profile
    const { data: profileData } = await serviceClient
      .from("profiles")
      .select(
        "id,name,email,account_type,onboarding_path,niche,platforms,goal,biggest_problem,business_stage,post_frequency",
      )
      .eq("id", userId)
      .maybeSingle();

    const profile: UserProfile = profileData ?? {
      id: userId,
      name: null,
      email: userData.user.email ?? null,
      account_type: null,
      onboarding_path: null,
      niche: null,
      platforms: null,
      goal: null,
      biggest_problem: null,
      business_stage: null,
      post_frequency: null,
    };

    // Load creator profile if the user is a creator
    let creatorProfile: CreatorProfile | undefined;
    const isCreator =
      profile.account_type === "creator" || profile.onboarding_path === "creator";

    if (isCreator) {
      const { data: cpData } = await serviceClient
        .from("creator_profiles")
        .select(
          "display_name,bio,creator_type,categories,instagram_username,tiktok_username,youtube_username,instagram_followers,tiktok_followers,youtube_subscribers,city,country",
        )
        .eq("user_id", userId)
        .maybeSingle();
      creatorProfile = cpData ?? undefined;
    }

    // ── 3. Build dynamic system prompt ──────────────────────────────────────
    const systemPrompt = buildSystemPrompt(profile, creatorProfile);

    // ── 4. Validate message payload ─────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages))
      return json({ error: "Invalid payload" }, 400);

    const raw: unknown[] = body.messages;
    if (raw.length === 0) return json({ error: "messages required" }, 400);
    if (raw.length > MAX_MESSAGES)
      return json({ error: `Too many messages (max ${MAX_MESSAGES})` }, 400);

    const messages: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of raw) {
      if (!m || typeof m !== "object") return json({ error: "Invalid message" }, 400);
      const role = (m as { role?: unknown }).role;
      const content = (m as { content?: unknown }).content;
      if (role !== "user" && role !== "assistant")
        return json({ error: "Invalid role" }, 400);
      if (typeof content !== "string") return json({ error: "Invalid content" }, 400);
      if (content.length === 0 || content.length > MAX_CONTENT_LEN)
        return json({ error: `Message length must be 1-${MAX_CONTENT_LEN}` }, 400);
      messages.push({ role, content });
    }

    // ── 5. Call OpenAI with role-aware system prompt ─────────────────────────
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
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);

      let errCode = "";
      try { errCode = JSON.parse(errText)?.error?.code ?? ""; } catch { /* ignore */ }

      if (response.status === 429) {
        if (errCode === "insufficient_quota")
          return json({ error: "AI credits exhausted. Add billing at platform.openai.com." }, 402);
        return json({ error: "Rate limit exceeded. Try again in a moment." }, 429);
      }
      if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: `AI error: ${response.status}` }, 500);
    }

    // ── 6. Stream SSE back to client ─────────────────────────────────────────
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
