import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import {
  ArrowUpRight, Sparkles, CalendarDays,
  Users, Zap, Home,
  Settings, Plus, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MRKT — AI marketing operating system" },
      { name: "description", content: "One workspace for strategy, content, campaigns, and creator partnerships. The AI marketing operating system for creators and businesses." },
      { property: "og:title", content: "MRKT — AI marketing operating system" },
      { property: "og:description", content: "One workspace for strategy, content, campaigns, and creator partnerships." },
    ],
  }),
  component: Landing,
});

// ─────────────────────────────────────────────────────────────
// Design tokens — same material system as the app interior
// ─────────────────────────────────────────────────────────────
//   canvas   L ≈ 04%   page background
//   base     L ≈ 09%   window outer / panel frames
//   sidebar  L ≈ 07%   sidebar panels (slightly darker than base — correct)
//   surface  L ≈ 14%   cards on canvas
//   raised   L ≈ 18%   nested / elevated items
//   high     L ≈ 22%   highest elevation
//
// Shadow formula:  inset 0 1px 0 {top-edge-highlight}, drop shadow

// ─────────────────────────────────────────────────────────────
// Sparkline
// ─────────────────────────────────────────────────────────────
function Sparkline({ d }: { d: string }) {
  return (
    <svg className="w-full" style={{ height: 18 }} viewBox="0 0 80 18" fill="none" preserveAspectRatio="none">
      <path d={d} stroke="oklch(1 0 0 / 32%)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard data
// ─────────────────────────────────────────────────────────────
const STATS = [
  { label: "Content Scheduled", value: "24",   change: "+12%", spark: "M0,15 C13,13 26,11 40,8 C53,5 66,4 80,2"   },
  { label: "Campaigns Active",  value: "7",    change: "+3",   spark: "M0,13 C13,12 26,10 40,8 C53,6 66,4 80,1"   },
  { label: "Total Reach",       value: "1.2M", change: "+18%", spark: "M0,15 C13,12 26,9  40,7 C53,5 66,3 80,1"   },
  { label: "Engagement Rate",   value: "8.6%", change: "+4%",  spark: "M0,14 C13,13 26,10 40,8 C53,6 66,3 80,0.5" },
];

const DASHBOARD_CREATORS = [
  { initial: "A", name: "Alexandra Silva",  role: "Lifestyle Creator", followers: "523K", bg: "oklch(0.72 0.1 25)"  },
  { initial: "D", name: "Darnell Brooks",   role: "Fitness Creator",   followers: "287K", bg: "oklch(0.62 0.08 250)" },
  { initial: "S", name: "Sophie Kim",       role: "UGC Creator",       followers: "134K", bg: "oklch(0.66 0.09 160)" },
];

const CALENDAR_POSTS = [
  { day: "Mon", date: "26", post: "Instagram Reel",  time: "10:00 AM", dot: "oklch(0.72 0.16 300)" },
  { day: "Tue", date: "27", post: "TikTok Video",    time: "12:00 PM", dot: "oklch(0.88 0 0)"      },
  { day: "Wed", date: "28", post: null, time: null, dot: null },
  { day: "Thu", date: "29", post: "Carousel Post",   time: "9:00 AM",  dot: "oklch(0.65 0.14 250)" },
  { day: "Fri", date: "30", post: "YouTube Short",   time: "11:00 AM", dot: "oklch(0.65 0.18 25)"  },
  { day: "Sat", date: "31", post: "Blog Post",       time: "2:00 PM",  dot: "oklch(0.55 0 0)"      },
  { day: "Sun", date: "1",  post: null, time: null, dot: null },
];

const SIDEBAR_NAV = [
  { Icon: Home,     label: "Home",          active: true  },
  { Icon: Sparkles, label: "AI Strategist", active: false },
  { Icon: Zap,      label: "Opportunities", active: false },
  { Icon: Users,    label: "MRKT Connect",  active: false },
  { Icon: Settings, label: "Settings",      active: false },
];

const AVATAR_STACK = [
  "oklch(0.72 0.1 25)",
  "oklch(0.62 0.08 250)",
  "oklch(0.66 0.09 160)",
  "oklch(0.68 0.11 310)",
];

// macOS traffic light colors
const DOTS = [
  "oklch(0.63 0.20 25)",   // red
  "oklch(0.74 0.17 65)",   // amber
  "oklch(0.63 0.18 140)",  // green
];

// ─────────────────────────────────────────────────────────────
// Flagship dashboard window
// ─────────────────────────────────────────────────────────────
function FlagshipWindow() {
  return (
    <div
      className="relative w-full max-w-[1120px] mx-auto mt-14 rounded-[20px] overflow-hidden"
      style={{
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(1 0 0 / 16%)",
        boxShadow: [
          "inset 0 1px 0 oklch(1 0 0 / 14%)",   // top-edge chrome highlight
          "0 0 0 1px oklch(1 0 0 / 6%)",          // faint outer ring
          "0 32px 64px -12px oklch(0 0 0 / 75%)", // main drop shadow
          "0 64px 120px -24px oklch(0 0 0 / 55%)", // deep ambient
        ].join(", "),
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 h-10 shrink-0"
        style={{ background: "oklch(0.075 0 0)", borderBottom: "1px solid oklch(1 0 0 / 12%)" }}
      >
        {/* macOS-style traffic lights */}
        <div className="flex items-center gap-1.5">
          {DOTS.map((bg, i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: bg, boxShadow: `0 0 4px ${bg}40` }}
            />
          ))}
        </div>
        {/* URL bar — correct branding: whoismrkt.com */}
        <div
          className="flex-1 mx-4 h-[22px] rounded-md flex items-center justify-center text-[10px] tracking-wider"
          style={{
            background: "oklch(0.06 0 0)",
            border: "1px solid oklch(1 0 0 / 10%)",
            color: "oklch(1 0 0 / 38%)",
          }}
        >
          whoismrkt.com
        </div>
      </div>

      {/* Three-panel app layout */}
      <div className="flex" style={{ height: 560 }}>

        {/* ── Left sidebar ─────────────────────── */}
        <div
          className="hidden md:flex w-[196px] flex-col shrink-0 py-4"
          style={{
            background: "oklch(0.08 0 0)",
            borderRight: "1px solid oklch(1 0 0 / 12%)",
          }}
        >
          <div className="px-4 mb-5">
            <span
              className="font-display text-[13px] font-bold tracking-[0.12em] uppercase"
              style={{ color: "oklch(1 0 0 / 90%)" }}
            >
              MRKT
            </span>
          </div>

          <div className="px-2 space-y-0.5">
            {SIDEBAR_NAV.map(({ Icon, label, active }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[11.5px]"
                style={{
                  background: active ? "oklch(1 0 0 / 12%)" : "transparent",
                  color: active ? "oklch(1 0 0 / 92%)" : "oklch(1 0 0 / 42%)",
                  boxShadow: active ? "inset 0 1px 0 oklch(1 0 0 / 14%)" : "none",
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Main content ─────────────────────── */}
        <div
          className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 gap-3"
          style={{ borderRight: "1px solid oklch(1 0 0 / 10%)" }}
        >
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-2.5 shrink-0">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3"
                style={{
                  background: "oklch(0.15 0 0)",
                  border: "1px solid oklch(1 0 0 / 14%)",
                  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 12%), 0 2px 6px oklch(0 0 0 / 50%)",
                }}
              >
                <div className="text-[9.5px] truncate" style={{ color: "oklch(1 0 0 / 48%)" }}>
                  {s.label}
                </div>
                <div className="flex items-end justify-between mt-1.5">
                  <div
                    className="font-display text-[1.2rem] font-semibold tracking-tight leading-none"
                    style={{ color: "oklch(1 0 0 / 92%)" }}
                  >
                    {s.value}
                  </div>
                  <div
                    className="text-[8.5px] rounded px-1 py-0.5 font-medium"
                    style={{
                      color: "oklch(0.72 0.14 152)",
                      background: "oklch(0.72 0.14 152 / 16%)",
                    }}
                  >
                    {s.change}
                  </div>
                </div>
                <Sparkline d={s.spark} />
              </div>
            ))}
          </div>

          {/* AI Strategist prompt — the centerpiece */}
          <div
            className="rounded-xl p-3.5 shrink-0"
            style={{
              background: "oklch(0.15 0 0)",
              border: "1px solid oklch(1 0 0 / 14%)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 14%), 0 4px 12px oklch(0 0 0 / 55%)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 35% 30%, oklch(0.55 0 0), oklch(0.18 0 0))",
                  boxShadow: "0 0 0 1px oklch(1 0 0 / 16%), 0 2px 10px oklch(0 0 0 / 60%)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: "oklch(1 0 0 / 86%)" }} />
              </div>
              <div>
                <div className="text-[12px] font-semibold" style={{ color: "oklch(1 0 0 / 90%)" }}>
                  AI Strategist
                </div>
                <div className="text-[9.5px]" style={{ color: "oklch(1 0 0 / 42%)" }}>
                  Your AI marketing partner
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-2 px-3 h-8 rounded-lg mb-2.5"
              style={{
                background: "oklch(0.11 0 0)",
                border: "1px solid oklch(1 0 0 / 14%)",
                boxShadow: "inset 0 1px 0 oklch(1 0 0 / 6%)",
              }}
            >
              <span className="flex-1 text-[10.5px]" style={{ color: "oklch(1 0 0 / 28%)" }}>
                What would you like to work on today?
              </span>
              <div
                className="h-5 w-5 rounded-md flex items-center justify-center"
                style={{ background: "oklch(0.94 0 0)", boxShadow: "0 1px 4px oklch(0 0 0 / 40%)" }}
              >
                <ArrowUpRight className="h-2.5 w-2.5" style={{ color: "oklch(0.1 0 0)" }} />
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {["Campaign ideas", "Content hooks", "Ad angles", "Audience insights"].map((chip) => (
                <div
                  key={chip}
                  className="px-2.5 py-[3px] rounded-full text-[9.5px]"
                  style={{
                    background: "oklch(0.20 0 0)",
                    border: "1px solid oklch(1 0 0 / 16%)",
                    color: "oklch(1 0 0 / 60%)",
                    boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%)",
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>

          {/* Content Calendar */}
          <div
            className="flex-1 flex flex-col rounded-xl overflow-hidden"
            style={{
              background: "oklch(0.15 0 0)",
              border: "1px solid oklch(1 0 0 / 14%)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 12%), 0 2px 6px oklch(0 0 0 / 50%)",
              minHeight: 0,
            }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2 shrink-0"
              style={{ borderBottom: "1px solid oklch(1 0 0 / 10%)" }}
            >
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" style={{ color: "oklch(1 0 0 / 48%)" }} />
                <span className="text-[11px] font-medium" style={{ color: "oklch(1 0 0 / 78%)" }}>
                  Content Calendar
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {["Week", "Month"].map((v, i) => (
                  <div
                    key={v}
                    className="px-2 py-0.5 rounded text-[9.5px]"
                    style={{
                      background: i === 0 ? "oklch(1 0 0 / 12%)" : "transparent",
                      color: i === 0 ? "oklch(1 0 0 / 78%)" : "oklch(1 0 0 / 34%)",
                      boxShadow: i === 0 ? "inset 0 1px 0 oklch(1 0 0 / 12%)" : "none",
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7 flex-1" style={{ minHeight: 0 }}>
              {CALENDAR_POSTS.map((d, idx) => (
                <div
                  key={d.date}
                  className="flex flex-col p-2 text-[9px]"
                  style={{
                    borderRight: idx < 6 ? "1px solid oklch(1 0 0 / 8%)" : "none",
                  }}
                >
                  <div className="mb-1.5">
                    <span style={{ color: "oklch(1 0 0 / 35%)" }}>{d.day}</span>
                    <br />
                    <span className="text-[10.5px] font-medium" style={{ color: "oklch(1 0 0 / 65%)" }}>
                      {d.date}
                    </span>
                  </div>
                  {d.post && (
                    <div
                      className="rounded-md p-1.5"
                      style={{
                        background: "oklch(0.20 0 0)",
                        border: "1px solid oklch(1 0 0 / 14%)",
                        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%)",
                      }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full mb-1" style={{ background: d.dot! }} />
                      <div className="leading-tight" style={{ color: "oklch(1 0 0 / 68%)" }}>
                        {d.post}
                      </div>
                      <div className="mt-0.5" style={{ color: "oklch(1 0 0 / 36%)" }}>
                        {d.time}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel — MRKT Connect ──────── */}
        <div
          className="hidden lg:flex w-[256px] flex-col shrink-0 py-4 px-4"
          style={{ background: "oklch(0.08 0 0)" }}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-0.5">
              <Users className="h-3.5 w-3.5" style={{ color: "oklch(1 0 0 / 55%)" }} />
              <span className="text-[12px] font-semibold" style={{ color: "oklch(1 0 0 / 88%)" }}>
                MRKT Connect
              </span>
            </div>
            <div className="text-[9.5px]" style={{ color: "oklch(1 0 0 / 38%)" }}>
              Connect. Collaborate. Grow.
            </div>
          </div>

          <div
            className="flex gap-0.5 mb-4 p-[3px] rounded-lg"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(1 0 0 / 12%)",
            }}
          >
            {["Creators", "Businesses"].map((tab, i) => (
              <div
                key={tab}
                className="flex-1 text-center py-1.5 rounded-md text-[10px] font-medium"
                style={{
                  background: i === 0 ? "oklch(0.20 0 0)" : "transparent",
                  color: i === 0 ? "oklch(1 0 0 / 88%)" : "oklch(1 0 0 / 40%)",
                  boxShadow: i === 0 ? "inset 0 1px 0 oklch(1 0 0 / 14%)" : "none",
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          <div className="space-y-2 mb-3">
            {DASHBOARD_CREATORS.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-2.5 p-2.5 rounded-xl"
                style={{
                  background: "oklch(0.13 0 0)",
                  border: "1px solid oklch(1 0 0 / 12%)",
                  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%)",
                }}
              >
                <div
                  className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                  style={{ background: c.bg, color: "oklch(0.1 0 0)" }}
                >
                  {c.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate" style={{ color: "oklch(1 0 0 / 82%)" }}>
                    {c.name}
                  </div>
                  <div className="text-[9.5px]" style={{ color: "oklch(1 0 0 / 40%)" }}>
                    {c.role} · {c.followers}
                  </div>
                </div>
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "oklch(0.20 0 0)",
                    border: "1px solid oklch(1 0 0 / 14%)",
                    color: "oklch(1 0 0 / 55%)",
                  }}
                >
                  <Plus className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 text-[10px] mb-4" style={{ color: "oklch(1 0 0 / 45%)" }}>
            View all creators <ArrowUpRight className="h-2.5 w-2.5" />
          </div>

          <div
            className="mt-auto rounded-xl p-3.5"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(1 0 0 / 14%)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 12%), 0 2px 8px oklch(0 0 0 / 50%)",
            }}
          >
            <div className="text-[11px] font-medium mb-1" style={{ color: "oklch(1 0 0 / 82%)" }}>
              Collaboration opportunities
            </div>
            <div className="text-[9.5px] mb-3" style={{ color: "oklch(1 0 0 / 40%)" }}>
              12 new matches found
            </div>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {AVATAR_STACK.map((bg, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border-[2px] flex items-center justify-center text-[7px] font-bold"
                    style={{ background: bg, borderColor: "oklch(0.08 0 0)", color: "oklch(0.1 0 0)" }}
                  >
                    {["A", "D", "S", "K"][i]}
                  </div>
                ))}
                <div
                  className="h-6 w-6 rounded-full border-[2px] flex items-center justify-center text-[7px]"
                  style={{
                    background: "oklch(0.20 0 0)",
                    borderColor: "oklch(0.08 0 0)",
                    color: "oklch(1 0 0 / 50%)",
                  }}
                >
                  +8
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-[9.5px]" style={{ color: "oklch(1 0 0 / 50%)" }}>
                Review <ArrowUpRight className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MRKT Connect marketplace showcase
// ─────────────────────────────────────────────────────────────

const CONNECT_CREATORS = [
  { initial: "S", name: "Sofia Marlowe",  niche: "Sustainable fashion", followers: "280K", score: 94, bg: "oklch(0.72 0.09 20)"  },
  { initial: "A", name: "Aisha Chen",     niche: "Beauty & skincare",   followers: "180K", score: 88, bg: "oklch(0.68 0.09 300)" },
  { initial: "L", name: "Lucas Ferreira", niche: "Fitness & wellness",  followers: "420K", score: 85, bg: "oklch(0.62 0.08 250)" },
];

const CONNECT_CAMPAIGNS = [
  { brand: "Lumière Studio", platform: "Instagram", brief: "Q4 skincare launch campaign",  budget: "$12,000", req: "Micro + nano creators"  },
  { brand: "Helio Fit",      platform: "TikTok",    brief: "Fitness app — 6-post series",  budget: "$8,500",  req: "Health & wellness niche" },
  { brand: "Maison Aurum",   platform: "Instagram", brief: "SS26 fashion editorial drop",   budget: "$24,000", req: "Fashion & luxury"        },
];

function ConnectShowcase() {
  return (
    <div
      className="w-full mt-14 rounded-2xl overflow-hidden"
      style={{
        background: "oklch(0.10 0 0)",
        border: "1px solid oklch(1 0 0 / 14%)",
        boxShadow: [
          "inset 0 1px 0 oklch(1 0 0 / 12%)",
          "0 24px 64px -16px oklch(0 0 0 / 65%)",
          "0 48px 96px -24px oklch(0 0 0 / 45%)",
        ].join(", "),
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{ background: "oklch(0.08 0 0)", borderBottom: "1px solid oklch(1 0 0 / 12%)" }}
      >
        <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.72 0.005 250)" }} />
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.28em]" style={{ color: "oklch(1 0 0 / 38%)" }}>
          MRKT Connect
        </span>
        <div className="ml-auto flex gap-1">
          {["Creators", "Campaigns", "Partnerships"].map((tab, i) => (
            <div
              key={tab}
              className="px-3 py-1 rounded-full text-[10px]"
              style={{
                background: i === 0 ? "oklch(0.18 0 0)" : "transparent",
                border: i === 0 ? "1px solid oklch(1 0 0 / 14%)" : "none",
                color: i === 0 ? "oklch(1 0 0 / 78%)" : "oklch(1 0 0 / 32%)",
                boxShadow: i === 0 ? "inset 0 1px 0 oklch(1 0 0 / 12%)" : "none",
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </div>

      {/* Two-column marketplace */}
      <div className="grid md:grid-cols-2" style={{ borderBottom: "1px solid oklch(1 0 0 / 10%)" }}>

        {/* Left: Creator profiles */}
        <div className="p-5" style={{ borderRight: "1px solid oklch(1 0 0 / 10%)" }}>
          <div className="text-[9px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: "oklch(1 0 0 / 32%)" }}>
            Featured Creators
          </div>
          <div className="space-y-2.5">
            {CONNECT_CREATORS.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{
                  background: "oklch(0.14 0 0)",
                  border: "1px solid oklch(1 0 0 / 13%)",
                  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%), 0 2px 6px oklch(0 0 0 / 40%)",
                }}
              >
                <div
                  className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold"
                  style={{ background: c.bg, color: "oklch(0.1 0 0)" }}
                >
                  {c.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium" style={{ color: "oklch(1 0 0 / 88%)" }}>
                    {c.name}
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "oklch(1 0 0 / 44%)" }}>
                    {c.niche} · {c.followers} followers
                  </div>
                </div>
                <div
                  className="shrink-0 text-[10.5px] font-semibold rounded-full px-2.5 py-0.5"
                  style={{
                    color: "oklch(0.72 0.14 152)",
                    background: "oklch(0.72 0.14 152 / 16%)",
                    border: "1px solid oklch(0.72 0.14 152 / 28%)",
                  }}
                >
                  {c.score}% match
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10.5px]" style={{ color: "oklch(1 0 0 / 42%)" }}>
            View all creators <ArrowUpRight className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Right: Campaign opportunities */}
        <div className="p-5">
          <div className="text-[9px] uppercase tracking-[0.3em] font-medium mb-4" style={{ color: "oklch(1 0 0 / 32%)" }}>
            Open Campaigns
          </div>
          <div className="space-y-2.5">
            {CONNECT_CAMPAIGNS.map((c) => (
              <div
                key={c.brand}
                className="p-3.5 rounded-xl"
                style={{
                  background: "oklch(0.14 0 0)",
                  border: "1px solid oklch(1 0 0 / 13%)",
                  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%), 0 2px 6px oklch(0 0 0 / 40%)",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[12.5px] font-medium" style={{ color: "oklch(1 0 0 / 88%)" }}>
                    {c.brand}
                  </div>
                  <span
                    className="text-[9px] uppercase tracking-[0.18em] rounded-full px-2 py-0.5 font-medium"
                    style={{
                      background: "oklch(0.20 0 0)",
                      border: "1px solid oklch(1 0 0 / 12%)",
                      color: "oklch(1 0 0 / 45%)",
                    }}
                  >
                    {c.platform}
                  </span>
                </div>
                <div className="text-[11px] mb-2" style={{ color: "oklch(1 0 0 / 60%)" }}>
                  {c.brief}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: "oklch(1 0 0 / 65%)" }}>{c.budget}</span>
                  <span style={{ color: "oklch(1 0 0 / 38%)" }}>{c.req}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10.5px]" style={{ color: "oklch(1 0 0 / 42%)" }}>
            Browse all campaigns <ArrowUpRight className="h-2.5 w-2.5" />
          </div>
        </div>

      </div>

      {/* AI match footer strip */}
      <div className="flex items-center gap-2.5 px-5 py-3" style={{ background: "oklch(0.085 0 0)" }}>
        <Sparkles className="h-3 w-3 shrink-0" style={{ color: "oklch(0.72 0.005 250)" }} />
        <span className="text-[10.5px]" style={{ color: "oklch(1 0 0 / 38%)" }}>
          AI matched · 12 new opportunities found this week ·{" "}
          <span style={{ color: "oklch(1 0 0 / 65%)" }}>Review matches →</span>
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hook examples
// ─────────────────────────────────────────────────────────────
const HOOKS = [
  { type: "Problem",  text: "You don't have 2 hours. Here's the 20-minute routine that actually works." },
  { type: "Myth",     text: "The gym isn't the bottleneck. Your schedule is — and here's how to fix it." },
  { type: "Identity", text: "High performers don't find time to work out. They make it non-negotiable." },
];

// ─────────────────────────────────────────────────────────────
// Paths
// ─────────────────────────────────────────────────────────────
const PATHS = [
  {
    label: "Creator",
    tag: null,
    desc: "AI content strategy, brand partnership tools, and a MRKT Connect profile that puts you in front of the right brands.",
    cta: "Start as a Creator",
    to: "/for-creators",
  },
  {
    label: "Business",
    tag: null,
    desc: "Build marketing strategies, find and brief creators, manage campaigns, and grow your brand — from one intelligent workspace.",
    cta: "Start as a Business",
    to: "/for-businesses",
  },
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-0 px-6 text-center overflow-x-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(ellipse 85% 55% at 50% -5%, oklch(0.17 0 0) 0%, oklch(0.04 0 0) 58%)",
          }}
        />

        {/* Badge */}
        <div
          className="hero-animate hero-d1 inline-flex items-center gap-2 rounded-full px-3.5 py-1 mb-8"
          style={{
            background: "oklch(0.10 0 0)",
            border: "1px solid oklch(1 0 0 / 14%)",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 10%)",
          }}
        >
          <span className="h-[5px] w-[5px] rounded-full" style={{ background: "oklch(0.72 0.14 152)", boxShadow: "0 0 6px oklch(0.72 0.14 152 / 60%)" }} />
          <span className="text-[9px] font-medium uppercase tracking-[0.32em]" style={{ color: "oklch(1 0 0 / 50%)" }}>
            AI Marketing Operating System
          </span>
        </div>

        <h1 className="hero-animate hero-d2 font-display text-[clamp(2.75rem,6.5vw,5.5rem)] font-bold leading-[1.12] max-w-3xl mx-auto" style={{ letterSpacing: '0.02em', fontFeatureSettings: '"ss01" 1, "cv01" 1, "cv11" 1, "calt" 0' }}>
          Marketing, organized<br />
          <span style={{ color: "oklch(1 0 0 / 35%)" }}>by intelligence.</span>
        </h1>

        <p
          className="hero-animate hero-d3 mt-6 mx-auto max-w-[32rem] text-[1.0625rem] leading-[1.75] font-light"
          style={{ color: "oklch(1 0 0 / 46%)" }}
        >
          MRKT helps creators and businesses plan content, build campaigns,
          discover collaborations, and grow from one intelligent workspace.
        </p>

        <div className="hero-animate hero-d4 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            /* ── Returning user: send them straight into the product ── */
            <Link
              to="/chat"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
            >
              Open Workspace <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : (
            /* ── New visitor: acquisition CTA ── */
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm font-medium"
            >
              Get started free <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            to="/connect"
            className="btn-ghost inline-flex items-center gap-2 rounded-full px-8 h-12 text-sm"
          >
            Explore MRKT Connect <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="hero-animate hero-d5">
          <FlagshipWindow />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 inset-x-0 h-52"
          style={{ background: "linear-gradient(to top, var(--color-background) 30%, transparent)" }}
        />
      </section>

      {/* ── AI STRATEGIST ──────────────────────────────────────── */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            <div>
              <div className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium" style={{ color: "oklch(1 0 0 / 34%)" }}>
                AI Strategist
              </div>
              <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
                Instant strategy,<br />
                <span style={{ color: "oklch(1 0 0 / 35%)" }}>for anything.</span>
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-[1.8] font-light" style={{ color: "oklch(1 0 0 / 46%)" }}>
                Ask MRKT to plan campaigns, write content, build calendars, or
                analyse your brand. Structured, actionable output — in seconds.
              </p>
              <Link
                to={user ? "/chat" : "/login"}
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm"
              >
                {user ? "Open AI Strategist" : "Try the AI Strategist"} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {/* AI chat panel — the hero mockup */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "oklch(0.11 0 0)",
                border: "1px solid oklch(1 0 0 / 16%)",
                boxShadow: [
                  "inset 0 1px 0 oklch(1 0 0 / 14%)",
                  "0 8px 40px oklch(0 0 0 / 65%)",
                  "0 2px 8px oklch(0 0 0 / 45%)",
                ].join(", "),
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-3.5 flex items-center gap-2"
                style={{ background: "oklch(0.09 0 0)", borderBottom: "1px solid oklch(1 0 0 / 12%)" }}
              >
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, oklch(0.55 0 0), oklch(0.15 0 0))",
                    border: "1px solid oklch(1 0 0 / 18%)",
                    boxShadow: "0 0 8px oklch(1 0 0 / 12%)",
                  }}
                >
                  <Sparkles className="h-3 w-3" style={{ color: "oklch(1 0 0 / 82%)" }} />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.28em]" style={{ color: "oklch(1 0 0 / 40%)" }}>
                  MRKT
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[88%] rounded-[14px] rounded-br-[4px] px-4 py-3 text-[0.8125rem] leading-relaxed"
                    style={{
                      background: "oklch(0.20 0 0)",
                      border: "1px solid oklch(1 0 0 / 18%)",
                      boxShadow: "inset 0 1px 0 oklch(1 0 0 / 14%), 0 2px 6px oklch(0 0 0 / 45%)",
                      color: "oklch(1 0 0 / 84%)",
                    }}
                  >
                    Write 3 hooks for a fitness app targeting busy professionals.
                  </div>
                </div>

                {/* Hook response cards */}
                <div className="space-y-2.5">
                  {HOOKS.map((h) => (
                    <div
                      key={h.type}
                      className="rounded-xl px-4 py-3 text-[0.8125rem] leading-[1.65]"
                      style={{
                        background: "oklch(0.16 0 0)",
                        border: "1px solid oklch(1 0 0 / 14%)",
                        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 11%)",
                      }}
                    >
                      <span
                        className="text-[8.5px] uppercase tracking-[0.24em] font-medium block mb-1"
                        style={{ color: "oklch(1 0 0 / 38%)" }}
                      >
                        {h.type}
                      </span>
                      <span style={{ color: "oklch(1 0 0 / 72%)" }}>{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── MRKT CONNECT ───────────────────────────────────────── */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium" style={{ color: "oklch(1 0 0 / 34%)" }}>
              MRKT Connect
            </div>
            <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
              The right creators.<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>The right businesses.</span>
            </h2>
            <p className="mt-6 text-[1.0625rem] leading-[1.8] font-light mx-auto max-w-[38rem]" style={{ color: "oklch(1 0 0 / 46%)" }}>
              MRKT Connect matches creators and brands based on audience fit, goals,
              content style, and campaign requirements — intelligently.
            </p>
            <Link to="/connect" className="btn-primary mt-8 inline-flex items-center gap-2 rounded-full px-7 h-11 text-sm">
              Explore MRKT Connect <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <ConnectShowcase />
        </div>
      </section>

      {/* ── TWO WORKSPACES ─────────────────────────────────────── */}
      <section className="px-6 py-32 hairline-t">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="text-[9.5px] uppercase tracking-[0.35em] mb-5 font-medium" style={{ color: "oklch(1 0 0 / 34%)" }}>
              Who it's for
            </div>
            <h2 className="font-display text-4xl md:text-[3.25rem] font-bold tracking-[-0.04em] leading-[1.07]">
              Two workspaces.<br />
              <span style={{ color: "oklch(1 0 0 / 35%)" }}>One platform.</span>
            </h2>
            <p className="mt-5 text-[1rem] font-light max-w-lg mx-auto" style={{ color: "oklch(1 0 0 / 44%)" }}>
              MRKT adapts to your role — creator or brand. The tools, language, and experience change based on who you are.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {PATHS.map((p, i) => (
              <Link
                key={i}
                to={p.to as "/for-creators" | "/for-businesses"}
                className="group flex flex-col rounded-2xl p-7 transition-all duration-250"
                style={{
                  background: "oklch(0.09 0 0)",
                  border: "1px solid oklch(1 0 0 / 13%)",
                  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 9%), 0 4px 16px oklch(0 0 0 / 45%)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "oklch(0.12 0 0)";
                  e.currentTarget.style.borderColor = "oklch(1 0 0 / 22%)";
                  e.currentTarget.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 14%), 0 8px 28px oklch(0 0 0 / 55%), 0 2px 8px oklch(0 0 0 / 40%)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "oklch(0.09 0 0)";
                  e.currentTarget.style.borderColor = "oklch(1 0 0 / 13%)";
                  e.currentTarget.style.boxShadow = "inset 0 1px 0 oklch(1 0 0 / 9%), 0 4px 16px oklch(0 0 0 / 45%)";
                  e.currentTarget.style.transform = "";
                }}
              >
                <div className="mb-4">
                  <div className="font-display text-xl font-semibold leading-tight">
                    {p.label}
                    {p.tag && (
                      <span
                        className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em] font-medium align-middle"
                        style={{ background: "oklch(0.16 0 0)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(1 0 0 / 45%)" }}
                      >
                        {p.tag}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm leading-relaxed flex-1 mb-7" style={{ color: "oklch(1 0 0 / 46%)" }}>
                  {p.desc}
                </p>

                <div
                  className="flex items-center gap-1.5 text-[0.8125rem] font-medium"
                  style={{ color: "oklch(1 0 0 / 45%)" }}
                >
                  {p.cta}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <section className="px-6 py-40 hairline-t">
        <div className="mx-auto max-w-2xl text-center">
          {user ? (
            /* ── Logged-in: welcome back ── */
            <>
              <h2 className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-bold leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
                Your workspace<br />
                <span style={{ color: "oklch(1 0 0 / 34%)" }}>is ready.</span>
              </h2>
              <p
                className="mt-6 font-light max-w-sm mx-auto leading-relaxed"
                style={{ color: "oklch(1 0 0 / 42%)", fontSize: "1.0625rem" }}
              >
                Pick up where you left off. Your strategies, sessions, and saved work are waiting.
              </p>
              <Link
                to="/chat"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
              >
                Open Workspace <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          ) : (
            /* ── Logged-out: acquisition ── */
            <>
              <h2 className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-bold leading-[1.1]" style={{ letterSpacing: '-0.02em' }}>
                Your marketing team,<br />
                <span style={{ color: "oklch(1 0 0 / 34%)" }}>built with AI.</span>
              </h2>
              <p
                className="mt-6 font-light max-w-sm mx-auto leading-relaxed"
                style={{ color: "oklch(1 0 0 / 42%)", fontSize: "1.0625rem" }}
              >
                Strategy, content, partnerships, and growth — from one workspace designed for how marketing works today.
              </p>
              <Link
                to="/login"
                className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-10 h-14 text-base"
              >
                Get started free <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
