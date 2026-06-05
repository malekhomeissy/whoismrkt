import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpRight, Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — MRKT" },
      { name: "description", content: "Questions, feedback, or partnership inquiries — we'd love to hear from you. We reply within one business day." },
      { property: "og:title", content: "Contact MRKT" },
      { property: "og:description", content: "Get in touch with the MRKT team. Questions, feedback, or partnership inquiries." },
    ],
  }),
  component: Contact,
});

const TOPICS = [
  "General inquiry",
  "Creator partnership",
  "Business partnership",
  "Press & media",
  "Product feedback",
  "Other",
];

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", company: "", topic: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return toast.error("Please fill the required fields.");
    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name,
      email: form.email,
      company: form.company || null,
      budget: form.topic || null,
      message: form.message,
      source: "contact",
    });
    setLoading(false);
    if (error) return toast.error("Something went wrong. Please email hello@whoismrkt.com.");
    setDone(true);
    toast.success("Message received — we'll reply within one business day.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      <section className="relative px-6 pt-40 pb-24 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -8%, oklch(0.17 0 0) 0%, oklch(0.04 0 0) 60%)",
          }}
        />

        <div className="mx-auto max-w-5xl grid lg:grid-cols-12 gap-16 items-start">

          {/* Left */}
          <div className="lg:col-span-5">
            <div
              className="text-[9.5px] uppercase tracking-[0.35em] mb-8 font-medium"
              style={{ color: "oklch(1 0 0 / 28%)" }}
            >
              — Contact
            </div>
            <h1 className="font-display text-[clamp(3rem,6vw,5rem)] font-bold tracking-[-0.045em] leading-[0.97]">
              Get in<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>touch.</span>
            </h1>
            <p
              className="mt-8 text-[1.0625rem] leading-[1.8] font-light"
              style={{ color: "oklch(1 0 0 / 44%)" }}
            >
              Questions, feedback, or partnership inquiries — we'd love to hear from you.
              We reply within one business day.
            </p>

            <a
              href="mailto:hello@whoismrkt.com"
              className="mt-10 flex items-center gap-3 group"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-150"
                style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 9%)" }}
              >
                <Mail className="h-4 w-4" style={{ color: "oklch(1 0 0 / 55%)" }} />
              </div>
              <span
                className="font-display text-xl transition-colors duration-150"
                style={{ color: "oklch(1 0 0 / 55%)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 85%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 55%)"; }}
              >
                hello@whoismrkt.com
              </span>
            </a>

            <div className="mt-12 space-y-5 pt-10" style={{ borderTop: "1px solid oklch(1 0 0 / 7%)" }}>
              {[
                { label: "Creators", text: "Interested in joining MRKT and finding brand partnerships." },
                { label: "Brands",   text: "Want to run a creator campaign or explore our marketing tools." },
                { label: "Press",    text: "Media inquiries and partnership requests." },
              ].map((r) => (
                <div key={r.label}>
                  <div className="text-[11px] uppercase tracking-[0.2em] font-medium mb-1" style={{ color: "oklch(1 0 0 / 35%)" }}>
                    {r.label}
                  </div>
                  <p className="text-[0.875rem] leading-relaxed font-light" style={{ color: "oklch(1 0 0 / 40%)" }}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-7">
            <div
              className="rounded-2xl p-8 md:p-10"
              style={{ background: "oklch(0.07 0 0)", border: "1px solid oklch(1 0 0 / 9%)" }}
            >
              {done ? (
                <div className="py-16 text-center">
                  <div className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-chrome mb-4">
                    Message received.
                  </div>
                  <p className="font-light max-w-sm mx-auto leading-relaxed" style={{ color: "oklch(1 0 0 / 44%)" }}>
                    Thanks — we read everything and reply within one business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Your name *"  value={form.name}    onChange={set("name")}    required />
                    <Field label="Email *"       type="email"         value={form.email}   onChange={set("email")}   required />
                  </div>
                  <Field label="Company / brand (optional)" value={form.company} onChange={set("company")} />
                  <SelectField label="Topic" value={form.topic} onChange={set("topic")}>
                    <option value="">What's this about?</option>
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                  <TextAreaField
                    label="Message *"
                    value={form.message}
                    onChange={set("message")}
                    required
                    rows={5}
                    placeholder="Tell us what you need…"
                  />
                  <button
                    disabled={loading}
                    className="btn-primary w-full mt-1 h-12 rounded-full text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    {loading ? "Sending…" : <>Send message <ArrowUpRight className="h-4 w-4" /></>}
                  </button>
                  <p className="text-[11px] text-center" style={{ color: "oklch(1 0 0 / 22%)" }}>
                    We reply within one business day. Your details are never shared.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ── Field components ──────────────────────────────────────────

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "oklch(1 0 0 / 30%)" }}>
        {label}
      </span>
      <input
        {...props}
        className="mt-2 w-full h-11 rounded-xl outline-none px-4 text-[13.5px] transition-all duration-150"
        style={{ background: "oklch(0.065 0 0)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 84%)" }}
        onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "oklch(1 0 0 / 26%)"; props.onFocus?.(e); }}
        onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = "oklch(1 0 0 / 9%)";  props.onBlur?.(e);  }}
      />
    </label>
  );
}

function TextAreaField({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "oklch(1 0 0 / 30%)" }}>
        {label}
      </span>
      <textarea
        {...props}
        className="mt-2 w-full rounded-xl outline-none px-4 py-3 text-[13.5px] transition-all duration-150 resize-none"
        style={{ background: "oklch(0.065 0 0)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 84%)" }}
        onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "oklch(1 0 0 / 26%)"; }}
        onBlur={(e)  => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "oklch(1 0 0 / 9%)";  }}
      />
    </label>
  );
}

function SelectField({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "oklch(1 0 0 / 30%)" }}>
        {label}
      </span>
      <select
        {...props}
        className="mt-2 w-full h-11 rounded-xl outline-none px-4 text-[13.5px] transition-all duration-150 appearance-none"
        style={{ background: "oklch(0.065 0 0)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 84%)" }}
        onFocus={(e) => { (e.currentTarget as HTMLSelectElement).style.borderColor = "oklch(1 0 0 / 26%)"; }}
        onBlur={(e)  => { (e.currentTarget as HTMLSelectElement).style.borderColor = "oklch(1 0 0 / 9%)";  }}
      >
        {children}
      </select>
    </label>
  );
}
