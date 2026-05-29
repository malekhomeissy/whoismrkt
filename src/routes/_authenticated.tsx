import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  // true once we've verified the profile and confirmed onboarding is done
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      nav({ to: "/login" });
      return;
    }

    // Check whether the user has completed the onboarding intent screen
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.onboarding_completed === false) {
          // Send them to onboarding — that page handles both
          // logged-in (saves directly) and logged-out (localStorage) cases
          nav({ to: "/onboarding" });
        } else {
          setProfileReady(true);
        }
      });
  }, [user, loading, nav]);

  if (loading || !user || !profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return <Outlet />;
}
