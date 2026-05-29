import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/work")({
  head: () => ({
    meta: [
      { title: "Work — whoismrkt" },
      { name: "description", content: "Selected work from whoismrkt — luxury, hospitality, fashion, F&B and tech brands we've built, scaled and shipped." },
      { property: "og:title", content: "Work — whoismrkt" },
      { property: "og:description", content: "Selected work from whoismrkt." },
    ],
  }),
  component: Work,
});

const CASES = [
  { c: "Aurum Atelier", cat: "Luxury · Jewelry", t: "A heritage atelier reintroduced for a new generation.", n: "+418% reach · 22k new followers · 60 days" },
  { c: "Méridien Hotels", cat: "Hospitality", t: "Repositioning a 12-property hotel group around one story.", n: "1.2M views · 4× direct bookings · 1 quarter" },
  { c: "Studio 8", cat: "Architecture", t: "Building a content engine for a quiet, premium practice.", n: "+260% inbound leads · 9 months" },
  { c: "Volta", cat: "Tech · DTC", t: "Launching a category-defining product in a noisy market.", n: "$1.4M in pre-orders · launch month" },
  { c: "Maison Y", cat: "Fashion", t: "Turning a runway into a year-round social calendar.", n: "+312% engagement · 6 months" },
  { c: "Helio Wellness", cat: "F&B · Wellness", t: "Scaling a regional brand into a national household name.", n: "12 cities · 8× monthly revenue" },
];

function Work() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      <section className="px-6 pt-40 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">— Selected Work</div>
          <h1 className="font-display text-5xl md:text-8xl font-semibold tracking-tight leading-[0.9]">
            Brands that <span className="text-chrome">moved.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            A small selection of clients we've launched, scaled and rebuilt. Full case studies on request.
          </p>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-6">
          {CASES.map((p, i) => (
            <div
              key={p.c}
              className={`surface chrome-border rounded-2xl p-10 min-h-[420px] flex flex-col justify-between hover:surface-2 transition ${i % 3 === 0 ? "md:col-span-2" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{p.cat}</div>
                  <div className="font-display text-2xl mt-2">{p.c}</div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-display text-3xl md:text-5xl tracking-tight leading-[1.05] max-w-2xl">{p.t}</div>
                <div className="mt-6 text-chrome text-sm tracking-wider">{p.n}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
            Yours could be <span className="text-chrome">next.</span>
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
