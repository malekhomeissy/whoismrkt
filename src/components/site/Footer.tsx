import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="hairline-t mt-0">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5 space-y-6">
            <Logo />
            <p
              className="text-sm font-light leading-relaxed max-w-xs"
              style={{ color: "oklch(1 0 0 / 38%)" }}
            >
              The AI marketing operating system for creators and businesses.
            </p>
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-6 h-10 text-sm"
            >
              Get started <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-10">
            <FooterCol
              h="Product"
              links={[
                { to: "/login",            label: "Get started"    },
                { to: "/connect",         label: "MRKT Connect"   },
                { to: "/for-creators",    label: "For Creators"   },
                { to: "/for-businesses",  label: "For Businesses" },
              ]}
            />
            <FooterCol
              h="Company"
              links={[
                { to: "/about",   label: "About" },
                { to: "/contact", label: "Contact" },
              ]}
            />
            <FooterCol
              h="Connect"
              links={[
                { href: "mailto:hello@whoismrkt.com", label: "hello@whoismrkt.com" },
                { href: "https://instagram.com",      label: "Instagram" },
                { href: "https://tiktok.com",         label: "TikTok" },
                { href: "https://linkedin.com",       label: "LinkedIn" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="hairline-t">
        <div
          className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
          style={{ color: "oklch(1 0 0 / 28%)" }}
        >
          <div>© {new Date().getFullYear()} whoismrkt — All rights reserved.</div>
          <div
            className="font-display tracking-[0.2em] uppercase"
            style={{ color: "oklch(1 0 0 / 18%)" }}
          >
            MRKT
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  h,
  links,
}: {
  h: string;
  links: Array<{ to?: string; href?: string; label: string }>;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.22em] mb-4"
        style={{ color: "oklch(1 0 0 / 28%)" }}
      >
        {h}
      </div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) =>
          l.to ? (
            <li key={l.label}>
              <Link
                to={l.to}
                className="transition-colors duration-150"
                style={{ color: "oklch(1 0 0 / 40%)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 68%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 40%)"; }}
              >
                {l.label}
              </Link>
            </li>
          ) : (
            <li key={l.label}>
              <a
                href={l.href}
                className="transition-colors duration-150"
                style={{ color: "oklch(1 0 0 / 40%)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 68%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "oklch(1 0 0 / 40%)"; }}
                target={l.href?.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
                {l.label}
              </a>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
