// ─────────────────────────────────────────────────────────────────────────────
// MRKT Edge Function Security Middleware
//
// Provides: rate limiting, CORS whitelist, input sanitization, auth helpers.
// Import into every edge function that handles authenticated user requests.
// ─────────────────────────────────────────────────────────────────────────────

// ── Allowed origins ──────────────────────────────────────────────────────────
// Update when new domains are added (e.g. mobile deep-links, new TLDs).

const ALLOWED_ORIGINS = new Set([
  "https://usemrkt.app",
  "https://www.usemrkt.app",
  // Supabase Studio — needed for direct function testing in dashboard
  "https://supabase.com",
  "https://app.supabase.com",
]);

// Return the appropriate CORS origin header value.
// Reflects the actual request origin if allowlisted; rejects others.
export function corsOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  // Default to the production domain if the origin is unknown/missing
  return "https://usemrkt.app";
}

export function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":  corsOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary":                         "Origin",
  };
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Simple sliding-window counter per (userId, endpoint).
// Resets when the Deno isolate is recycled (edge function cold start).
// For hard rate limiting at scale, use Cloudflare WAF rules.

interface RateEntry { count: number; windowStart: number }
const _rateMap = new Map<string, RateEntry>();

export interface RateLimitConfig {
  /** Max calls allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// Conservative defaults: 30 AI requests/minute per user.
export const DEFAULT_AI_RATE: RateLimitConfig  = { maxRequests: 30,  windowMs: 60_000 };
// Tighter limit for expensive or slow endpoints.
export const STRICT_AI_RATE: RateLimitConfig   = { maxRequests: 10,  windowMs: 60_000 };
// General API endpoints.
export const DEFAULT_API_RATE: RateLimitConfig = { maxRequests: 120, windowMs: 60_000 };

/**
 * Returns true if the caller should be rate-limited (request rejected).
 * key = userId + ":" + endpointName
 */
export function isRateLimited(key: string, cfg: RateLimitConfig = DEFAULT_API_RATE): boolean {
  const now   = Date.now();
  const entry = _rateMap.get(key);

  if (!entry || now - entry.windowStart > cfg.windowMs) {
    _rateMap.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > cfg.maxRequests) return true;
  return false;
}

// ── Input sanitization ────────────────────────────────────────────────────────

const MAX_STRING_LENGTH = 8_000; // 8 kB — hard cap on any single string field

/**
 * Strip null bytes and truncate strings to prevent oversized payloads being
 * injected into AI prompts or stored in the database.
 */
export function sanitizeString(value: unknown, maxLength = MAX_STRING_LENGTH): string {
  if (typeof value !== "string") return "";
  return value.replace(/\0/g, "").slice(0, maxLength);
}

/**
 * Sanitize an array of strings.  Returns at most `maxItems` entries.
 */
export function sanitizeStringArray(
  value: unknown,
  maxItems = 20,
  maxLength = 500,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((v) => sanitizeString(v, maxLength))
    .filter(Boolean);
}

/**
 * Prevent prompt injection by stripping instruction-like patterns before
 * user-controlled text is injected into AI prompts.
 *
 * This is a best-effort mitigation — defence-in-depth alongside the system
 * prompt instructions already in router.ts.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+instructions?/gi,
  /you\s+are\s+(now|a|an)\s+/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /###\s*(system|instruction|prompt)/gi,
  /<\|im_start\|>/gi,
  /<\|system\|>/gi,
];

export function sanitizeForPrompt(value: string): string {
  let s = sanitizeString(value);
  for (const pat of INJECTION_PATTERNS) {
    s = s.replace(pat, "[filtered]");
  }
  return s;
}

// ── Auth helper ───────────────────────────────────────────────────────────────

/**
 * Validate a Bearer token from the Authorization header.
 * Returns { user } on success or throws with a 401 response.
 */
export async function requireAuth(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ id: string; email?: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new AuthError("Missing Authorization header");

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new AuthError("Invalid or expired token");

  return user as { id: string; email?: string };
}

export class AuthError extends Error {
  constructor(msg: string) { super(msg); this.name = "AuthError"; }
}

/**
 * Restrict an internal/cron-only function to callers presenting the project's
 * service-role key as their bearer token. These functions (metrics rollups,
 * scheduled score recomputation) have no legitimate end-user caller — they
 * previously had no auth check at all, letting any logged-in user trigger
 * them for arbitrary user_ids (IDOR). Supabase's own cron/dashboard "Run"
 * invocations authenticate with the service-role key, so this doesn't break
 * legitimate scheduled/manual admin runs.
 */
export function requireServiceRole(req: Request): void {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || token !== serviceKey) {
    throw new AuthError("This endpoint is internal-only.");
  }
}

// ── Standard JSON responses ───────────────────────────────────────────────────

export function jsonOk(body: unknown, req: Request, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function jsonErr(msg: string, req: Request, status = 400): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
