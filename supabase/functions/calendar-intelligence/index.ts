// ─────────────────────────────────────────────────────────────────────────────
// calendar-intelligence  (v3 — MRKT AI Router)
//
// Precision posting intelligence for MENA creators and businesses.
// Routes through MRKT AI Router: OpenAI → Anthropic fallback.
//
// POST body:
//   role              "creator" | "business"
//   niche             string
//   platforms         string[]
//   location          string
//   audience_location string
//   industry          string
//   categories        string[]
//   account_type      string
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { callAI }                    from "../_shared/router.ts";
import { calendarIntelligencePrompt } from "../_shared/prompts.ts";


// ── Regional audience behavior data ──────────────────────────────────────────
//
// Peak engagement windows per MENA region, derived from social research.
// Used as grounding constraints for the AI to pick precise minutes within.

const REGIONAL_DATA: Record<string, {
  peak_evening:   [number, number];
  peak_morning:   [number, number];
  peak_midday:    [number, number];
  timezone:       string;
  weekend:        string;
  best_days:      string[];
  baseline_score: number;
}> = {
  UAE: {
    peak_evening:  [19, 22], peak_morning: [7, 9], peak_midday: [12, 14],
    timezone: "GST (UTC+4)", weekend: "Fri–Sat",
    best_days: ["Monday", "Thursday", "Sunday"], baseline_score: 63,
  },
  "Saudi Arabia": {
    peak_evening:  [20, 23], peak_morning: [8, 10], peak_midday: [13, 15],
    timezone: "AST (UTC+3)", weekend: "Fri–Sat",
    best_days: ["Monday", "Wednesday", "Sunday"], baseline_score: 61,
  },
  Lebanon: {
    peak_evening:  [19, 22], peak_morning: [8, 10], peak_midday: [12, 14],
    timezone: "EET (UTC+3)", weekend: "Sat–Sun",
    best_days: ["Tuesday", "Thursday", "Saturday"], baseline_score: 58,
  },
  Egypt: {
    peak_evening:  [20, 23], peak_morning: [9, 11], peak_midday: [13, 15],
    timezone: "EET (UTC+2)", weekend: "Fri–Sat",
    best_days: ["Monday", "Wednesday", "Saturday"], baseline_score: 60,
  },
  Jordan: {
    peak_evening:  [19, 22], peak_morning: [9, 11], peak_midday: [12, 14],
    timezone: "EET (UTC+3)", weekend: "Fri–Sat",
    best_days: ["Monday", "Thursday", "Saturday"], baseline_score: 57,
  },
  Qatar: {
    peak_evening:  [19, 22], peak_morning: [7, 9], peak_midday: [12, 14],
    timezone: "AST (UTC+3)", weekend: "Fri–Sat",
    best_days: ["Tuesday", "Thursday", "Sunday"], baseline_score: 62,
  },
  Kuwait: {
    peak_evening:  [20, 23], peak_morning: [8, 10], peak_midday: [13, 15],
    timezone: "AST (UTC+3)", weekend: "Fri–Sat",
    best_days: ["Monday", "Wednesday", "Sunday"], baseline_score: 60,
  },
  Bahrain: {
    peak_evening:  [19, 22], peak_morning: [7, 9], peak_midday: [12, 14],
    timezone: "AST (UTC+3)", weekend: "Fri–Sat",
    best_days: ["Monday", "Thursday", "Sunday"], baseline_score: 59,
  },
};

function detectRegion(location: string): string {
  const loc = location.toLowerCase();
  if (loc.includes("uae") || loc.includes("dubai") || loc.includes("abu dhabi") || loc.includes("sharjah")) return "UAE";
  if (loc.includes("saudi") || loc.includes("riyadh") || loc.includes("jeddah") || loc.includes("ksa")) return "Saudi Arabia";
  if (loc.includes("lebanon") || loc.includes("beirut")) return "Lebanon";
  if (loc.includes("egypt") || loc.includes("cairo") || loc.includes("alexandria")) return "Egypt";
  if (loc.includes("jordan") || loc.includes("amman")) return "Jordan";
  if (loc.includes("qatar") || loc.includes("doha")) return "Qatar";
  if (loc.includes("kuwait")) return "Kuwait";
  if (loc.includes("bahrain")) return "Bahrain";
  return "UAE";
}

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

    const body = await req.json() as {
      role?: string; niche?: string; platforms?: string[]; location?: string;
      audience_location?: string; industry?: string; categories?: string[]; account_type?: string;
    };

    const location = body.location ?? body.audience_location ?? "";
    const region   = detectRegion(location);
    const rd       = REGIONAL_DATA[region] ?? REGIONAL_DATA["UAE"];

    const now     = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const month   = now.toLocaleDateString("en-US", { month: "long" });
    const dateStr = `${dayName}, ${month} ${now.getDate()}, ${now.getFullYear()}`;

    const prompt = calendarIntelligencePrompt({
      region,
      timezone:        rd.timezone,
      dateStr,
      dayName,
      month,
      currentHour:     now.getHours(),
      isWeekend:       [5, 6].includes(now.getDay()),
      peakEvening:     rd.peak_evening,
      peakMorning:     rd.peak_morning,
      peakMidday:      rd.peak_midday,
      bestDays:        rd.best_days,
      baselineScore:   rd.baseline_score,
      niche:           (body.niche ?? body.industry ?? "Lifestyle") as string,
      platform:        (body.platforms?.[0] ?? "Instagram") as string,
      role:            body.role ?? "creator",
      audienceLocation: body.audience_location,
    });

    const result = await callAI({
      feature:  "calendar_intelligence",
      messages: [{ role: "user", content: prompt }],
      userId:   user.id,
      supabase,
    });

    let parsed: Record<string, unknown> = {};
    try {
      const match = result.content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      console.error("JSON parse error:", result.content.slice(0, 300));
    }

    const pi = parsed.posting_intelligence as Record<string, unknown> | undefined;

    return respond({
      posting_intelligence: pi && Array.isArray(pi.top_times_today) && pi.top_times_today.length > 0
        ? pi
        : {
            region,
            timezone:            rd.timezone,
            baseline_score:      rd.baseline_score,
            top_times_today:     [],
            best_day_this_week:  null,
            best_day_this_month: null,
          },
      recommendations: (parsed.recommendations as unknown[]) ?? [],
      trends:          (parsed.trends as string[]) ?? [],
    });

  } catch (err) {
    console.error("calendar-intelligence error:", err);
    return respond({ error: "Internal error" }, 500);
  }
});
