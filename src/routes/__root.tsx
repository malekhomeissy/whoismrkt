import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Component, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { CookieBanner } from "@/components/app/CookieBanner";

import appCss      from "../styles.css?url";
import mrktIconUrl from "../assets/MRKT logo final.png?url";

// ─── Error boundary ───────────────────────────────────────────────────────────
// Catches render errors that would otherwise silently show "Something went wrong".
// Logs the real error + stack to the console so it's visible in DevTools and
// Cloudflare Worker tail logs.

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[MRKT] Render error caught by boundary:", error);
    console.error("[MRKT] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message ?? "An unexpected error occurred.";
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            background: "#000",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              height: 48, width: 48, borderRadius: "50%",
              background: "oklch(0.52 0.15 24 / 18%)",
              border: "1px solid oklch(0.52 0.15 24 / 35%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}
          >
            ⚠
          </div>
          <p style={{ color: "oklch(1 0 0 / 72%)", fontSize: 16, fontWeight: 600 }}>
            Something went wrong
          </p>
          <p style={{ color: "oklch(1 0 0 / 40%)", fontSize: 13, maxWidth: 320 }}>
            {msg}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                background: "oklch(0.95 0 0)", color: "#000",
                border: "none", borderRadius: 9999,
                padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: "transparent", color: "oklch(1 0 0 / 50%)",
                border: "1px solid oklch(1 0 0 / 18%)", borderRadius: 9999,
                padding: "8px 20px", fontSize: 13, textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-chrome">404</h1>
        <h2 className="mt-4 font-display text-xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="btn-primary inline-flex items-center justify-center rounded-full px-6 h-11 text-sm"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MRKT — AI marketing operating system" },
      { name: "description", content: "MRKT helps creators and businesses plan content, build campaigns, discover collaborations, and grow with AI." },
      { name: "author", content: "MRKT" },
      { property: "og:title", content: "MRKT — AI marketing operating system" },
      { property: "og:description", content: "Plan content, build campaigns, discover creators, and grow with AI. The marketing operating system for ambitious brands." },
      { property: "og:type",  content: "website" },
      { property: "og:image", content: mrktIconUrl },
      { name: "twitter:image", content: mrktIconUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MRKT — AI marketing operating system" },
      { name: "twitter:description", content: "Plan content, build campaigns, discover creators, and grow with AI." },
    ],
    links: [
      { rel: "stylesheet",       href: appCss },
      { rel: "icon",             type: "image/png", href: mrktIconUrl },
      { rel: "apple-touch-icon", href: mrktIconUrl },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <RootErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <Outlet />
          <Toaster theme="dark" position="top-right" />
          <CookieBanner />
        </AuthProvider>
      </LanguageProvider>
    </RootErrorBoundary>
  );
}
