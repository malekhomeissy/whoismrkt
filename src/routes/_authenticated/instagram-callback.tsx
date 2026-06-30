// ─────────────────────────────────────────────────────────────────────────────
// /instagram-callback — Meta OAuth return handler
//
// Meta redirects here after the user completes Facebook/Instagram OAuth.
// This page exchanges the authorization code for a token via the
// instagram-connect edge function, then redirects back to /verification.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/instagram-callback")({
  head: () => ({ meta: [{ title: "Connecting Instagram — MRKT" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    code:              (search.code              as string) ?? "",
    state:             (search.state             as string) ?? "",
    error:             (search.error             as string) ?? "",
    error_description: (search.error_description as string) ?? "",
  }),
  component: InstagramCallbackPage,
});

// ─── Design tokens (matches verification page) ────────────────────────────────

import { C } from "@/lib/theme";

// ─── Page ─────────────────────────────────────────────────────────────────────

type Status = "connecting" | "success" | "error";

function InstagramCallbackPage() {
  const { user }                = useAuth();
  const nav                     = useNavigate();
  const search                  = Route.useSearch();
  const [status,  setStatus]    = useState<Status>("connecting");
  const [message, setMessage]   = useState("");
  const ran                     = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    // OAuth error from Meta (user denied, etc.)
    if (search.error) {
      setStatus("error");
      setMessage(search.error_description || search.error);
      return;
    }

    if (!search.code) {
      setStatus("error");
      setMessage("No authorization code received from Meta.");
      return;
    }

    // CSRF check
    const savedState = sessionStorage.getItem("ig_oauth_state");
    if (savedState && search.state && search.state !== savedState) {
      setStatus("error");
      setMessage("Security check failed — please try connecting again.");
      return;
    }
    sessionStorage.removeItem("ig_oauth_state");

    // The redirect_uri must exactly match what's registered in the Meta App
    const redirectUri = `${window.location.origin}/instagram-callback`;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No auth session.");

        const res  = await supabase.functions.invoke("instagram-connect", {
          body: { code: search.code, redirect_uri: redirectUri },
        });

        const data = res.data as {
          success?: boolean;
          error?:   string;
          message?: string;
          instagram?: { username: string; followers_count: number };
        };

        if (data?.error === "no_business_account") {
          setStatus("error");
          setMessage(data.message ?? "No Instagram Business or Creator account found.");
        } else if (data?.error) {
          setStatus("error");
          setMessage(data.message ?? data.error);
        } else if (data?.success && data.instagram) {
          setStatus("success");
          setMessage(`@${data.instagram.username} · ${data.instagram.followers_count.toLocaleString()} followers`);
          setTimeout(() => nav({ to: "/verification" }), 2_000);
        } else {
          setStatus("error");
          setMessage("Unexpected response from server.");
        }
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Connection failed. Please try again.");
      }
    })();
  }, [user, search, nav]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: C.canvas }}
    >
      <div
        className="max-w-sm w-full rounded-2xl px-8 py-10 text-center space-y-5"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        {status === "connecting" && (
          <>
            <div
              className="h-7 w-7 rounded-full border-2 animate-spin mx-auto"
              style={{ borderColor: "oklch(0.84 0 0) transparent transparent transparent" }}
            />
            <p className="text-[14px] font-semibold" style={{ color: C.text1 }}>
              Connecting Instagram
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: C.text3 }}>
              Fetching your account data from Meta…
            </p>
          </>
        )}

        {status === "success" && (
          <>
            {/* White circle + black tick */}
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "#fff" }}
            >
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none">
                <path d="M2.5 7.2L5.5 10.2L11.5 4" stroke="#000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold" style={{ color: C.text1 }}>
              Instagram Connected
            </p>
            <p className="text-[12.5px] font-medium" style={{ color: C.text2 }}>{message}</p>
            <p className="text-[11px]" style={{ color: C.text3 }}>Redirecting to verification…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 12%)" }}
            >
              <span className="text-[13px] font-bold" style={{ color: "oklch(0.52 0.15 24)" }}>!</span>
            </div>
            <p className="text-[14px] font-semibold" style={{ color: C.text1 }}>
              Connection Failed
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: C.text2 }}>{message}</p>
            <button
              onClick={() => nav({ to: "/verification" })}
              className="mt-1 inline-flex items-center gap-2 rounded-full px-5 h-9 text-[12px] font-medium transition-all duration-150"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border:     "1px solid oklch(1 0 0 / 12%)",
                color:      C.text2,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; }}
            >
              Back to Verification
            </button>
          </>
        )}
      </div>
    </div>
  );
}
