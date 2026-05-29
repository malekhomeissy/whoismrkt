import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — whoismrkt" },
      { name: "description", content: "whoismrkt is an AI-native marketing studio. Strategists, creatives and engineers running the verbs of marketing for ambitious brands." },
      { property: "og:title", content: "About — whoismrkt" },
      { property: "og:description", content: "An AI-native marketing studio." },
    ],
  }),
  component: About,
});

const VALUES = [
  ["Decisions over deliverables", "We don't sell hours of work. We sell the right next move and the team to ship it."],
  ["AI inside, taste outside", "Models accelerate the verbs. Humans guard the brand. Both, on every project."],
  ["Small team, senior team", "No juniors learning on your account. The people who pitched you are the people who run it."],
  ["Numbers in the room", "Every monthly review starts with what moved and ends with what we'll change."],
];

function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      <section className="px-6 pt-40 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">— About</div>
          <h1 className="font-display text-5xl md:text-8xl font-semibold tracking-tight leading-[0.9]">
            A studio built for <span className="text-chrome">brands</span><br/>
            <span className="italic font-light">that want to move.</span>
          </h1>
          <p className="mt-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            whoismrkt is an AI-native marketing studio. We bring together strategists, creatives, editors, paid media operators and AI engineers under one roof — and run the verbs of marketing for the brands we love.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-16">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">— Values</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">What we believe.</h2>
          </div>
          <div className="space-y-px bg-white/5 hairline rounded-2xl overflow-hidden chrome-border">
            {VALUES.map(([t, d]) => (
              <div key={t} className="surface p-8">
                <div className="font-display text-2xl">{t}</div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 hairline-t">
        <div className="mx-auto max-w-7xl grid md:grid-cols-3 gap-px bg-white/5 hairline rounded-2xl overflow-hidden chrome-border">
          {[
            ["2023", "Founded"],
            ["40+", "Brands shipped"],
            ["6", "Disciplines under one roof"],
          ].map(([n, l]) => (
            <div key={l} className="surface p-10 text-center">
              <div className="font-display text-5xl text-chrome">{n}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95]">
            Let's <span className="text-chrome">build</span> something.
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
