import { createFileRoute, Outlet } from "@tanstack/react-router";

// ─────────────────────────────────────────────────────────────────────────────
// Layout shell for /campaigns/:campaignId and its children:
//   index  → /campaigns/:id            (campaign detail)
//   edit   → /campaigns/:id/edit       (edit form)
//   applicants → /campaigns/:id/applicants (applicant review)
//
// This file must stay a pure <Outlet /> — do NOT add page content here.
// Page content lives in campaigns.$campaignId.index.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/campaigns/$campaignId")({
  component: () => <Outlet />,
});
