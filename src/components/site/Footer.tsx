import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="hairline-t mt-24">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5 space-y-6">
            <Logo />
            <p className="font-display text-3xl md:text-4xl tracking-tight leading-[1.05] max-w-md">
              Have something worth post<span className="text-muted-foreground">ing</span>?
            </p>
            <Link to="/contact" className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-11 text-sm">
              Start a project <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-10">
            <FooterCol h="Studio" links={[
              { to: "/services", label: "Services" },
              { to: "/work", label: "Work" },
              { to: "/manifesto", label: "Manifesto" },
              { to: "/about", label: "About" },
            ]} />
            <FooterCol h="Contact" links={[
              { to: "/contact", label: "Start a project" },
              { href: "mailto:hello@whoismrkt.com", label: "hello@whoismrkt.com" },
            ]} />
            <FooterCol h="Social" links={[
              { href: "https://instagram.com", label: "Instagram" },
              { href: "https://tiktok.com", label: "TikTok" },
              { href: "https://linkedin.com", label: "LinkedIn" },
            ]} />
          </div>
        </div>
      </div>

      <div className="hairline-t">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} whoismrkt — All rights reserved.</div>
          <div className="font-display tracking-[0.3em] uppercase">We do the ing.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ h, links }: { h: string; links: Array<{ to?: string; href?: string; label: string }> }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">{h}</div>
      <ul className="space-y-2 text-sm">
        {links.map((l) =>
          l.to ? (
            <li key={l.label}><Link to={l.to} className="hover:text-chrome transition">{l.label}</Link></li>
          ) : (
            <li key={l.label}><a href={l.href} className="hover:text-chrome transition" target={l.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{l.label}</a></li>
          )
        )}
      </ul>
    </div>
  );
}
