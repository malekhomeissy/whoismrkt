import { Link, useLocation } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

type NavLink = {
  to: string;
  label: string;
  exactMatch?: boolean;
  noActive?: boolean;
};

const LINKS: NavLink[] = [
  { to: "/connect",        label: "MRKT Connect"   },
  { to: "/globe",          label: "MRKT Globe"     },
  { to: "/for-creators",   label: "For Creators"   },
  { to: "/for-businesses", label: "For Businesses" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const isActive = (l: NavLink) => {
    if (l.noActive) return false;
    if (l.exactMatch) return loc.pathname === l.to;
    return loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
  };

  const solid = scrolled || open;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid
          ? "bg-background/90 backdrop-blur-3xl border-b border-white/[0.055]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 h-[4.25rem] flex items-center justify-between gap-6">

        {/* ── Logo ──────────────────────────────────── */}
        <Link
          to="/"
          aria-label="whoismrkt home"
          className="shrink-0 opacity-85 hover:opacity-100 transition-opacity duration-200"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        {/* ── Center nav (desktop) ──────────────────── */}
        <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center" aria-label="Main">
          {LINKS.map((l) => {
            const active = isActive(l);
            return (
              <Link
                key={l.label}
                to={l.to}
                className={`relative py-1.5 text-[0.8125rem] whitespace-nowrap transition-colors duration-200 ${
                  active
                    ? "text-foreground/90 font-medium"
                    : "text-muted-foreground/48 hover:text-foreground/75 font-normal"
                }`}
              >
                {l.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 left-0 right-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, oklch(1 0 0 / 32%), transparent)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Right actions ─────────────────────────── */}
        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <Link
              to="/chat"
              className="btn-primary inline-flex h-9 items-center gap-2 rounded-full px-5 text-[0.8125rem]"
            >
              Open MRKT
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex h-9 items-center px-3.5 text-[0.8125rem] text-muted-foreground/45 hover:text-foreground/75 transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="btn-primary inline-flex h-9 items-center gap-2 rounded-full px-5 text-[0.8125rem]"
              >
                Get started
              </Link>
            </>
          )}

          {/* Hamburger — shown below lg */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden ml-2 p-2 text-muted-foreground/50 hover:text-foreground/80 transition-colors duration-200"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? (
              <X className="h-[1.125rem] w-[1.125rem]" />
            ) : (
              <Menu className="h-[1.125rem] w-[1.125rem]" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile / tablet drawer ────────────────────── */}
      <div
        className={`lg:hidden overflow-hidden transition-[max-height,opacity] ease-out duration-300 ${
          open ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-white/[0.05] bg-background/95 backdrop-blur-3xl px-6 pt-6 pb-10">
          <nav className="flex flex-col" aria-label="Mobile main">
            {LINKS.map((l) => {
              const active = isActive(l);
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`py-[1.125rem] text-[1.0625rem] border-b border-white/[0.04] last:border-b-0 transition-colors duration-150 ${
                    active
                      ? "text-foreground/90 font-medium"
                      : "text-muted-foreground/48 hover:text-foreground/80"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {!user && (
            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-5 h-10 text-sm self-start"
              >
                Get started
              </Link>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="text-sm text-muted-foreground/40 hover:text-foreground/70 transition-colors duration-150"
              >
                Sign in →
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
