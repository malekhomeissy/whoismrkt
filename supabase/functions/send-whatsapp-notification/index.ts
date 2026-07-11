import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth, AuthError, isRateLimited, DEFAULT_API_RATE, sanitizeStringArray } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


type WhatsAppTemplateType =
  | "new_application"
  | "new_message"
  | "contract_sent"
  | "deliverable_approved"
  | "weekly_report_ready";

interface WhatsAppRequest {
  user_id: string;
  template_type: WhatsAppTemplateType;
  parameters: string[];  // ordered list matching template variable slots
}

// ── Template definitions ────────────────────────────────────────────────────
// These must exactly match approved templates in your WhatsApp Business account.
// Template names use snake_case as registered with Meta.

const TEMPLATE_NAMES: Record<WhatsAppTemplateType, string> = {
  new_application:      "mrkt_new_application",
  new_message:          "mrkt_new_message",
  contract_sent:        "mrkt_contract_sent",
  deliverable_approved: "mrkt_deliverable_approved",
  weekly_report_ready:  "mrkt_weekly_report",
};

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  // Graceful failure if not configured
  const accessToken   = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken || !phoneNumberId) {
    console.warn("send-whatsapp-notification: WhatsApp not configured, skipping");
    return new Response(
      JSON.stringify({ skipped: true, reason: "WhatsApp not configured" }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require a logged-in caller — this endpoint previously had no auth check
    // at all, letting anyone relay WhatsApp messages to any user_id at MRKT's
    // (Meta Business API) expense.
    const caller = await requireAuth(req, supabase);
    if (isRateLimited(`send-whatsapp-notification:${caller.id}`, DEFAULT_API_RATE)) {
      return new Response(
        JSON.stringify({ error: "Too many notification requests. Please slow down." }),
        { status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const body: WhatsAppRequest = await req.json();
    const { user_id, template_type, parameters: rawParameters } = body;
    const parameters = sanitizeStringArray(rawParameters, 10, 300);

    if (!user_id || !template_type) {
      return new Response(
        JSON.stringify({ error: "user_id and template_type required" }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Relationship check: the caller may only notify a user they share a
    // contract, campaign application, conversation, or deliverable with —
    // closes the IDOR that let any authenticated user WhatsApp-relay anyone
    // (and burn MRKT's paid Meta Business API budget doing it).
    const { data: related, error: relErr } = await supabase.rpc("users_have_relationship", {
      p_a: caller.id,
      p_b: user_id,
    });
    if (relErr || !related) {
      return new Response(
        JSON.stringify({ error: "Not authorized to notify this user" }),
        { status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("whatsapp_enabled")
      .eq("user_id", user_id)
      .single();

    if (!prefs?.whatsapp_enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "WhatsApp disabled by user" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Get user's WhatsApp number
    const { data: profile } = await supabase
      .from("profiles")
      .select("whatsapp_number")
      .eq("id", user_id)
      .single();

    if (!profile?.whatsapp_number) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No WhatsApp number on file" }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Normalise phone number (ensure E.164 format)
    let phone = profile.whatsapp_number.replace(/\s+/g, "").replace(/[^+\d]/g, "");
    if (!phone.startsWith("+")) {
      // Default to UAE (+971) if no country code
      phone = "+971" + phone.replace(/^0/, "");
    }

    const templateName = TEMPLATE_NAMES[template_type];
    if (!templateName) {
      return new Response(
        JSON.stringify({ error: `Unknown template type: ${template_type}` }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Build template components
    const components: unknown[] = [];
    if (parameters.length > 0) {
      components.push({
        type: "body",
        parameters: parameters.map(p => ({ type: "text", text: p })),
      });
    }

    // Send via Meta Graph API v17.0
    const metaRes = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en_US" },
            components,
          },
        }),
      },
    );

    if (!metaRes.ok) {
      const errData = await metaRes.text();
      console.error("WhatsApp API error:", errData);
      // Graceful failure — don't break the calling action
      return new Response(
        JSON.stringify({ sent: false, error: "WhatsApp delivery failed", detail: errData }),
        { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const metaData = await metaRes.json();
    return new Response(
      JSON.stringify({ sent: true, message_id: metaData.messages?.[0]?.id }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );

  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    console.error("send-whatsapp-notification error:", err);
    // Always graceful — notification failure must never break user actions
    return new Response(
      JSON.stringify({ sent: false, error: "Internal error, notification skipped" }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
