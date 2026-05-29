import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — whoismrkt" },
      { name: "description", content: "We do the ing. The whoismrkt manifesto on what marketing actually is in the AI era." },
      { property: "og:title", content: "Manifesto — whoismrkt" },
      { property: "og:description", content: "We do the ing." },
    ],
  }),
  component: Manifesto,
});

function Manifesto() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      <section className="px-6 pt-40 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">— Manifesto</div>
          <h1 className="font-display text-5xl md:text-[7rem] font-semibold leading-[0.9] tracking-tight">
            You do the brand<span className="text-muted-foreground">.</span><br/>
            <span className="italic font-light">We do</span> <span className="text-chrome">the ing.</span>
          </h1>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl space-y-8 text-lg leading-relaxed text-muted-foreground">
          <p className="text-foreground font-display text-2xl md:text-3xl leading-snug">
            Marketing has been turned into a to-do list. It was supposed to be a decision.
          </p>
          <p>
            Everyone talks about post<span className="text-foreground">ing</span>, plann<span className="text-foreground">ing</span>, schedul<span className="text-foreground">ing</span>, edit<span className="text-foreground">ing</span>, optimiz<span className="text-foreground">ing</span>, report<span className="text-foreground">ing</span>. The verbs piled up. The brand got buried.
          </p>
          <p>
            whoismrkt was built to take all of that off your desk. Not the strategy — the strategy is yours. Not the brand — that's why people fall in love with you in the first place.
          </p>
          <p>
            We do the ing.
          </p>
          <p>
            Every research call. Every storyboard. Every cut, caption, comment, dashboard and decision. Powered by AI where it makes things faster — finished by people where it makes things better.
          </p>
          <p>
            We don't sell hours. We sell the result of having a real team — strategists, creatives, editors, paid media operators and AI engineers — quietly running the verbs in the background while you run the company.
          </p>
          <p className="text-foreground font-display text-2xl md:text-3xl leading-snug pt-4">
            You stop guessing. You start shipping. We do the ing.
          </p>
        </div>
      </section>

      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-5xl text-center">
          <Link to="/contact" className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-14 text-base">
            Start a project <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
