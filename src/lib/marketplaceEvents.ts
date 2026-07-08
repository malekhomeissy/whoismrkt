import { supabase } from "@/integrations/supabase/client";

export type MarketplaceEventType =
  // Discovery
  | "creator_profile_viewed"
  | "creator_saved"
  | "creator_appeared_in_match"
  | "campaign_viewed"
  | "opportunity_saved"
  // Applications
  | "application_submitted"
  | "application_viewed"
  | "application_shortlisted"
  | "application_accepted"
  | "application_rejected"
  // Messages
  | "message_sent"
  | "message_received"
  | "conversation_started"
  // Contracts
  | "contract_created"
  | "contract_sent"
  | "contract_accepted"
  | "contract_declined"
  // Deliverables
  | "deliverable_started"
  | "deliverable_submitted"
  | "deliverable_revision_requested"
  | "deliverable_approved"
  // Sessions / engagement
  | "session_started"
  | "mission_completed"
  | "weekly_report_opened"
  | "notification_clicked"
  | "pipeline_updates";

interface TrackParams {
  actorUserId: string;
  eventType: MarketplaceEventType;
  creatorId?: string;
  businessId?: string;
  campaignId?: string;
  applicationId?: string;
  contractId?: string;
  deliverableId?: string;
  metadata?: Record<string, unknown>;
}

export async function trackMarketplaceEvent(params: TrackParams): Promise<void> {
  try {
    await supabase
      .from("marketplace_events")
      .insert({
        event_type:     params.eventType,
        actor_user_id:  params.actorUserId,
        creator_id:     params.creatorId     ?? null,
        business_id:    params.businessId    ?? null,
        campaign_id:    params.campaignId    ?? null,
        application_id: params.applicationId ?? null,
        contract_id:    params.contractId    ?? null,
        deliverable_id: params.deliverableId ?? null,
        metadata_json:  (params.metadata as Record<string, string | number | boolean | null> | undefined) ?? null,
      });
  } catch {
    // Fire-and-forget — event tracking must never break user actions
  }
}
