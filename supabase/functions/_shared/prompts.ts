// ─────────────────────────────────────────────────────────────────────────────
// MRKT Prompt Library  v1
//
// All AI prompts for every MRKT feature live here.
// No prompts should be scattered across edge function files.
// Version this file when making significant prompt changes.
// ─────────────────────────────────────────────────────────────────────────────

export { MRKT_STRATEGIST, MRKT_ASSISTANT } from "./router.ts";

// ─── Calendar Intelligence ────────────────────────────────────────────────────

export interface CalendarIntelligenceCtx {
  region:          string;
  timezone:        string;
  dateStr:         string;   // "Monday, June 15, 2026"
  dayName:         string;
  month:           string;
  currentHour:     number;   // 0-23 local hour
  isWeekend:       boolean;
  peakEvening:     [number, number];
  peakMorning:     [number, number];
  peakMidday:      [number, number];
  bestDays:        string[];
  baselineScore:   number;   // 0-100
  niche:           string;
  platform:        string;
  role:            string;
  audienceLocation?: string;
}

export function calendarIntelligencePrompt(ctx: CalendarIntelligenceCtx): string {
  return `You are MRKT AI's posting intelligence engine for the MENA region.

Today: ${ctx.dateStr}, current local time: ${ctx.currentHour}:00 ${ctx.timezone}
Region: ${ctx.region}
${ctx.role === "creator" ? `Creator niche: ${ctx.niche}` : `Business industry: ${ctx.niche}`}
Primary platform: ${ctx.platform}
${ctx.audienceLocation ? `Audience location: ${ctx.audienceLocation}` : ""}
Regional peak windows:
- Morning: ${ctx.peakMorning[0]}:00–${ctx.peakMorning[1]}:00
- Midday: ${ctx.peakMidday[0]}:00–${ctx.peakMidday[1]}:00
- Evening: ${ctx.peakEvening[0]}:00–${ctx.peakEvening[1]}:00
Best days this week: ${ctx.bestDays.join(", ")}
Regional baseline engagement: ${ctx.baselineScore}/100
Today is ${ctx.isWeekend ? "a weekend (high engagement day)" : "a weekday"}.

Generate PRECISE posting intelligence. Rules:
- Times must be EXACT (e.g., "8:17 PM" not "8-9 PM"). Use non-round minutes — they signal data precision.
- Only suggest times that haven't passed yet (current hour: ${ctx.currentHour}:00)
- Confidence scoring: peak window alignment (+35), niche patterns (+25), day of week (+20), platform behavior (+20)
- #1 time: 85-95 confidence. #2: 5-10 lower. #3: 5-10 lower than #2.
- expected_reach_lift vs average: 90+ score → +25-35%, 85-89 → +18-24%, 80-84 → +10-17%
- Reasons must reference region, niche, and platform — no generic statements

Respond ONLY with valid JSON (no text before or after):
{
  "posting_intelligence": {
    "region": "${ctx.region}",
    "timezone": "${ctx.timezone}",
    "baseline_score": ${ctx.baselineScore},
    "top_times_today": [
      { "rank": 1, "time": "8:17 PM", "confidence": 92, "expected_reach_lift": 31, "format": "Reel", "reason": "2-sentence specific reason mentioning ${ctx.region} + ${ctx.niche}" },
      { "rank": 2, "time": "7:43 PM", "confidence": 87, "expected_reach_lift": 24, "format": "Story", "reason": "specific reason" },
      { "rank": 3, "time": "12:11 PM", "confidence": 81, "expected_reach_lift": 14, "format": "Carousel", "reason": "specific reason" }
    ],
    "best_day_this_week": { "day": "${ctx.bestDays[0]}", "time": "HH:MM AM/PM", "confidence": 89, "reason": "why this day" },
    "best_day_this_month": { "day": "${ctx.bestDays[0]}", "time": "HH:MM AM/PM", "confidence": 85, "reason": "why this day in ${ctx.month}" }
  },
  "recommendations": [
    { "title": "specific post idea", "why": "why now in ${ctx.region}", "format": "Reel|Carousel|Story|Static", "confidence": "high|medium", "emoji": "single emoji" }
  ],
  "trends": ["regional trend signal 1", "trend 2", "trend 3"]
}`;
}

// ─── Growth Advice ────────────────────────────────────────────────────────────

export interface GrowthAdviceCtx {
  role:    "creator" | "business";
  profile: Record<string, unknown>;
  stats:   Record<string, unknown>;
  dayName: string;
  month:   string;
  date:    number;
  year:    number;
}

