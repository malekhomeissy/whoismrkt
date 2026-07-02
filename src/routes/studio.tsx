import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight, Sparkles, FileText, Megaphone, Zap, Layers, Video, Image, Palette } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "MRKT Studio — Content creation inside the operating system." },
      { name: "description", content: "MRKT Studio is the future of content creation — campaign assets, ad creatives, video production, and more, all connected to live campaigns." },
      { property: "og:title", content: "MRKT Studio" },
    ],
  }),
  component: StudioPage,
});

// ─── Design tokens ────────────────────────────────────────────────────────────
const EYEBROW = "text-[9.5px] uppercase tracking-[0.35em] font-semibold";
const eyebrowStyle = { color: "oklch(1 0 0 / 28%)" };
const bodyStyle    = { color: "oklch(1 0 0 / 46%)" };
const cardStyle    = { background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 8%)" };
const blueStyle    = { color: "oklch(0.72 0.10 224)" };

// ─── Studio mockup ────────────────────────────────────────────────────────────
function StudioMockup() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 10%)", boxShadow: "0 32px 80px -20px oklch(0 0 0 / 55%)" }}>
      {/* Topbar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid oklch(1 0 0 / 7%)", background: "oklch(0.055 0 0)" }}>
        <Sparkles className="h-3.5 w-3.5" style={blueStyle} />
        <span className={`${EYEBROW} text-[9px]`} style={eyebrowStyle}>MRKT Studio</span>
        <span className="ml-auto text-[9px] rounded-full px-2.5 py-0.5 font-medium" style={{ background: "oklch(0.78 0.14 60 / 12%)", color: "oklch(0.78 0.14 60)" }}>Live</span>
      </div>

      <div className="p-4 space-y-2">
        {/* Asset types */}
        <div className={`${EYEBROW} text-[8.5px] mb-2`} style={eyebrowStyle}>Generate for campaign</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: FileText, label: "Campaign brief",     sub: "AI-drafted",     ready: true  },
            { icon: Image,    label: "Ad creative",        sub: "Social formats",  ready: true  },
            { icon: Megaphone,label: "Influencer brief",   sub: "Creator-ready",   ready: true  },
            { icon: Video,    label: "Video generation",   sub: "Wave 3 · 2026",   ready: false },
          ].map(({ icon: Icon, label, sub, ready }) => (
            <div
              key={label}
              className="rounded-xl p-3.5"
              style={{ background: ready ? "oklch(1 0 0 / 4%)" : "oklch(1 0 0 / 2%)", border: `1px solid ${ready ? "oklch(1 0 0 / 9%)" : "oklch(1 0 0 / 5%)"}` }}
            >
              <Icon className="h-4 w-4 mb-2.5" style={{ color: ready ? "oklch(1 0 0 / 44%)" : "oklch(1 0 0 / 20%)" }} />
              <div className="text-[12px] font-semibold" style={{ color: ready ? "oklch(1 0 0 / 76%)" : "oklch(1 0 0 / 28%)" }}>{label}</div>
              <div className="text-[9.5px] mt-0.5" style={{ color: ready ? "oklch(1 0 0 / 34%)" : "oklch(1 0 0 / 20%)" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Output preview */}
        <div className="rounded-xl p-4 mt-1" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
          <div className="text-[8.5px] uppercase tracking-[0.22em] font-semibold mb-2" style={blueStyle}>Campaign brief output</div>
          <div className="text-[11.5px] leading-relaxed" style={{ color: "oklch(1 0 0 / 56%)" }}>
            <strong className="font-semibold" style={{ color: "oklch(1 0 0 / 74%)" }}>Ramadan 2026 — Fashion Campaign</strong><br />
            <span>Objective: Drive consideration among UAE women 18–34 ahead of Ramadan collection launch. 4 creators · IG Reels + TikTok · March 18 – April 10.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vision phases ────────────────────────────────────────────────────────────
const PHASES = [
  {
    phase: "Today",
    status: "Live",
    statusColor: "oklch(0.62 0.12 158)",
    title: "AI-written campaign briefs and outreach",
    desc: "MRKT Studio already generates campaign briefs, influencer outreach messages, content hooks, and captions — all connected to live campaigns and creator profiles.",
    features: ["Campaign brief generation", "Creator outreach messages", "Hook + caption writing", "Content concept ideation"],
  },
  {
    phase: "Wave 2",
    status: "In development",
    statusColor: "oklch(0.72 0.10 224)",
    title: "Ad creatives and visual asset generation",
    desc: "Generate social-ready ad creatives, story formats, and campaign visual assets — briefed by MRKT AI, ready for Meta, TikTok, and YouTube.",
    features: ["Social ad creative generation", "Story and Reel formats", "Brand-consistent outputs", "Campaign asset library"],
  },
  {
    phase: "Wave 3",
    status: "Coming 2026",
    statusColor: "oklch(0.78 0.14 60)",
    title: "Video generation — production inside the OS",
    desc: "Video content generated inside MRKT, connected to live campaigns. Not a separate tool. Not an external service. Production that knows your brand, your creators, and your audience.",
    features: ["AI video generation", "Campaign-connected production", "Creator collaboration layer", "Direct publish to platforms"],
  },
];

// ─── Principles ───────────────────────────────────────────────────────────────
const PRINCIPLES = [
  {
    title: "Connected, not standalone",
    desc: "Every asset generated in MRKT Studio is connected to a real campaign, a real creator, and a real brief. No file transfers. No copy-paste. Everything is already in context.",
  },
  {
    title: "Production, not prompting",
    desc: "MRKT Studio isn't a prompt interface. It's a production layer — briefed by your campaign, executed by AI, reviewed by your team.",
  },
  {
    title: "MENA-aware by default",
    desc: "Campaign assets know about Ramadan, Eid, Arabic language, regional platform preferences, and MENA audience behavior. Not global defaults. Local intelligence.",
  },
  {
    title: "The OS handles the workflow",
    desc: "Generated assets automatically attach to the right campaign, the right creator brief, and the right deliverable. The operating system handles the workflow so you don't have to.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function StudioPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -6%, oklch(0.14 0 0) 0%, oklch(0 0 0) 60%)" }}
        />

        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-9"
                style={{ background: "oklch(0.72 0.10 224 / 8%)", border: "1px solid oklch(0.72 0.10 224 / 20%)" }}
              >
                <Sparkles className="h-3 w-3" style={blueStyle} />
                <span className={`${EYEBROW} text-[9px]`} style={blueStyle}>MRKT Studio</span>
              </div>

              <h1 className="font-display text-[clamp(2.75rem,6vw,5.25rem)] font-bold tracking-[-0.048em] leading-[0.96]">
                Content creation
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>inside the OS.</span>
              </h1>

              <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-md" style={bodyStyle}>
                The future of campaign content is not a separate tool. It's production that
                lives inside your operating system — briefed by AI, connected to live campaigns,
                reviewed by your team.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
                >
                  Try Studio today — free <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <StudioMockup />
          </div>
        </div>
      </section>

      {/* ══ VISION PHASES ════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>The roadmap</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              From briefs to video.
              <br />
              <span style={{ color: "oklch(1 0 0 / 32%)" }}>Production inside MRKT.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {PHASES.map((phase) => (
              <div key={phase.phase} className="rounded-2xl p-7 md:p-9" style={cardStyle}>
                <div className="flex items-start justify-between mb-5 gap-4">
                  <div>
                    <div className={`${EYEBROW} text-[9px] mb-2`} style={eyebrowStyle}>{phase.phase}</div>
                    <h3 className="font-display text-[1.5rem] font-bold tracking-[-0.03em] leading-tight" style={{ color: "oklch(1 0 0 / 84%)" }}>
                      {phase.title}
                    </h3>
                  </div>
                  <span className="shrink-0 text-[9px] font-semibold rounded-full px-3 py-1 mt-1" style={{ color: phase.statusColor, background: `${phase.statusColor.replace(")", " / 12%)")}` }}>
                    {phase.status}
                  </span>
                </div>
                <p className="text-[1.0rem] leading-[1.82] font-light mb-6" style={bodyStyle}>{phase.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {phase.features.map((f) => (
                    <span key={f} className="text-[11.5px] font-medium rounded-full px-3 py-1" style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 9%)", color: "oklch(1 0 0 / 52%)" }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRINCIPLES ═══════════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <div className={EYEBROW} style={eyebrowStyle}>Philosophy</div>
              <h2 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.05]">
                Not a tool.
                <br />
                <span style={{ color: "oklch(1 0 0 / 32%)" }}>A production layer.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.82] font-light" style={bodyStyle}>
                Every content tool today is disconnected from the campaign it serves. MRKT Studio
                is different — because it's part of the operating system, not an add-on.
              </p>
            </div>
            <div className="space-y-3">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="rounded-2xl p-6" style={cardStyle}>
                  <div className="text-[13.5px] font-semibold mb-2" style={{ color: "oklch(1 0 0 / 82%)" }}>{p.title}</div>
                  <p className="text-[12.5px] leading-relaxed" style={bodyStyle}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CAPABILITY GRID ══════════════════════════════════════════════════ */}
      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className={EYEBROW} style={eyebrowStyle}>Capabilities</div>
            <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.04em] leading-[1.05]">
              What Studio creates.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: FileText,  label: "Campaign briefs",      desc: "Full campaign briefs with objectives, creator requirements, deliverables, and timeline — AI-drafted in 30 seconds.",  live: true  },
              { icon: Megaphone, label: "Influencer briefs",    desc: "Creator-ready briefs that explain the campaign goal, content direction, and approval process clearly.",                live: true  },
              { icon: Sparkles,  label: "Content hooks",        desc: "Viral-optimized hooks for Reels and TikTok, written for your niche, your voice, and the MENA market.",               live: true  },
              { icon: Palette,   label: "Ad creatives",         desc: "Social-ready ad formats for Meta and TikTok — generated from your campaign brief automatically.",                     live: false },
              { icon: Layers,    label: "Story formats",        desc: "Swipeable Instagram Story sequences and TikTok carousel formats, optimized for MENA engagement patterns.",           live: false },
              { icon: Video,     label: "Video generation",     desc: "AI-generated video content connected directly to your live campaigns and creator briefs. Wave 3 — launching 2026.", live: false },
            ].map(({ icon: Icon, label, desc, live }) => (
              <div key={label} className="rounded-2xl p-6" style={{ background: live ? "oklch(1 0 0 / 2.5%)" : "oklch(1 0 0 / 1.5%)", border: `1px solid ${live ? "oklch(1 0 0 / 8%)" : "oklch(1 0 0 / 5%)"}` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(1 0 0 / 6%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                    <Icon className="h-4 w-4" style={{ color: live ? "oklch(1 0 0 / 46%)" : "oklch(1 0 0 / 22%)" }} />
                  </div>
                  <span className="text-[8.5px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: live ? "oklch(0.62 0.12 158)" : "oklch(1 0 0 / 24%)", background: live ? "oklch(0.62 0.12 158 / 10%)" : "oklch(1 0 0 / 4%)" }}>
                    {live ? "Live now" : "Launching soon"}
                  </span>
                </div>
                <div className="text-[13px] font-semibold mb-1.5" style={{ color: live ? "oklch(1 0 0 / 82%)" : "oklch(1 0 0 / 38%)" }}>{label}</div>
                <p className="text-[12px] leading-relaxed" style={{ color: live ? "oklch(1 0 0 / 44%)" : "oklch(1 0 0 / 28%)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
            style={{ background: "oklch(0.72 0.10 224 / 8%)", border: "1px solid oklch(0.72 0.10 224 / 18%)" }}
          >
            <Sparkles className="h-3 w-3" style={blueStyle} />
            <span className={`${EYEBROW} text-[9px]`} style={blueStyle}>Available now</span>
          </div>
          <h2 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-bold tracking-[-0.048em] leading-[0.96]">
            Content creation
            <br />
            <span style={{ color: "oklch(1 0 0 / 32%)" }}>that knows your campaign.</span>
          </h2>
          <p className="mt-7 text-[1.0625rem] leading-[1.82] font-light max-w-sm mx-auto" style={bodyStyle}>
            Write briefs, generate hooks, plan content — all
            connected to your live campaigns.
          </p>
          <Link
            to="/login"
            className="btn-primary mt-9 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base font-medium"
          >
            Try Studio — free <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
