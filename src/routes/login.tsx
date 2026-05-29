import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import { getStoredIntent, clearIntent, intentToAccountType } from "@/lib/onboarding";
import { toast } from "sonner";
import { Logo } from "@/components/site/Logo";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — whoismrkt" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) nav({ to: "/chat" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { name } },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Check your inbox to confirm your email.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      // Commit any onboarding intent that was stored before the user hit /login
      if (data.user) {
        const intent = getStoredIntent();
        if (intent) {
          try {
            const { error: uErr } = await supabase
              .from("profiles")
              .update({
                account_type: intentToAccountType(intent.path),
                onboarding_path: intent.path,
                business_stage: intent.business_stage ?? null,
                onboarding_completed: true,
              })
              .eq("id", data.user.id);
            if (!uErr) clearIntent();
          } catch { /* non-fatal — _authenticated guard will catch it */ }
        }
      }
      nav({ to: "/chat" });
    }
  };

  const google = async () => {
    // Use Supabase OAuth directly — more reliable for local dev and handles
    // localhost redirect URIs correctly when added to Supabase → Auth → URL Config.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
    // On success the browser navigates to Google automatically — no further action needed.
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 h-16 flex items-center justify-between hairline-b">
        <Link to="/"><Logo /></Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-6">— {mode === "signin" ? "Welcome back" : "Create account"}</div>
          <h1 className="font-display text-5xl font-semibold tracking-tight leading-[0.95]">
            {mode === "signin" ? <>Sign in to <span className="text-chrome">MRKT.</span></> : <>Meet your AI <span className="text-chrome">strategist.</span></>}
          </h1>
          <p className="mt-4 text-muted-foreground text-sm">
            {mode === "signin" ? "Pick up where you left off." : "Free to start. Strategize, plan and create posts in minutes."}
          </p>

          <button onClick={google} className="mt-10 w-full h-12 rounded-full bg-white text-black font-medium text-sm flex items-center justify-center gap-3 hover:bg-white/90 transition">
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-white/10" /> or <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button disabled={loading} className="btn-primary w-full h-12 rounded-full text-sm inline-flex items-center justify-center gap-2">
              {loading ? "…" : <>{mode === "signin" ? "Sign in" : "Create account"} <ArrowUpRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-foreground hover:text-chrome underline-offset-4 hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input {...props} className="mt-2 w-full h-11 rounded-lg bg-black/40 border border-white/10 focus:border-white/40 outline-none px-4 text-sm transition" />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
  );
}
