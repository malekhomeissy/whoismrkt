import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  getStoredIntent,
  clearIntent,
  intentToAccountType,
} from "@/lib/onboarding";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MRKT" }] }),
  component: LoginPage,
});

// ── Google logo SVG ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "oklch(1 0 0 / 32%)" }}>
        {label}
      </span>
      <input
        {...props}
        className="mt-2 w-full h-11 rounded-xl outline-none px-4 text-[13.5px] transition-all duration-150"
        style={{ background: "oklch(0.07 0 0)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(1 0 0 / 85%)" }}
        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "oklch(1 0 0 / 28%)"; props.onFocus?.(e); }}
        onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = "oklch(1 0 0 / 8%)";  props.onBlur?.(e);  }}
      />
    </label>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function LoginPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [emailOpen, setEmailOpen] = useState(false);
  const [mode,      setMode]      = useState<"signin" | "signup">("signin");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [name,      setName]      = useState("");
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { if (user) nav({ to: "/home" }); }, [user, nav]);

  // ── Google ─────────────────────────────────────────────────────────────────
  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
  }

  // ── Email / password ───────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { name },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created — check your inbox to confirm.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      if (data.user) {
        const intent = getStoredIntent();
        if (intent) {
          try {
            await supabase.from("profiles").update({
              account_type:         intentToAccountType(intent.path),
              onboarding_path:      intent.path,
              business_stage:       intent.business_stage ?? null,
              onboarding_completed: true,
            }).eq("id", data.user.id);
            clearIntent();
          } catch { /* non-fatal */ }
        }
      }
      nav({ to: "/home" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#000", color: "oklch(0.98 0 0)" }}>

      {/* Header */}
      <header
        className="px-6 h-[60px] flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <Link to="/"><Logo /></Link>
        <Link
          to="/"
          className="text-[13px] transition-colors"
          style={{ color: "oklch(1 0 0 / 32%)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 65%)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 32%)"; }}
        >
          ← Home
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">

          {/* Eyebrow */}
          <div className="text-[10px] uppercase tracking-[0.32em] mb-6" style={{ color: "oklch(1 0 0 / 26%)" }}>
            — Sign in
          </div>

          {/* Headline */}
          <h1 className="font-display text-[3rem] font-semibold tracking-[-0.04em] leading-[0.94] mb-4">
            Welcome to<br /><span className="text-chrome">MRKT.</span>
          </h1>

          {/* Subtext */}
          <p className="text-[14px] font-light mb-10" style={{ color: "oklch(1 0 0 / 38%)" }}>
            Your AI marketing strategist.<br />
            Personalized for creators and brands.
          </p>

          {/* ── Continue with Google (PRIMARY) ── */}
          <button
            onClick={google}
            className="w-full h-[54px] rounded-2xl flex items-center justify-center gap-3 text-[14.5px] font-semibold transition-all duration-200 relative overflow-hidden"
            style={{
              background: "oklch(0.97 0 0)",
              color: "oklch(0.06 0 0)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px oklch(0 0 0 / 35%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(0.97 0 0)";
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* ── Email / password (TERTIARY — expandable) ── */}
          <div className="mt-6">
            {/* Divider + toggle */}
            <button
              onClick={() => setEmailOpen((o) => !o)}
              className="w-full flex items-center gap-4 transition-colors group"
            >
              <div className="flex-1 h-px" style={{ background: "oklch(1 0 0 / 7%)" }} />
              <span
                className="flex items-center gap-1.5 text-[11.5px] shrink-0 transition-colors"
                style={{ color: "oklch(1 0 0 / 28%)" }}
              >
                {emailOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Sign in with email
              </span>
              <div className="flex-1 h-px" style={{ background: "oklch(1 0 0 / 7%)" }} />
            </button>

            {/* Expanding form */}
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{ maxHeight: emailOpen ? 480 : 0, opacity: emailOpen ? 1 : 0 }}
            >
              <form onSubmit={submit} className="pt-5 space-y-3.5">
                {mode === "signup" && (
                  <Field
                    label="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full h-11 rounded-xl text-[13.5px] font-medium inline-flex items-center justify-center gap-2 mt-1"
                >
                  {loading
                    ? "…"
                    : <>{mode === "signin" ? "Sign in" : "Create account"} <ArrowUpRight className="h-4 w-4" /></>
                  }
                </button>

                <p className="text-center text-[12.5px]" style={{ color: "oklch(1 0 0 / 32%)" }}>
                  {mode === "signin" ? "New here? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="transition-colors hover:underline underline-offset-4"
                    style={{ color: "oklch(1 0 0 / 68%)" }}
                  >
                    {mode === "signin" ? "Create account" : "Sign in"}
                  </button>
                </p>
              </form>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-10 text-[11px] text-center leading-relaxed" style={{ color: "oklch(1 0 0 / 18%)" }}>
            First time? You'll choose your workspace<br />
            (Creator or Business) right after signing in.
          </p>

          <p className="mt-3 text-[10.5px] text-center" style={{ color: "oklch(1 0 0 / 14%)" }}>
            By continuing, you agree to MRKT's{" "}
            <span className="underline underline-offset-2 cursor-pointer">Terms</span>
            {" & "}
            <span className="underline underline-offset-2 cursor-pointer">Privacy</span>
          </p>

        </div>
      </main>
    </div>
  );
}
