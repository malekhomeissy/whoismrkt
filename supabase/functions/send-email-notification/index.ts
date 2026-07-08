import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAuth, AuthError, isRateLimited, DEFAULT_API_RATE, sanitizeString } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Escape HTML metacharacters before interpolating any user/DB-sourced string
// into the email template — data.preview, campaign_title, sender_name etc.
// were previously inserted raw, allowing HTML injection into outbound emails.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sanitize + HTML-escape every string field in the notification payload before
// it's interpolated into the email. Numbers/booleans/null pass through as-is.
function sanitizeDataRecord(
  data: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    out[key] = typeof value === "string" ? escapeHtml(sanitizeString(value, 500)) : value;
  }
  return out;
}


type NotificationType =
  // creator-facing
  | "new_application_status"
  | "application_shortlisted"
  | "application_accepted"
  | "application_rejected"
  | "new_message"
  | "contract_sent"
  | "deliverable_approved"
  | "revision_requested"
  | "weekly_report_ready"
  // business-facing
  | "new_application_received"
  | "contract_accepted"
  | "deliverable_submitted"
  | "business_weekly_report_ready";

interface EmailRequest {
  user_id: string;
  notification_type: NotificationType;
  data: Record<string, string | number | boolean | null>;
}

// ── Email templates ─────────────────────────────────────────────────────────

function buildSubject(type: NotificationType, data: Record<string, unknown>): string {
  const subjects: Record<NotificationType, string> = {
    new_application_status:    `Application update — ${data.campaign_title ?? "your campaign"}`,
    application_shortlisted:   `You've been shortlisted for ${data.campaign_title ?? "a campaign"}`,
    application_accepted:      `Congratulations — you were selected for ${data.campaign_title ?? "a campaign"}`,
    application_rejected:      `Application update for ${data.campaign_title ?? "a campaign"}`,
    new_message:               `New message from ${data.sender_name ?? "MRKT"}`,
    contract_sent:             `Contract ready — ${data.campaign_title ?? "campaign"}`,
    deliverable_approved:      `Deliverable approved — ${data.campaign_title ?? "campaign"}`,
    revision_requested:        `Revision requested — ${data.campaign_title ?? "campaign"}`,
    weekly_report_ready:       `Your MRKT weekly report is ready`,
    new_application_received:  `${data.creator_name ?? "A creator"} applied to ${data.campaign_title ?? "your campaign"}`,
    contract_accepted:         `Contract accepted — ${data.campaign_title ?? "campaign"}`,
    deliverable_submitted:     `Deliverable submitted — ${data.campaign_title ?? "campaign"}`,
    business_weekly_report_ready: `Your MRKT weekly business report is ready`,
  };
  return subjects[type] ?? "Update from MRKT";
}

