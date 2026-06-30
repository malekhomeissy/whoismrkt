// ─────────────────────────────────────────────────────────────────────────────
// MRKT Founder Analytics
//
// Lightweight event tracking for internal product decisions.
// Uses PostHog when VITE_POSTHOG_KEY is set; silently no-ops otherwise.
// Never exposed to users. Used by founders to understand drop-off and usage.
//
// Usage:
//   import { track } from "@/lib/analytics";
//   track("creator_onboarding_completed", { step: 6 });
// ─────────────────────────────────────────────────────────────────────────────

const POSTHOG_KEY  = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined ?? "https://app.posthog.com";

// ─── Lazy PostHog loader ──────────────────────────────────────────────────────

type PH = {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

let _ph: PH | null = null;
let _initializing = false;

async function getPH(): Promise<PH | null> {
  if (!POSTHOG_KEY) return null;
  if (_ph) return _ph;
  if (_initializing) return null;
  _initializing = true;
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(POSTHOG_KEY, {
      api_host:         POSTHOG_HOST,
      capture_pageview: false,
      autocapture:      false,
      persistence:      "localStorage",
    });
    _ph = posthog as unknown as PH;
    return _ph;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function identify(userId: string, traits?: Record<string, unknown>) {
  const ph = await getPH();
  ph?.identify(userId, traits);
}

export async function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
) {
  const ph = await getPH();
  ph?.capture(event, properties);
}

export async function resetAnalytics() {
  const ph = await getPH();
  ph?.reset();
}

// ─── Event type catalogue ────────────────────────────────────────────────────
// Comprehensive list makes grepping and autocomplete reliable.

export type AnalyticsEvent =
  // ── Auth
  | "login"
  | "logout"
  // ── Creator journey
  | "creator_signup_started"
  | "creator_onboarding_step_completed"
  | "creator_onboarding_completed"
  | "creator_profile_updated"
  | "creator_instagram_connected"
  | "creator_first_ai_session_created"
  | "creator_opportunity_viewed"
  | "creator_application_submitted"
  | "creator_calendar_item_exported"
  | "creator_message_sent"
  | "creator_verification_started"
  | "creator_verification_completed"
  // ── Business journey
  | "business_signup_started"
  | "business_onboarding_completed"
  | "business_campaign_created"
  | "business_creator_viewed"
  | "business_creator_saved"
  | "business_application_reviewed"
  | "business_creator_pipeline_moved"
  | "business_message_sent"
  | "business_contract_created"
  | "business_deliverable_reviewed"
  // ── AI usage
  | "ai_session_started"
  | "ai_credit_used"
  | "ai_calendar_plan_generated"
  | "ai_profile_audit_generated"
  // ── Navigation & discovery
  | "dashboard_viewed"
  | "sidebar_item_clicked"
  | "pricing_viewed"
  | "globe_creator_clicked"
  | "globe_travel_plan_viewed"
  // ── Internationalisation
  | "language_switched"
  | "rtl_enabled"
  // ── Growth Hub
  | "growth_hub_action_clicked"
  | "growth_hub_ai_help_clicked";
