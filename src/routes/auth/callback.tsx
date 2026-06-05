import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredIntent, clearIntent, intentToAccountType } from "@/lib/onboarding";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in — whoismrkt" }] }),
  component: AuthCallback,
});

type Dest = "/chat" | "/onboarding" | "/login";

/**
 * Commits any pre-stored onboarding intent from localStorage to the profile.
 * Returns the committed path (or null if there was no stored intent).
 */
async function commitIntent(userId: string): Promise<string | null> {
  const intent = getStoredIntent();
  if (!intent) return null;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        account_type:         intentToAccountType(intent.path),
        onboarding_path:      intent.path,
        business_stage:       intent.business_stage ?? null,
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (!error) clearIntent();
    return intent.path;
  } catch (err) {
    console.error("[auth/callback] intent commit failed:", err);
    return null;
  }
}

/**
 * Decides where to send the user after a successful sign-in.
 *
 * Rules:
 * 1. If an intent was just committed → they're set up → /chat
 * 2. If onboarding_completed = true → returning user → /chat
 * 3. If onboarding_completed = false / no profile yet → first-time → /onboarding
 */
async function resolveDestination(userId: string, committedPath: string | null): Promise<Dest> {
  // Intent was committed this session — profile is fully set up.
  if (committedPath !== null) return "/chat";

  // Check the existing profile.
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[auth/callback] profile fetch error:", error.message);
      // On any DB error, fall through to /onboarding so the user can pick a workspace
      // rather than landing in a broken state.
      return "/onboarding";
    }

    // Profile exists and onboarding is complete → returning user.
    if (data?.onboarding_completed === true) return "/chat";

    // No profile yet or onboarding not done → first-time → workspace selector.
    return "/onboarding";
  } catch (err) {
    console.error("[auth/callback] resolveDestination error:", err);
    return "/onboarding";
  }
}

function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    let done = false;
    const go = (to: Dest) => {
      if (done) return;
      done = true;
      nav({ to, replace: true });
    };

    // Primary path — listen for the SIGNED_IN event that Supabase fires
    // after the OAuth redirect lands and the session is established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          const path = await commitIntent(session.user.id);
          const dest = await resolveDestination(session.user.id, path);
          go(dest);
        } else if (event === "SIGNED_OUT") {
          go("/login");
        }
      },
    );

    // Fallback — handles cases where the session is already present when the
    // component mounts (e.g. a page refresh mid-flow or a very fast redirect).
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const path = await commitIntent(data.session.user.id);
        const dest = await resolveDestination(data.session.user.id, path);
        go(dest);
      }
    });

    // Hard timeout — if nothing resolves in 10 s, bail to login.
    const timeout = setTimeout(() => go("/login"), 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "#000" }}
    >
      {/* Subtle orbital rings — matches the chat empty state aesthetic */}
      <div className="relative h-10 w-10">
        <div
          className="ring-spinner absolute inset-0 rounded-full"
          style={{ border: "1px solid oklch(1 0 0 / 14%)", animation: "ring-spin 16s linear infinite" }}
        />
        <div
          className="ring-spinner absolute inset-[7px] rounded-full"
          style={{ border: "1px solid oklch(1 0 0 / 8%)", animation: "ring-spin-r 26s linear infinite" }}
        />
      </div>
      <p
        className="text-[12.5px] tracking-wide"
        style={{ color: "oklch(1 0 0 / 30%)" }}
      >
        Signing you in…
      </p>
    </div>
  );
}
