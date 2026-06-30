// ─────────────────────────────────────────────────────────────────────────────
// MRKT AI Agent Action Registry
//
// Defines the action surface the AI can eventually execute on behalf of users.
// Each action has: a type, required role/permission, human-readable label,
// and a handler signature.
//
// Phase 1 (current): Registry + types only. Actions are rendered as suggestion
// buttons in chat — the user manually completes the action.
//
// Phase 2 (future): AI can call these directly after explicit user permission
// via the permissioned action gate.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Role types ──────────────────────────────────────────────────────────────

export type AgentRole = "creator" | "business" | "any";

// ─── Action catalogue ─────────────────────────────────────────────────────────

export type AgentActionType =
  // ── Creator actions
  | "update_profile_bio"
  | "update_availability"
  | "add_travel_plan"
  | "submit_application"
  | "export_content_plan"
  // ── Business actions
  | "create_campaign_draft"
  | "invite_creator_to_campaign"
  | "move_creator_pipeline"
  | "generate_outreach_message"
  // ── Shared
  | "open_chat_session"
  | "navigate_to_route"
  | "schedule_reminder";

// ─── Permission registry ──────────────────────────────────────────────────────

export interface AgentActionDef {
  type:        AgentActionType;
  label:       string;
  description: string;
  allowedRole: AgentRole;
  requiresExplicitApproval: boolean;
  icon:        string;
  routeHint?:  string;
}

export const AGENT_ACTION_REGISTRY: Record<AgentActionType, AgentActionDef> = {
  update_profile_bio: {
    type:                     "update_profile_bio",
    label:                    "Update Profile Bio",
    description:              "AI writes a new bio based on your niche, platforms, and audience.",
    allowedRole:              "creator",
    requiresExplicitApproval: true,
    icon:                     "PenLine",
    routeHint:                "/profile",
  },
  update_availability: {
    type:                     "update_availability",
    label:                    "Set Availability",
    description:              "Mark yourself as available, busy, or traveling.",
    allowedRole:              "creator",
    requiresExplicitApproval: false,
    icon:                     "CalendarCheck",
    routeHint:                "/profile",
  },
  add_travel_plan: {
    type:                     "add_travel_plan",
    label:                    "Add Travel Plan",
    description:              "Tell brands where you're traveling and when.",
    allowedRole:              "creator",
    requiresExplicitApproval: false,
    icon:                     "Plane",
    routeHint:                "/globe",
  },
  submit_application: {
    type:                     "submit_application",
    label:                    "Apply to Campaign",
    description:              "Submit an AI-drafted application to a matched campaign.",
    allowedRole:              "creator",
    requiresExplicitApproval: true,
    icon:                     "Send",
    routeHint:                "/opportunities",
  },
  export_content_plan: {
    type:                     "export_content_plan",
    label:                    "Export Content Plan",
    description:              "Download or copy your AI-generated content calendar.",
    allowedRole:              "creator",
    requiresExplicitApproval: false,
    icon:                     "Download",
    routeHint:                "/content-planner",
  },
  create_campaign_draft: {
    type:                     "create_campaign_draft",
    label:                    "Draft Campaign",
    description:              "AI fills a campaign brief based on your goals and budget.",
    allowedRole:              "business",
    requiresExplicitApproval: true,
    icon:                     "Megaphone",
    routeHint:                "/campaign-create",
  },
  invite_creator_to_campaign: {
    type:                     "invite_creator_to_campaign",
    label:                    "Invite Creator",
    description:              "Generate a personalised outreach message for a matched creator.",
    allowedRole:              "business",
    requiresExplicitApproval: true,
    icon:                     "UserPlus",
    routeHint:                "/find-creators",
  },
  move_creator_pipeline: {
    type:                     "move_creator_pipeline",
    label:                    "Move Pipeline Stage",
    description:              "Advance a creator to the next stage in your pipeline.",
    allowedRole:              "business",
    requiresExplicitApproval: true,
    icon:                     "ArrowRightLeft",
    routeHint:                "/pipeline",
  },
  generate_outreach_message: {
    type:                     "generate_outreach_message",
    label:                    "Generate Outreach",
    description:              "Write a personalised outreach DM for a specific creator.",
    allowedRole:              "business",
    requiresExplicitApproval: false,
    icon:                     "Sparkles",
    routeHint:                "/find-creators",
  },
  open_chat_session: {
    type:                     "open_chat_session",
    label:                    "Open AI Session",
    description:              "Start a focused AI conversation with pre-filled context.",
    allowedRole:              "any",
    requiresExplicitApproval: false,
    icon:                     "MessageSquare",
    routeHint:                "/chat",
  },
  navigate_to_route: {
    type:                     "navigate_to_route",
    label:                    "Go to Page",
    description:              "Navigate to a specific page in the platform.",
    allowedRole:              "any",
    requiresExplicitApproval: false,
    icon:                     "Navigation",
    routeHint:                undefined,
  },
  schedule_reminder: {
    type:                     "schedule_reminder",
    label:                    "Set Reminder",
    description:              "Schedule a notification reminder for a future task.",
    allowedRole:              "any",
    requiresExplicitApproval: false,
    icon:                     "Bell",
    routeHint:                undefined,
  },
};

// ─── Action suggestion (Phase 1 output format) ────────────────────────────────

export interface AgentActionSuggestion {
  action:  AgentActionType;
  label:   string;
  context: string;
  route?:  string;
}

export function getActionsForRole(role: "creator" | "business"): AgentActionDef[] {
  return Object.values(AGENT_ACTION_REGISTRY).filter(
    (a) => a.allowedRole === role || a.allowedRole === "any",
  );
}

export function resolveActionRoute(type: AgentActionType): string | undefined {
  return AGENT_ACTION_REGISTRY[type]?.routeHint;
}
