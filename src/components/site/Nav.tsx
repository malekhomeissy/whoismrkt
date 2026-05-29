import { Link, useLocation } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useState, useEffect } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { to: "/services", label: "Services" },
  { to: "/work",     label: "Work" },
  { to: "/studio",   label: "Studio" },
  { to: "/about",    label: "About" },
  { to: "/connect",  label: "Connect" },
] as const;

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

  const solid = scrolled || open;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid
          ? "bg-background/90 backdrop-blur-3xl border-b border-white/[0.055]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 h-[4.5rem] flex items-center justify-between">

        {/* Logo */}
        <Link
          to="/"
          aria-label="whoismrkt home"
          className="shrink-0 opacity-85 hover:opacity-100 transition-opacity duration-200"
          onClick={() => setOpen(false)}
        >
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main">
          {LINKS.map((l) => {
            const active = loc.pathname === l.to || loc.pathname.startsWith(l.to + "/");
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative py-1.5 text-[0.8125rem] transition-colors duration-200 ${
                  active
                    ? "text-foreground/90 font-medium"
                    : "text-muted-foreground/50 hover:text-foreground/75 font-normal"
                }`}
              >
                {l.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-0.5 left-0 right-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 32%), transparent)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {user ? (
            <Link
              to="/chat"
              className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.8125rem]"
            >
              <Sparkles className="h-3.5 w-3.5" />
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
                to="/onboarding"
                className="btn-primary inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.8125rem]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Try MRKT
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden ml-2 p-2 text-muted-foreground/50 hover:text-foreground/80 transition-colors duration-200"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-[1.125rem] w-[1.125rem]" /> : <Menu className="h-[1.125rem] w-[1.125rem]" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] ease-out duration-300 ${
          open ? "max-h-[36rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-white/[0.05] bg-background/95 backdrop-blur-3xl px-6 pt-6 pb-10">
          <nav className="flex flex-col" aria-label="Mobile main">
            {LINKS.map((l) => {
              const active = loc.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`py-[1.125rem] text-[1.0625rem] border-b border-white/[0.04] last:border-b-0 transition-colors duration-150 ${
                    active ? "text-foreground/90 font-medium" : "text-muted-foreground/48 hover:text-foreground/80"
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
                to="/onboarding"
                onClick={() => setOpen(false)}
                className="btn-primary inline-flex items-center gap-1.5 rounded-full px-5 h-10 text-sm self-start"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Try MRKT free
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
