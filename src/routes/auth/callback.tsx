import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredIntent, clearIntent, intentToAccountType } from "@/lib/onboarding";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in — whoismrkt" }] }),
  component: AuthCallback,
});

/** Reads the onboarding intent from localStorage and writes it to the profile row.
 *  Silently no-ops if there is no stored intent (e.g. returning user). */
async function commitIntent(userId: string) {
  const intent = getStoredIntent();
  if (!intent) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        account_type: intentToAccountType(intent.path),
        onboarding_path: intent.path,
        business_stage: intent.business_stage ?? null,
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (!error) clearIntent();
  } catch (e) {
    console.error("[auth/callback] intent commit failed:", e);
  }
}

function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    let done = false;

    const go = (to: "/chat" | "/login") => {
      if (done) return;
      done = true;
      nav({ to, replace: true });
    };

    // Supabase auto-detects OAuth tokens in the URL hash / PKCE code
    // and fires onAuthStateChange with SIGNED_IN once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          await commitIntent(session.user.id);
          go("/chat");
        } else if (event === "SIGNED_OUT") {
          go("/login");
        }
      },
    );

    // In case the session is already present (e.g., page refreshed mid-flow)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await commitIntent(data.session.user.id);
        go("/chat");
      }
    });

    // Safety net — if nothing resolves in 10 s, fall back to login
    const timeout = setTimeout(() => go("/login"), 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5">
      <div className="h-2 w-2 rounded-full bg-white/50 animate-pulse" />
      <p className="text-[0.8125rem] text-muted-foreground/50 tracking-wide">Signing you in…</p>
    </div>
  );
}
