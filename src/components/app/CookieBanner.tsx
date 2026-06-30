// Cookie consent banner — shown once per browser until the user accepts or rejects.
// Strictly necessary cookies (auth session) always active; analytics optional.

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "mrkt_cookie_consent";

export type CookieConsent = "accepted" | "rejected" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "accepted" || v === "rejected") return v;
  return null;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if the user hasn't chosen yet
    if (getCookieConsent() === null) {
      // Small delay so banner doesn't flash on initial render
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(520px, calc(100vw - 32px))",
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(1 0 0 / 12%)",
        borderRadius: "16px",
        padding: "18px 20px",
        boxShadow: "0 24px 64px oklch(0 0 0 / 60%)",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        animation: "slideUp 0.25s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "oklch(1 0 0 / 88%)", marginBottom: "4px" }}>
            We use cookies
          </p>
          <p style={{ fontSize: "12px", color: "oklch(1 0 0 / 50%)", lineHeight: "1.6" }}>
            Strictly necessary cookies keep you logged in. We also use optional analytics cookies to improve the platform.{" "}
            <a href="/cookies" style={{ color: "oklch(0.82 0.005 0)", textDecoration: "underline" }}>
              Cookie Policy
            </a>
          </p>
        </div>
        <button
          onClick={reject}
          aria-label="Dismiss"
          style={{
            padding: "4px",
            borderRadius: "8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "oklch(1 0 0 / 35%)",
            flexShrink: 0,
          }}
        >
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={accept}
          style={{
            flex: 1,
            height: "36px",
            borderRadius: "100px",
            border: "none",
            background: "oklch(0.96 0 0)",
            color: "#000",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Accept all
        </button>
        <button
          onClick={reject}
          style={{
            flex: 1,
            height: "36px",
            borderRadius: "100px",
            border: "1px solid oklch(1 0 0 / 12%)",
            background: "transparent",
            color: "oklch(1 0 0 / 55%)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Necessary only
        </button>
      </div>
    </div>
  );
}