function buildHtml(type: NotificationType, data: Record<string, unknown>, recipientName: string): string {
  const baseUrl = "https://usemrkt.app";

  const headerColor = "#0a0a0a";
  const accentColor = "#d4af37";

  const wrap = (inner: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MRKT Notification</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;min-height:100vh">
    <tr>
      <td align="center" style="padding:40px 20px">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <!-- Header -->
          <tr>
            <td style="background:${headerColor};border-radius:12px 12px 0 0;padding:32px 40px;border-bottom:1px solid #1a1a1a">
              <span style="color:${accentColor};font-size:22px;font-weight:700;letter-spacing:2px">MRKT</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#111111;padding:40px;border-radius:0 0 12px 12px">
              <p style="color:#aaaaaa;font-size:14px;margin:0 0 8px">Hi ${recipientName},</p>
              ${inner}
              <hr style="border:none;border-top:1px solid #1e1e1e;margin:32px 0">
              <p style="color:#555;font-size:12px;margin:0">
                MRKT — The creator marketplace for the GCC region<br>
                <a href="${baseUrl}/settings" style="color:#888;text-decoration:none">Manage notifications</a>
                &nbsp;·&nbsp;
                <a href="${baseUrl}" style="color:#888;text-decoration:none">Open MRKT</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const btn = (label: string, href: string) =>
    `<a href="${baseUrl}${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:${accentColor};color:#000;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px">${label}</a>`;

  const title = (t: string) =>
    `<h2 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 16px">${t}</h2>`;

  const para = (t: string) =>
    `<p style="color:#aaaaaa;font-size:15px;line-height:1.6;margin:0 0 12px">${t}</p>`;

  const templates: Record<NotificationType, string> = {
    application_shortlisted: wrap(`
      ${title("You've been shortlisted")}
      ${para(`Great news — you've been shortlisted for <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${para("The brand is reviewing your profile and will be in touch soon.")}
      ${btn("View application", "/opportunities")}
    `),

    application_accepted: wrap(`
      ${title("You've been selected")}
      ${para(`Congratulations — you were selected for <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${para("A contract will be sent shortly. Review it carefully before signing.")}
      ${btn("View campaign", "/pipeline")}
    `),

    application_rejected: wrap(`
      ${title("Application update")}
      ${para(`Your application for <strong style="color:#fff">${data.campaign_title}</strong> was not selected this time.`)}
      ${para("There are many other campaigns on MRKT that may be a great fit for you.")}
      ${btn("Browse opportunities", "/opportunities")}
    `),

    new_application_status: wrap(`
      ${title("Application update")}
      ${para(`Your application for <strong style="color:#fff">${data.campaign_title}</strong> has been updated.`)}
      ${btn("View details", "/opportunities")}
    `),

    new_message: wrap(`
      ${title("New message")}
      ${para(`You have a new message from <strong style="color:#fff">${data.sender_name}</strong>.`)}
      ${data.preview ? para(`<em style="color:#777">"${data.preview}"</em>`) : ""}
      ${btn("View message", "/chat")}
    `),

    contract_sent: wrap(`
      ${title("Contract ready to review")}
      ${para(`A contract has been sent for <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${para("Review and sign it to confirm your participation.")}
      ${btn("Review contract", "/pipeline")}
    `),

    deliverable_approved: wrap(`
      ${title("Deliverable approved")}
      ${para(`Your deliverable for <strong style="color:#fff">${data.campaign_title}</strong> has been approved.`)}
      ${data.payment_amount ? para(`Payment of <strong style="color:#fff">$${data.payment_amount}</strong> will be processed.`) : ""}
      ${btn("View pipeline", "/pipeline")}
    `),

    revision_requested: wrap(`
      ${title("Revision requested")}
      ${para(`The brand has requested a revision on your deliverable for <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${data.feedback ? para(`Feedback: <em style="color:#777">"${data.feedback}"</em>`) : ""}
      ${btn("View details", "/pipeline")}
    `),

    weekly_report_ready: wrap(`
      ${title("Your weekly MRKT report")}
      ${para(`Here's a snapshot of your visibility this week:`)}
      ${data.profile_views ? `<p style="color:#fff;font-size:32px;font-weight:700;margin:24px 0 4px">${data.profile_views}</p><p style="color:#666;font-size:13px;margin:0 0 20px">profile views</p>` : ""}
      ${data.appearances ? `<p style="color:#fff;font-size:32px;font-weight:700;margin:0 0 4px">${data.appearances}</p><p style="color:#666;font-size:13px;margin:0 0 20px">search appearances</p>` : ""}
      ${btn("View full report", "/analytics")}
    `),

    new_application_received: wrap(`
      ${title("New application received")}
      ${para(`<strong style="color:#fff">${data.creator_name}</strong> applied to <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${data.match_score ? para(`Match score: <strong style="color:#fff">${data.match_score}%</strong>`) : ""}
      ${btn("Review application", "/pipeline")}
    `),

    contract_accepted: wrap(`
      ${title("Contract accepted")}
      ${para(`<strong style="color:#fff">${data.creator_name}</strong> has accepted the contract for <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${btn("View pipeline", "/pipeline")}
    `),

    deliverable_submitted: wrap(`
      ${title("Deliverable submitted")}
      ${para(`<strong style="color:#fff">${data.creator_name}</strong> has submitted a deliverable for <strong style="color:#fff">${data.campaign_title}</strong>.`)}
      ${para("Review and approve or request revisions.")}
      ${btn("Review deliverable", "/pipeline")}
    `),

    business_weekly_report_ready: wrap(`
      ${title("Your weekly MRKT business report")}
      ${para(`Here's your campaign activity this week:`)}
      ${data.applications_count ? `<p style="color:#fff;font-size:32px;font-weight:700;margin:24px 0 4px">${data.applications_count}</p><p style="color:#666;font-size:13px;margin:0 0 20px">new applications</p>` : ""}
      ${btn("View analytics", "/analytics")}
    `),
  };

  return templates[type] ?? wrap(`${title("Update from MRKT")}${para("You have a new notification.")}`);
}

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("send-email-notification: RESEND_API_KEY not configured, skipping");
    return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require a logged-in caller — this endpoint previously had no auth check
    // at all, letting anyone relay email to any user_id at MRKT's expense.
    const caller = await requireAuth(req, supabase);
    if (isRateLimited(`send-email-notification:${caller.id}`, DEFAULT_API_RATE)) {
      return new Response(JSON.stringify({ error: "Too many notification requests. Please slow down." }), {
        status: 429, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body: EmailRequest = await req.json();
    const { user_id, notification_type, data: rawData } = body;
    const data = sanitizeDataRecord(rawData ?? {});

    if (!user_id || !notification_type) {
      return new Response(JSON.stringify({ error: "user_id and notification_type required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Check notification preferences
    let prefs = (await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single()).data;

    if (!prefs) {
      // Create defaults
      const { data: created } = await supabase
        .from("notification_preferences")
        .insert({ user_id })
        .select()
        .single();
      prefs = created;
    }

    if (!prefs?.email_enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "email disabled by user" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Category-level check
    const categoryMap: Record<string, keyof typeof prefs> = {
      new_application_status:    "campaign_updates",
      application_shortlisted:   "campaign_updates",
      application_accepted:      "campaign_updates",
      application_rejected:      "campaign_updates",
      new_application_received:  "campaign_updates",
      new_message:               "messages",
      contract_sent:             "contracts",
      contract_accepted:         "contracts",
      deliverable_submitted:     "deliverables",
      deliverable_approved:      "deliverables",
      revision_requested:        "deliverables",
      weekly_report_ready:       "weekly_reports",
      business_weekly_report_ready: "weekly_reports",
    };
    const categoryKey = categoryMap[notification_type];
    if (categoryKey && prefs[categoryKey] === false) {
      return new Response(JSON.stringify({ skipped: true, reason: `category ${categoryKey} disabled` }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get user email from auth (service role)
    const { data: { user: authUser }, error: usersErr } = await supabase.auth.admin.getUserById(user_id);
    if (usersErr) throw usersErr;
    if (!authUser?.email) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user_id)
      .single();

    const recipientName = escapeHtml(profile?.name ?? "there");
    const subject = buildSubject(notification_type, data);
    const html = buildHtml(notification_type, data, recipientName);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MRKT <notifications@usemrkt.app>",
        to: authUser.email,
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Email delivery failed", detail: errText }), {
        status: 502, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const resendData = await resendRes.json();
    return new Response(JSON.stringify({ sent: true, id: resendData.id }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    console.error("send-email-notification error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
