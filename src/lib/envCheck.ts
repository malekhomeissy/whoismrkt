// ─────────────────────────────────────────────────────────────────────────────
// Dev/production Supabase safety check.
//
// MRKT currently has no separate staging Supabase project — local
// development (`npm run dev`) talks to the SAME production project
// (zkleghcsduntwonyiynb) that usemrkt.app runs on. Every signup, message,
// contract, etc. created while developing locally is a real row in the
// production database. This has already caused confusion during audits and
// manual testing. See ENVIRONMENTS.md for the recommended staging setup.
//
// This check does not block anything — it just makes the risk visible the
// moment the dev server starts, instead of relying on every engineer to
// remember it.
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_PRODUCTION_PROJECT_REF = "zkleghcsduntwonyiynb";

export function warnIfDevOnProduction(): void {
  if (typeof window === "undefined") return; // server-render pass — only warn in the browser
  if (!import.meta.env.DEV) return; // production build — nothing to warn about

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (projectId !== KNOWN_PRODUCTION_PROJECT_REF) return;

  // eslint-disable-next-line no-console
  console.warn(
    "%c⚠ MRKT DEV MODE IS CONNECTED TO THE PRODUCTION SUPABASE PROJECT ⚠",
    "background:#7a1f1f;color:#fff;font-weight:bold;padding:4px 8px;border-radius:4px;",
    "\nThere is no separate staging project yet. Signups, messages, contracts, and " +
    "deletions you trigger locally are REAL rows in production. See ENVIRONMENTS.md " +
    "for how to point local dev at a staging project once one exists " +
    "(VITE_STAGING_SUPABASE_URL / VITE_STAGING_SUPABASE_PUBLISHABLE_KEY).",
  );
}
