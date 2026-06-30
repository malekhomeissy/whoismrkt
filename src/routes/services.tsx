import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — MRKT" },
      { name: "description", content: "Brand strategy, content production, social management, performance marketing, AI systems and web. End-to-end marketing for ambitious brands." },
      { property: "og:title", content: "Services — MRKT" },
      { property: "og:description", content: "End-to-end marketing for ambitious brands." },
    ],
  }),
  component: Services,
});

const SERVICES = [
  {
    k: "01",
    t: "Brand Strategy",
    d: "We start where most agencies skip: positioning, voice, narrative and visual system. The brand brief becomes the operating system for everything we ship after.",
    items: ["Positioning & messaging", "Visual identity", "Tone of voice", "Customer & competitor research"],
  },
  {
    k: "02",
    t: "Content Production",
    d: "Reels, photo, copy, carousels, campaigns. We script, shoot, edit and publish — weekly, in your voice, at a pace in-house teams can't match.",
    items: ["Short-form video", "Photography & art direction", "Copy & captions", "Campaign concepts"],
  },
  {
    k: "03",
    t: "Social Management",
    d: "Strategy, calendar, scheduling, community management and analytics. One team owns the channel and the result.",
    items: ["Editorial calendar", "Community management", "Monthly analytics", "Always-on optimization"],
  },
  {
    k: "04",
    t: "Performance Marketing",
    d: "Meta, TikTok and Google paid media built around the creative that's already converting organically. Spend goes where the data points.",
    items: ["Paid social", "Search & YouTube", "Creative testing", "Attribution & reporting"],
  },
  {
    k: "05",
    t: "AI Systems",
    d: "Custom AI workflows that turn your brand into a 24/7 content and decision engine — research, ideation, drafting, repurposing and reporting.",
    items: ["Custom AI workflows", "Content automation", "Trend monitoring", "Internal copilots"],
  },
  {
    k: "06",
    t: "Web & Identity",
    d: "Sites, decks, lookbooks and brand assets that look like the company you're becoming. Designed in-house, built to ship fast.",
    items: ["Marketing sites", "Landing pages", "Pitch decks", "Brand collateral"],
  },
];

const PROCESS = [
  ["01", "Discover", "Two weeks of interviews, audits and analytics. We map your brand, your audience and what actually converts."],
  ["02", "Design", "Strategy doc, channel plan, creative system and 90-day roadmap. Approved before a single asset is produced."],
  ["03", "Deliver", "Weekly content, monthly campaigns, always-on community and paid. Same team, every cycle."],
  ["04", "Decide", "Monthly review with the data. Double down on what's working, kill what isn't. Then repeat."],
];

function Services() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      <section className="px-6 pt-40 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">— Services</div>
          <h1 className="font-display text-5xl md:text-8xl font-semibold tracking-tight leading-[0.9]">
            Everything between <span className="text-chrome">the idea</span><br/>
            and <span className="italic font-light">the result.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Six disciplines, one team. Whether you need a single launch or a full
            in-house replacement — the contract scales, the standard doesn't.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl space-y-px bg-white/5 hairline rounded-2xl overflow-hidden chrome-border">
          {SERVICES.map((s) => (
            <div key={s.k} className="surface p-10 md:p-14 grid md:grid-cols-12 gap-8">
              <div className="md:col-span-3">
                <div className="font-display text-xs text-muted-foreground tracking-[0.2em]">{s.k}</div>
                <h2 className="font-display text-3xl md:text-4xl mt-4">{s.t}</h2>
              </div>
              <div className="md:col-span-6 text-muted-foreground leading-relaxed">{s.d}</div>
              <div className="md:col-span-3">
                <ul className="space-y-2 text-sm">
                  {s.items.map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="h-px w-4 bg-white/40 mt-3 shrink-0" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">— Process</div>
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mb-16">How we work.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 hairline rounded-2xl overflow-hidden chrome-border">
            {PROCESS.map(([k, t, d]) => (
              <div key={k} className="surface p-8 min-h-[240px]">
                <div className="font-display text-xs text-muted-foreground tracking-[0.2em]">{k}</div>
                <h3 className="font-display text-2xl mt-8">{t}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
            Ready to start the <span className="text-chrome">ing</span>?
          </h2>
          <Link to="/contact" className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-8 h-14 text-base">
            Start a project <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
