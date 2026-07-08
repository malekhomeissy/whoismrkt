import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth, AuthError, isRateLimited, DEFAULT_API_RATE, sanitizeString } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ─────────────────────────────────────────────────────────────────────────────
// send-push-notification
//
// Sends a push notification via Expo's push API to a user's registered
// device (profiles.expo_push_token, written by MRKTmobile's
// usePushNotifications hook). This is the piece that was missing: the mobile
// app registers a real token, but until this function existed nothing ever
// sent anything to it.
//
// Mirrors send-email-notification / send-whatsapp-notification: same auth +
// rate-limit + notification_preferences gating, same category map, same
// "never break the calling action" graceful-failure contract.
// ─────────────────────────────────────────────────────────────────────────────

type NotificationType =
  | "new_application_status"
  | "application_shortlisted"
  | "application_accepted"
  | "application_rejected"
  | "new_message"
  | "contract_sent"
  | "deliverable_approved"
  | "revision_requested"
  | "weekly_report_ready"
  | "new_application_received"
  | "contract_accepted"
  | "deliverable_submitted"
  | "business_weekly_report_ready";

interface PushRequest {
  user_id: string;
  notification_type: NotificationType;
  data: Record<string, string | number | boolean | null>;
}

function buildPushContent(
  type: NotificationType,
  data: Record<string, unknown>,
): { title: string; body: string } {
  const s = (v: unknown, fallback = "") => (v != null ? String(v) : fallback);
  switch (type) {
    case "new_application_status":
      return { title: "Application update", body: `Update on your application for ${s(data.campaign_title, "a campaign")}.` };
    case "application_shortlisted":
      return { title: "You've been shortlisted!", body: `${s(data.campaign_title, "A campaign")} shortlisted you.` };
    case "application_accepted":
      return { title: "You got the gig 🎉", body: `You were selected for ${s(data.campaign_title, "a campaign")}.` };
    case "application_rejected":
      return { title: "Application update", body: `Update on your application for ${s(data.campaign_title, "a campaign")}.` };
    case "new_message":
      return { title: `New message from ${s(data.sender_name, "someone")}`, body: s(data.preview, "Tap to read.") };
    case "contract_sent":
      return { title: "Contract ready to sign", body: `A contract is waiting for ${s(data.campaign_title, "your campaign")}.` };
    case "deliverable_approved":
      return { title: "Deliverable approved", body: `Your deliverable for ${s(data.campaign_title, "a campaign")} was approved.` };
    case "revision_requested":
      return { title: "Revision requested", body: `A revision was requested for ${s(data.campaign_title, "a campaign")}.` };
    case "weekly_report_ready":
      return { title: "Your weekly report is ready", body: "See how your visibility changed this week." };
    case "new_application_received":
      return { title: "New application", body: `${s(data.creator_name, "A creator")} applied to ${s(data.campaign_title, "your campaign")}.` };
    case "contract_accepted":
      return { title: "Contract accepted", body: `${s(data.creator_name, "The creator")} accepted your contract for ${s(data.campaign_title, "a campaign")}.` };
    case "deliverable_submitted":
      return { title: "Deliverable submitted", body: `${s(data.creator_name, "A creator")} submitted a deliverable for ${s(data.campaign_title, "a campaign")}.` };
    case "business_weekly_report_ready":
      return { title: "Your weekly business report is ready", body: "See this week's campaign activity." };
    default:
      return { title: "MRKT", body: "You have a new notification." };
  }
}

// Category gating reuses the same notification_preferences columns email/WhatsApp already check.
const CATEGORY_MAP: Record<NotificationType, keyof NotificationPrefsRow> = {
  new_application_status:      "campaign_updates",
  application_shortlisted:     "campaign_updates",
  application_accepted:        "campaign_updates",
  application_rejected:        "campaign_updates",
  new_application_received:    "campaign_updates",
  new_message:                 "messages",
  contract_sent:                "contracts",
  contract_accepted:            "contracts",
  deliverable_submitted:        "deliverables",
  deliverable_approved:         "deliverables",
  revision_requested:           "deliverables",
  weekly_report_ready:          "weekly_reports",
  business_weekly_report_ready: "weekly_reports",
};

interface NotificationPrefsRow {
  push_enabled: boolean;
  campaign_updates: boolean;
  messages: boolean;
  contracts: boolean;
  deliverables: boolean;
  weekly_reports: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Same relay-abuse concern as send-email/send-whatsapp-notification: at
    // minimum require a logged-in caller and rate-limit them. Full
    // relationship verification (caller actually triggered this event) is a
    // deeper fix tracked separately.
    const caller = await requireAuth(req, supabase);
    if (isRateLimited(`send-push-notification:${caller.id}`, DEFAULT_API_RATE)) {
      return new Response(JSON.stringify({ error: "Too many notification requests. Please slow down." }), {
        status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body: PushRequest = await req.json();
    const { user_id, notification_type, data: rawData } = body;

    if (!user_id || !notification_type) {
      return new Response(JSON.stringify({ error: "user_id and notification_type required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Sanitize free-text fields before they land in a push payload.
    const data: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(rawData ?? {})) {
      data[key] = typeof value === "string" ? sanitizeString(value, 200) : value;
    }

    let prefs = (await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single()).data as NotificationPrefsRow | null;

    if (!prefs) {
      const { data: created } = await supabase
        .from("notification_preferences")
        .insert({ user_id })
        .select()
        .single();
      prefs = created as NotificationPrefsRow | null;
    }

    if (!prefs?.push_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "push disabled by user" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const categoryKey = CATEGORY_MAP[notification_type];
    if (categoryKey && prefs[categoryKey] === false) {
      return new Response(JSON.stringify({ skipped: true, reason: `category ${categoryKey} disabled` }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", user_id)
      .single();

    const token = profile?.expo_push_token;
    if (!token) {
      return new Response(JSON.stringify({ skipped: true, reason: "no push token on file" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { title, body: pushBody } = buildPushContent(notification_type, data);

    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body: pushBody,
        sound: "default",
        data: { notification_type, ...data },
      }),
    });

    if (!expoRes.ok) {
      const errText = await expoRes.text();
      console.error("Expo push error:", errText);
      // Graceful — a failed push must never break the calling action.
      return new Response(JSON.stringify({ sent: false, error: "push delivery failed" }), {
        status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const expoData = await expoRes.json();
    return new Response(JSON.stringify({ sent: true, receipt: expoData?.data ?? null }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    console.error("send-push-notification error:", err);
    // Always graceful — notification failure must never break user actions.
    return new Response(JSON.stringify({ sent: false, error: "Internal error, notification skipped" }), {
      status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
