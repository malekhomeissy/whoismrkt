import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Mirrors the same check used in chat.tsx so both stay in sync. */
function isBizAccount(
  acct: string | null | undefined,
  path: string | null | undefined,
): boolean {
  return (
    acct === "brand" ||
    acct === "business" ||
    path === "business_creator" ||
    path === "business_marketing"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  // Must be at the top — calling a hook after early returns violates Rules of Hooks.
  const routerState = useRouterState();
  const [profileReady, setProfileReady] = useState(false);
  const [authError,    setAuthError]    = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      nav({ to: "/login" });
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line prefer-const
    let timeoutId: ReturnType<typeof setTimeout>;

    async function checkGates() {
      // 8-second safety net — prevents indefinite "Loading…" if a DB query hangs
      timeoutId = setTimeout(() => {
        if (!cancelled) setAuthError(true);
      }, 8000);

      // ── 1. Fetch base profile ────────────────────────────────────────────
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed, account_type, onboarding_path")
        .eq("id", user!.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        clearTimeout(timeoutId);
        console.warn("[_authenticated] profiles query failed:", error);
        nav({ to: "/onboarding" });
        return;
      }

      // ── 2. General onboarding not complete ──────────────────────────────
      if (data.onboarding_completed === false) {
        clearTimeout(timeoutId);
        nav({ to: "/onboarding" });
        return;
      }

      // ── 3. Business users must finish business onboarding ───────────────
      // Check BOTH account_type AND onboarding_path so no path is missed.
      if (isBizAccount(data.account_type, data.onboarding_path)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: bizProfile, error: bizError } = await supabase
          .from("business_profiles")
          .select("is_complete")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (cancelled) return;

        if (bizError) {
          // DB error (table missing, RLS, network) — log it but don't redirect.
          // Silently redirecting to onboarding here causes an infinite loop when
          // the DB is unavailable or the table hasn't been migrated yet.
          console.error("[_authenticated] business_profiles query failed:", bizError);
        } else if (!bizProfile?.is_complete) {
          clearTimeout(timeoutId);
          nav({ to: "/business/onboarding" });
          return;
        }
      }

      // ── 4. All gates passed ──────────────────────────────────────────────
      clearTimeout(timeoutId);
      if (!cancelled) setProfileReady(true);
    }

    checkGates();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [user, loading, nav]);

  // DB queries timed out or failed — don't leave the user stuck on Loading
  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <p className="text-sm" style={{ color: "oklch(1 0 0 / 40%)" }}>
          We couldn't verify your account. Please sign in again.
        </p>
        <a
          href="/login"
          className="text-sm underline transition-colors"
          style={{ color: "oklch(1 0 0 / 55%)" }}
        >
          Sign in →
        </a>
      </div>
    );
  }

  // Redirect to /login already fired — render nothing to avoid flash
  if (!loading && !user) return null;

  if (loading || !profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  // Full-screen flows that manage their own layout (onboarding, campaign creation)
  const pathname = routerState.location.pathname;
  const SHELL_EXCLUDED = ["/creator-onboarding", "/campaign-create"];
  const useShell = !SHELL_EXCLUDED.some((p) => pathname.startsWith(p));

  return useShell ? <AppShell><Outlet /></AppShell> : <Outlet />;
}
