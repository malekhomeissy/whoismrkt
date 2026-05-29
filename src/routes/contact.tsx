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
      { title: "Start a project — whoismrkt" },
      { name: "description", content: "Tell us about the brand and what you need. We typically reply within one business day." },
      { property: "og:title", content: "Start a project — whoismrkt" },
      { property: "og:description", content: "Tell us about the brand. We reply within a business day." },
    ],
  }),
  component: Contact,
});

const BUDGETS = ["< $5k / month", "$5k–15k / month", "$15k–40k / month", "$40k+ / month", "One-off project"];

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", company: "", budget: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return toast.error("Please fill the required fields.");
    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      name: form.name,
      email: form.email,
      company: form.company || null,
      budget: form.budget || null,
      message: form.message,
      source: "website",
    });
    setLoading(false);
    if (error) return toast.error("Something went wrong. Please email hello@whoismrkt.com.");
    setDone(true);
    toast.success("Message received — we'll reply within one business day.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      <section className="px-6 pt-40 pb-20">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">— Start a project</div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[0.9]">
              Tell us about <span className="text-chrome">the brand.</span>
            </h1>
            <p className="mt-8 max-w-md text-muted-foreground leading-relaxed">
              We reply within one business day. If it's faster, write us directly.
            </p>
            <a href="mailto:hello@whoismrkt.com" className="mt-8 inline-flex items-center gap-3 text-sm group">
              <Mail className="h-4 w-4 text-chrome" />
              <span className="font-display text-xl group-hover:text-chrome transition">hello@whoismrkt.com</span>
            </a>

            <div className="mt-16 hairline-t pt-8 space-y-4 text-sm text-muted-foreground">
              <div><span className="text-foreground">Studio</span><br/>By appointment only.</div>
              <div><span className="text-foreground">Hours</span><br/>Mon–Fri, 09:00–19:00 CET.</div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="surface chrome-border rounded-2xl p-8 md:p-10">
              {done ? (
                <div className="py-16 text-center">
                  <div className="font-display text-3xl md:text-4xl text-chrome">Message received.</div>
                  <p className="mt-4 text-muted-foreground max-w-md mx-auto">Thanks — we read everything and reply within one business day.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Your name *" value={form.name} onChange={set("name")} required />
                    <Field label="Email *" type="email" value={form.email} onChange={set("email")} required />
                  </div>
                  <Field label="Company / brand" value={form.company} onChange={set("company")} />
                  <Select label="Budget" value={form.budget} onChange={set("budget")}>
                    <option value="">Select range</option>
                    {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </Select>
                  <TextArea label="What do you need? *" value={form.message} onChange={set("message")} required rows={6} />
                  <button disabled={loading} className="btn-primary w-full mt-2 h-12 rounded-full text-sm inline-flex items-center justify-center gap-2">
                    {loading ? "Sending…" : <>Send message <ArrowUpRight className="h-4 w-4" /></>}
                  </button>
                  <p className="text-xs text-muted-foreground">By sending, you agree to be contacted about your project. We never share your details.</p>
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

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input {...props} className="mt-2 w-full h-11 rounded-lg bg-black/40 border border-white/10 focus:border-white/40 outline-none px-4 text-sm transition" />
    </label>
  );
}

function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <textarea {...props} className="mt-2 w-full rounded-lg bg-black/40 border border-white/10 focus:border-white/40 outline-none px-4 py-3 text-sm transition resize-none" />
    </label>
  );
}

function Select({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <select {...props} className="mt-2 w-full h-11 rounded-lg bg-black/40 border border-white/10 focus:border-white/40 outline-none px-4 text-sm transition">
        {children}
      </select>
    </label>
  );
}
