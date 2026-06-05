// ─────────────────────────────────────────────────────────────────────────────
// AppShell — persistent platform navigation for all authenticated pages.
//
// Architecture:
//   [220px sidebar: logo + nav sections + user footer]
//   [flex-1 content: children fills the rest]
//
// Nav sections adapt to account type (creator vs business).
// Active state is derived from the current router pathname.
// ─────────────────────────────────────────────────────────────────────────────

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import {
  LayoutDashboard, Layers, Users, Zap,
  BarChart2, LogOut, Settings,
  PenLine, Globe, MessageSquare, Plus, Sparkles, Briefcase, ArrowLeft,
  CalendarDays,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  canvas:         "#000",
  base:           "oklch(0.075 0 0)",
  surface:        "oklch(0.11 0 0)",
  raised:         "oklch(0.15 0 0)",
  borderSubtle:   "oklch(1 0 0 / 9%)",
  borderNormal:   "oklch(1 0 0 / 13%)",
  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",
  chrome:         "oklch(0.82 0.005 250)",
  accent:         "oklch(0.72 0.14 152)",
} as const;

// ─── Account helpers ──────────────────────────────────────────────────────────

interface ShellProfile {
  name: string | null;
  account_type: string | null;
  onboarding_path: string | null;
}

function isCreator(p: ShellProfile | null) {
  return p?.account_type === "creator" || p?.onboarding_path === "creator";
}

function isBusiness(p: ShellProfile | null) {
  if (!p) return false;
  return (
    p.account_type === "brand" ||
    p.account_type === "business" ||
    p.onboarding_path === "business_creator" ||
    p.onboarding_path === "business_marketing"
  );
}