export function growthAdvicePrompt(ctx: GrowthAdviceCtx): string {
  const today = `${ctx.dayName}, ${ctx.month} ${ctx.date}, ${ctx.year}`;

  if (ctx.role === "creator") {
    return `You are MRKT AI. Generate 5 personalized growth recommendations for this creator.

Today: ${today}
Creator profile: ${JSON.stringify(ctx.profile, null, 2)}
Current stats: ${JSON.stringify(ctx.stats, null, 2)}

Rules:
- Reference their actual data — no generic advice
- Each recommendation must be actionable today
- Specific to the MENA creator economy
- Available page links: /profile, /opportunities, /applications, /analytics, /content-planner, /chat, /studio, /globe

Respond ONLY with valid JSON:
{
  "advice": [
    {
      "title": "specific action-oriented title (5-8 words)",
      "why": "1-2 sentences: why this matters based on their actual data",
      "action": "short CTA text",
      "link": "/route",
      "priority": "high | medium | low",
      "emoji": "single emoji"
    }
  ]
}`;
  }

  return `You are MRKT AI. Generate 5 personalized growth recommendations for this business.

Today: ${today}
Business profile: ${JSON.stringify(ctx.profile, null, 2)}
Current stats: ${JSON.stringify(ctx.stats, null, 2)}

Rules:
- Reference their actual campaign/application data — no generic advice
- Each recommendation must be actionable today
- Specific to the MENA market
- Available page links: /profile, /campaigns, /campaign-create, /pipeline, /find-creators, /chat, /content-planner, /studio

Respond ONLY with valid JSON:
{
  "advice": [
    {
      "title": "specific action-oriented title (5-8 words)",
      "why": "1-2 sentences: why this matters based on their actual data",
      "action": "short CTA text",
      "link": "/route",
      "priority": "high | medium | low",
      "emoji": "single emoji"
    }
  ]
}`;
}

// ─── Outreach Generate ────────────────────────────────────────────────────────

export interface OutreachCtx {
  type:         "initial" | "followup" | "negotiation" | "proposal";
  creator:      { name: string; niche: string; followers: number; platforms: string[] };
  campaign:     { title: string; description: string; budget: string; platforms: string[] };
  businessName: string;
  context?:     string;
}

export function outreachGeneratePrompt(ctx: OutreachCtx): string {
  const followerStr = (ctx.creator.followers ?? 0).toLocaleString();
  const base =
`Brand: ${ctx.businessName}
Creator: ${ctx.creator.name} (${ctx.creator.niche}, ${followerStr} followers, ${ctx.creator.platforms?.join(", ") ?? "N/A"})
Campaign: ${ctx.campaign.title}
Budget: ${ctx.campaign.budget ?? "TBD"}
Brief: ${ctx.campaign.description ?? "Not provided"}${ctx.context ? `\nPrevious context: ${ctx.context}` : ""}`;

  const templates: Record<string, string> = {
    initial: `${base}

Write 3 outreach messages from ${ctx.businessName} to ${ctx.creator.name}. Each: professional but genuine, references something specific about the creator, clear about campaign and budget, 100-160 words.

Respond ONLY with valid JSON:
{"messages":[{"tone":"Professional","subject":"subject line","body":"message body"},{"tone":"Casual & Friendly","subject":"subject line","body":"message body"},{"tone":"Direct & Punchy","subject":"subject line","body":"message body"}]}`,

    followup: `${base}

Write 2 follow-up messages for a creator who hasn't responded. Brief (60-90 words), not pushy, adds urgency or new information.

Respond ONLY with valid JSON:
{"messages":[{"tone":"Gentle Reminder","subject":"subject line","body":"message body"},{"tone":"Deadline Urgency","subject":"subject line","body":"message body"}]}`,

    negotiation: `${base}

Write 2 negotiation responses: one flexible on budget, one holds firm but offers more creative control/exposure.

Respond ONLY with valid JSON:
{"messages":[{"tone":"Flexible Budget","subject":"subject line","body":"message body"},{"tone":"Added Value","subject":"subject line","body":"message body"}]}`,

    proposal: `${base}

Write a formal partnership proposal with scope, deliverables, timeline, compensation, and next steps. 200-300 words.

Respond ONLY with valid JSON:
{"messages":[{"tone":"Formal Proposal","subject":"Partnership Proposal: ${ctx.campaign.title}","body":"proposal text here"}]}`,
  };

  return templates[ctx.type] ?? templates.initial;
}

// ─── Content Concepts ─────────────────────────────────────────────────────────

export interface GenerateConceptsCtx {
  niche:    string;
  platform: string;
  goal?:    string;
  region?:  string;
}

export function generateConceptsPrompt(ctx: GenerateConceptsCtx): string {
  return `You are MRKT AI. Generate 6 content concepts for a ${ctx.niche} creator on ${ctx.platform}${ctx.region ? ` in ${ctx.region}` : " in the GCC"}.
${ctx.goal ? `Creator goal: ${ctx.goal}` : ""}

Respond ONLY with valid JSON:
{
  "concepts": [
    {
      "title": "content title",
      "hook": "opening line that stops the scroll",
      "format": "Reel | Carousel | Story | Tutorial",
      "angle": "unique take or perspective",
      "caption_starter": "first sentence of the caption"
    }
  ]
}`;
}
