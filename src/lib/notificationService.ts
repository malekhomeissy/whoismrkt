import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceEventType } from "./marketplaceEvents";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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

interface NotifyParams {
  userId: string;
  notificationType: NotificationType;
  data: Record<string, string | number | boolean | null>;
  // In-app notification fields
  inApp?: {
    title: string;
    body: string;
    link?: string;
  };
  // Optional marketplace event to track alongside the notification
  marketplaceEvent?: {
    eventType: MarketplaceEventType;
    actorUserId: string;
    creatorId?: string;
    businessId?: string;
    campaignId?: string;
    applicationId?: string;
    contractId?: string;
    deliverableId?: string;
  };
}

/**
 * Central notification dispatcher.
 *
 * For every notification event:
 * 1. Inserts in-app notification if inApp fields provided
 * 2. Tracks marketplace event if provided
 * 3. Calls send-email-notification edge function (graceful if not configured)
 * 4. Calls send-whatsapp-notification edge function (graceful if not configured)
 *
 * All external calls are fire-and-forget. This function never throws.
 */
export async function sendNotification(params: NotifyParams): Promise<void> {
  const { userId, notificationType, data, inApp, marketplaceEvent } = params;

  // 1. In-app notification
  if (inApp) {
    try {
      await (supabase as any)
        .from("notifications")
        .insert({
          user_id:  userId,
          title:    inApp.title,
          body:     inApp.body,
          link:     inApp.link ?? null,
          type:     notificationType,
          read:     false,
        });
    } catch (err) {
      console.warn("[notify] in-app insert failed:", err);
    }
  }

  // 2. Marketplace event
  if (marketplaceEvent) {
    try {
      await (supabase as any)
        .from("marketplace_events")
        .insert({
          event_type:     marketplaceEvent.eventType,
          actor_user_id:  marketplaceEvent.actorUserId,
          creator_id:     marketplaceEvent.creatorId     ?? null,
          business_id:    marketplaceEvent.businessId    ?? null,
          campaign_id:    marketplaceEvent.campaignId    ?? null,
          application_id: marketplaceEvent.applicationId ?? null,
          contract_id:    marketplaceEvent.contractId    ?? null,
          deliverable_id: marketplaceEvent.deliverableId ?? null,
        });
    } catch (err) {
      console.warn("[notify] event insert failed:", err);
    }
  }

  // Get auth token for edge function calls
  let accessToken: string | null = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData.session?.access_token ?? null;
  } catch {
    // skip email/WA if we can't get session
    return;
  }

  if (!accessToken || !SUPABASE_URL) return;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  };

  // 3. Email notification (fire-and-forget)
  fetch(`${SUPABASE_URL}/functions/v1/send-email-notification`, {
    method: "POST",
    headers,
    body: JSON.stringify({ user_id: userId, notification_type: notificationType, data }),
  }).catch((err) => console.warn("[notify] email send failed:", err));

  // 4. WhatsApp notification (fire-and-forget)
  // Map notification type to WhatsApp template type
  const waTemplateMap: Partial<Record<NotificationType, string>> = {
    new_application_received:  "new_application",
    new_message:               "new_message",
    contract_sent:             "contract_sent",
    deliverable_approved:      "deliverable_approved",
    weekly_report_ready:       "weekly_report_ready",
    business_weekly_report_ready: "weekly_report_ready",
  };
  const waTemplate = waTemplateMap[notificationType];
  if (waTemplate) {
    const waParams = buildWhatsAppParams(notificationType, data);
    fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId, template_type: waTemplate, parameters: waParams }),
    }).catch((err) => console.warn("[notify] whatsapp send failed:", err));
  }
}

function buildWhatsAppParams(
  type: NotificationType,
  data: Record<string, string | number | boolean | null>,
): string[] {
  const s = (v: unknown) => (v != null ? String(v) : "");
  switch (type) {
    case "new_application_received":
      return [s(data.creator_name), s(data.campaign_title)];
    case "new_message":
      return [s(data.sender_name)];
    case "contract_sent":
      return [s(data.campaign_title)];
    case "deliverable_approved":
      return [s(data.campaign_title)];
    case "weekly_report_ready":
    case "business_weekly_report_ready":
      return [s(data.profile_views ?? data.applications_count ?? "0")];
    default:
      return [];
  }
}