const AVATAR_COLORS = [
  "oklch(0.68 0.12 25)", "oklch(0.66 0.09 250)",
  "oklch(0.64 0.11 160)", "oklch(0.70 0.10 300)",
  "oklch(0.72 0.09 60)",  "oklch(0.65 0.10 190)",
];
function avatarBg(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ─── Nav primitives ───────────────────────────────────────────────────────────

function NavSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        className="px-2.5 pb-1 pt-0.5 text-[9px] font-semibold uppercase tracking-[0.32em]"
        style={{ color: C.textMuted }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function NavItem({
  icon: Icon, label, to, exact = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  exact?: boolean;
}) {
  const routerState = useRouterState();
  const pathname    = routerState.location.pathname;

  const isActive = exact
    ? pathname === to
    : pathname === to || pathname.startsWith(to + "/") || (to !== "/" && pathname.startsWith(to));

  return (
    <Link
      to={to as "/"}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 mb-[1px] text-[13px] font-medium transition-all duration-100"
      style={{
        background: isActive ? "oklch(1 0 0 / 9%)"  : "transparent",
        color:      isActive ? C.textPrimary          : C.textTertiary,
        boxShadow:  isActive ? "inset 0 1px 0 oklch(1 0 0 / 8%)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)";
          (e.currentTarget as HTMLElement).style.color      = C.textSecondary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color      = C.textTertiary;
        }
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Link>
  );
}

function NavItemSoon({
  icon: Icon, label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => toast.info(`${label} is coming soon.`)}
      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 mb-[1px] text-[13px] font-medium transition-all duration-100 text-left"
      style={{ color: C.textMuted, cursor: "pointer" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)";
        (e.currentTarget as HTMLElement).style.color      = C.textTertiary;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color      = C.textMuted;
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{label}</span>
      <span
        className="text-[8px] uppercase tracking-[0.22em] font-semibold rounded-full px-1.5 py-0.5 shrink-0"
        style={{ background: "oklch(0.78 0.12 60 / 12%)", color: "oklch(0.78 0.12 60 / 55%)", border: "1px solid oklch(0.78 0.12 60 / 18%)" }}
      >
        Soon
      </span>
    </button>
  );
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────

function MobileTopBar() {
  return (
    <div
      className="flex md:hidden h-[52px] px-4 items-center shrink-0"
      style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: C.base }}
    >
      <Link to="/chat"><Logo /></Link>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ShellProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name,account_type,onboarding_path")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data as ShellProfile ?? null));
  }, [user]);

  const creatorAccount  = isCreator(profile);
  const businessAccount = isBusiness(profile);
  const displayName     = profile?.name ?? user?.email?.split("@")[0] ?? "Account";
  const initial         = displayName[0]?.toUpperCase() ?? "M";

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden" style={{ background: C.canvas }}>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <MobileTopBar />

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex w-[220px] flex-none flex-col"
        style={{
          background:  C.base,
          borderRight: `1px solid ${C.borderSubtle}`,
          boxShadow:   "1px 0 0 oklch(1 0 0 / 4%)",
        }}
      >
        {/* Logo */}
        <div
          className="h-[56px] px-4 flex items-center shrink-0"
          style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
        >
          <Link to="/chat"><Logo /></Link>
        </div>

        {/* Back to main site */}
        <div className="px-3 pt-2 pb-1 shrink-0">
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] transition-all duration-100 w-full"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)";
              (e.currentTarget as HTMLElement).style.color      = C.textTertiary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color      = C.textMuted;
            }}
          >
            <ArrowLeft className="h-3 w-3 shrink-0" />
            Back to home
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-5">

          {/* ── Creator sidebar ───────────────────────────────────────── */}
          {creatorAccount && (
            <>
              <NavSection label="Workspace">
                <NavItem icon={LayoutDashboard} label="Dashboard"         to="/chat"      exact />
                <NavItem icon={BarChart2}       label="Creator Analytics" to="/analytics" exact />
                <NavItem icon={Layers}          label="Projects"          to="/projects"       />
              </NavSection>

              <NavSection label="Creator">
                <NavItem icon={Users}   label="My Creator Profile" to="/profile"          exact />
                <NavItem icon={PenLine} label="Edit Profile"       to="/creator-onboarding"    />
                <NavItem icon={Zap}     label="Opportunities"      to="/opportunities"         />
              </NavSection>

              <NavSection label="Discover">
                <NavItem icon={Globe} label="MRKT Globe" to="/globe" />
              </NavSection>

              <NavSection label="Content">
                <NavItem icon={CalendarDays} label="Content Planner" to="/content-planner" />
              </NavSection>

              <NavSection label="AI">
                <NavItem icon={MessageSquare} label="New Chat" to="/chat" exact />
              </NavSection>
            </>
          )}

          {/* ── Business sidebar ──────────────────────────────────────── */}
          {businessAccount && (
            <>
              <NavSection label="Workspace">
                <NavItem icon={LayoutDashboard} label="Dashboard" to="/chat"     exact />
                <NavItem icon={Layers}          label="Projects"  to="/projects"       />
              </NavSection>

              <NavSection label="Marketplace">
                <NavItem icon={Users}  label="Find Creators" to="/find-creators" />
                <NavItem icon={Globe}  label="MRKT Globe"    to="/globe" />
              </NavSection>

              <NavSection label="Campaigns">
                <NavItem icon={Briefcase} label="Pipeline"  to="/pipeline" />
                <NavItem icon={Plus}      label="Campaign"  to="/campaign-create" exact />
              </NavSection>

              <NavSection label="Content">
                <NavItem icon={CalendarDays} label="Content Planner" to="/content-planner" />
              </NavSection>

              <NavSection label="AI">
                <NavItem icon={MessageSquare} label="New Chat" to="/chat" exact />
              </NavSection>
            </>
          )}

          {/* ── Fallback for unrecognised account types ────────────────── */}
          {!creatorAccount && !businessAccount && (
            <NavSection label="Workspace">
              <NavItem icon={LayoutDashboard} label="Dashboard" to="/chat"     exact />
              <NavItem icon={Layers}          label="Projects"  to="/projects"       />
              <NavItem icon={Sparkles}        label="New Chat"  to="/chat"     exact />
            </NavSection>
          )}

        </nav>

        {/* User footer */}
        <div
          className="shrink-0 px-3 pb-3 pt-2 space-y-1"
          style={{ borderTop: `1px solid ${C.borderSubtle}` }}
        >
          <Link
            to="/profile"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 w-full transition-all duration-100"
            style={{ color: C.textTertiary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)";
              (e.currentTarget as HTMLElement).style.color      = C.textSecondary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color      = C.textTertiary;
            }}
          >
            <div
              className="h-[26px] w-[26px] rounded-full flex-none flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: avatarBg(displayName), color: "oklch(0.08 0 0)" }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate leading-tight" style={{ color: C.textSecondary }}>
                {displayName}
              </div>
            </div>
            <Settings className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
          </Link>

          <button
            onClick={async () => { await signOut(); window.location.href = "/login"; }}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-100 text-left"
            style={{ color: C.textMuted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color      = "oklch(0.70 0.18 25)";
              (e.currentTarget as HTMLElement).style.background = "oklch(0.65 0.18 25 / 8%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color      = C.textMuted;
              (e.currentTarget as HTMLElement).style.background = "";
            }}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content area ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
