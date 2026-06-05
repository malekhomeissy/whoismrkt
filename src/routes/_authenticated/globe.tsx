import "maplibre-gl/dist/maplibre-gl.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth.tsx";
import { toast } from "sonner";
import {
  Search, X, SlidersHorizontal, Users, MapPin, Plane,
  BadgeCheck, ArrowUpRight, Loader2, Zap, Navigation2,
  ChevronRight, Globe as GlobeIcon, CheckCircle2, Bookmark,
  TrendingUp, Layers as LayersIcon, Radio,
} from "lucide-react";
import { guessCoords, CITY_COORDS, buildCityDensity, deterministicJitter } from "@/lib/geocoding";
import {
  formatFollowers, CATEGORY_LABELS, platformShort,
  type CreatorCategory,
} from "@/types/creator";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/globe")({
  head: () => ({
    meta: [{ title: "MRKT Globe — Creator World Map" }],
  }),
  component: GlobePage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = "creator" | "business" | null;

type MapCreator = {
  id: string;
  display_name: string;
  profile_image_url: string | null;
  follower_count: number | null;
  categories: string[];
  platforms: string[];
  niche: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_city: string | null;
  location_country: string | null;
  availability?: {
    status: "available" | "busy" | "traveling";
    current_city: string | null;
    current_lat: number | null;
    current_lng: number | null;
    available_until: string | null;
    traveling_to_city: string | null;
    traveling_to_lat: number | null;
    traveling_to_lng: number | null;
    travel_date: string | null;
  };
};

type SelectedCreator = {
  id: string;
  display_name: string;
  niche: string | null;
  categories: string[];
  platforms: string[];
  follower_count: number | null;
  profile_image_url: string | null;
  city: string | null;
  availability_status: string;
};

type GlobeFilters = {
  platforms: string[];
  categories: string[];
  availability: "all" | "available" | "traveling";
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  canvas:         "#000",
  base:           "oklch(0.075 0 0)",
  surface:        "oklch(0.11 0 0)",
  raised:         "oklch(0.15 0 0)",
  borderSubtle:   "oklch(1 0 0 / 7%)",
  borderNormal:   "oklch(1 0 0 / 12%)",
  borderStrong:   "oklch(1 0 0 / 20%)",
  shadowCard:     "inset 0 1px 0 oklch(1 0 0 / 10%), 0 4px 20px oklch(0 0 0 / 70%), 0 1px 4px oklch(0 0 0 / 50%)",
  shadowPanel:    "inset 0 1px 0 oklch(1 0 0 / 8%), 0 12px 48px oklch(0 0 0 / 80%), 0 2px 8px oklch(0 0 0 / 50%)",
  textPrimary:    "oklch(1 0 0 / 92%)",
  textSecondary:  "oklch(1 0 0 / 68%)",
  textTertiary:   "oklch(1 0 0 / 46%)",
  textQuaternary: "oklch(1 0 0 / 30%)",
  textMuted:      "oklch(1 0 0 / 20%)",
  chrome:         "oklch(0.82 0.005 250)",
  accent:         "oklch(0.72 0.14 152)",
} as const;

// ── Avatar canvas utilities ───────────────────────────────────────────────────

const CANVAS_PX = 88;
const AVATAR_COLORS_CANVAS = [
  "#b34040", "#3d5fa0", "#3a7a5c", "#8040b0", "#a07a28", "#287a8a",
];

function avatarColorCanvas(name: string): string {
  return AVATAR_COLORS_CANVAS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS_CANVAS.length];
}

function createAvatarCanvas(displayName: string): HTMLCanvasElement {
  const s  = CANVAS_PX;
  const cx = s / 2, cy = s / 2;
  const rOuter = s / 2 - 3;
  const rInner = rOuter - 6;

  const canvas = document.createElement("canvas");
  canvas.width  = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;

  // Outer glow
  const glow = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter + 10);
  glow.addColorStop(0,   "rgba(200,205,225,0.00)");
  glow.addColorStop(0.5, "rgba(200,205,225,0.15)");
  glow.addColorStop(1,   "rgba(200,205,225,0.00)");
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter + 10, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Chrome ring
  const ring = ctx.createLinearGradient(2, 2, s - 2, s - 2);
  ring.addColorStop(0,    "rgba(255,255,255,0.96)");
  ring.addColorStop(0.28, "rgba(218,220,232,0.88)");
  ring.addColorStop(0.65, "rgba(155,158,172,0.78)");
  ring.addColorStop(1,    "rgba(95,97,112,0.60)");
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.strokeStyle = ring;
  ctx.lineWidth   = 3.5;
  ctx.stroke();

  // Avatar background
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.fillStyle = avatarColorCanvas(displayName);
  ctx.fill();
  ctx.restore();

  // Initial letter
  const fontSize = Math.round(rInner * 0.74);
  ctx.font         = `700 ${fontSize}px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif`;
  ctx.fillStyle    = "rgba(255,255,255,0.92)";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((displayName[0] ?? "?").toUpperCase(), cx, cy + 1);

  return canvas;
}

function loadAvatarImage(canvas: HTMLCanvasElement, url: string): Promise<void> {
  return new Promise((resolve) => {
    const s      = canvas.width;
    const cx     = s / 2, cy = s / 2;
    const rInner = s / 2 - 3 - 6;

    const img       = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - rInner, cy - rInner, rInner * 2, rInner * 2);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

// ── UI avatar colors (oklch, for React components) ────────────────────────────

const AVATAR_COLORS = [
  "oklch(0.68 0.12 25)", "oklch(0.66 0.09 250)",
  "oklch(0.64 0.11 160)", "oklch(0.70 0.10 300)",
  "oklch(0.72 0.09 60)",  "oklch(0.65 0.10 190)",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ── MapLibre dark style ────────────────────────────────────────────────────────

const DARK_STYLE = {
  version: 8 as const,
  glyphs: "https://tiles.openfreemap.org/glyphs/{fontstack}/{range}.pbf",
  sources: {
    carto: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    {
      id:     "carto-dark",
      type:   "raster" as const,
      source: "carto",
      paint:  { "raster-opacity": 1 as const },
    },
  ],
};

// ── GeoJSON helpers ────────────────────────────────────────────────────────────

function resolveCreatorCoords(c: MapCreator): [number, number] | null {
  if (c.availability?.current_lat != null && c.availability.current_lng != null) {
    return [c.availability.current_lng, c.availability.current_lat];
  }
  if (c.location_lat != null && c.location_lng != null) {
    return [c.location_lng, c.location_lat];
  }
  const searchText = c.location_city ?? c.location ?? "";
  if (searchText) {
    const latLng = guessCoords(searchText);
    if (latLng) {
      const [jLng, jLat] = deterministicJitter(c.id);
      return [latLng[1] + jLng, latLng[0] + jLat];
    }
  }
  return null;
}

function buildGeoJSON(creators: MapCreator[], filters: GlobeFilters) {
  const filtered = creators.filter((c) => {
    if (filters.platforms.length > 0 && !filters.platforms.some((p) => c.platforms.includes(p))) return false;
    if (filters.categories.length > 0 && !filters.categories.some((cat) => c.categories.includes(cat))) return false;
    if (filters.availability === "available" && c.availability?.status !== "available") return false;
    if (filters.availability === "traveling" && c.availability?.status !== "traveling") return false;
    return true;
  });

  const features = filtered
    .map((c) => {
      const coords = resolveCreatorCoords(c);
      if (!coords) return null;

      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: coords },
        properties: {
          id: c.id,
          display_name: c.display_name,
          follower_count: c.follower_count ?? 0,
          categories: JSON.stringify(c.categories),
          platforms: JSON.stringify(c.platforms),
          niche: c.niche ?? "",
          profile_image_url: c.profile_image_url ?? "",
          city: c.availability?.current_city ?? c.location_city ?? c.location ?? "",
          availability_status: c.availability?.status ?? "available",
          traveling_to: c.availability?.traveling_to_city ?? "",
          travel_date: c.availability?.travel_date ?? "",
        },
      };
    })
    .filter(Boolean);

  return { type: "FeatureCollection" as const, features };
}

// ── Platform/category constants ────────────────────────────────────────────────

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Twitter/X"];
const CATEGORY_OPTIONS: { value: CreatorCategory; label: string }[] = Object.entries(CATEGORY_LABELS)
  .map(([v, l]) => ({ value: v as CreatorCategory, label: l }));

// ── Creator Popup ─────────────────────────────────────────────────────────────

function CreatorPopup({
  creator, onClose, onSave, visible,
}: {
  creator: SelectedCreator;
  onClose: () => void;
  onSave: (id: string) => void;
  visible: boolean;
}) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(creator.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div
      className="absolute bottom-[72px] left-1/2 z-30 w-[312px] rounded-2xl overflow-hidden"
      style={{
        transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.22s cubic-bezier(0.16,1,0.3,1), transform 0.22s cubic-bezier(0.16,1,0.3,1)",
        background: "oklch(0.10 0 0)",
        border: `1px solid ${C.borderStrong}`,
        boxShadow: C.shadowPanel,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Dismiss */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 h-6 w-6 flex items-center justify-center rounded-lg transition-all duration-100"
        style={{ color: C.textMuted, background: "oklch(1 0 0 / 5%)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = C.textSecondary;
          (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = C.textMuted;
          (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)";
        }}
      >
        <X className="h-3 w-3" />
      </button>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            {creator.profile_image_url ? (
              <img
                src={creator.profile_image_url}
                alt={creator.display_name}
                className="h-14 w-14 rounded-full object-cover"
                style={{ border: "2px solid oklch(1 0 0 / 20%)", boxShadow: "0 0 12px oklch(1 0 0 / 10%)" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const next = e.currentTarget.nextSibling as HTMLElement;
                  if (next) next.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="h-14 w-14 rounded-full items-center justify-center text-[18px] font-bold"
              style={{
                display: creator.profile_image_url ? "none" : "flex",
                background: avatarColor(creator.display_name),
                border: "2px solid oklch(1 0 0 / 20%)",
                boxShadow: "0 0 12px oklch(1 0 0 / 10%)",
              }}
            >
              {creator.display_name[0]}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
              style={{
                background: creator.availability_status === "available"
                  ? "oklch(0.72 0.14 152)"
                  : creator.availability_status === "traveling"
                  ? "oklch(0.78 0.12 60)"
                  : "oklch(0.48 0 0)",
                border: "2px solid oklch(0.10 0 0)",
                boxShadow: creator.availability_status === "available"
                  ? "0 0 6px oklch(0.72 0.14 152 / 65%)"
                  : "none",
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[14px] font-semibold truncate" style={{ color: C.textPrimary }}>
                {creator.display_name}
              </span>
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" style={{ color: C.chrome }} />
            </div>
            {creator.niche && (
              <span
                className="inline-block text-[9px] uppercase tracking-[0.20em] font-medium rounded-full px-2 py-0.5"
                style={{ background: "oklch(1 0 0 / 7%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}
              >
                {creator.niche}
              </span>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {creator.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" style={{ color: C.textQuaternary }} />
              <span className="text-[11px]" style={{ color: C.textTertiary }}>{creator.city}</span>
            </div>
          )}
          {creator.follower_count != null && creator.follower_count > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 shrink-0" style={{ color: C.textQuaternary }} />
              <span className="text-[11px] font-medium" style={{ color: C.textSecondary }}>
                {formatFollowers(creator.follower_count)}
              </span>
            </div>
          )}
          {creator.availability_status === "available" && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "oklch(0.72 0.14 152)" }} />
              <span className="text-[11px]" style={{ color: "oklch(0.72 0.14 152)" }}>Available now</span>
            </div>
          )}
          {creator.availability_status === "traveling" && (
            <div className="flex items-center gap-1">
              <Plane className="h-3 w-3 shrink-0" style={{ color: "oklch(0.78 0.12 60)" }} />
              <span className="text-[11px]" style={{ color: "oklch(0.78 0.12 60)" }}>Traveling</span>
            </div>
          )}
        </div>

        {/* Platform pills */}
        {creator.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {creator.platforms.slice(0, 5).map((p) => (
              <span
                key={p}
                className="text-[9px] font-bold rounded-full px-2 py-0.5"
                style={{ background: "oklch(1 0 0 / 7%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}
              >
                {platformShort(p)}
              </span>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 rounded-full h-9 text-[12px] font-medium transition-all duration-200"
            style={{
              flex: "0 0 auto",
              padding: "0 14px",
              background: saved ? "oklch(0.72 0.14 152 / 14%)" : "oklch(1 0 0 / 6%)",
              border: `1px solid ${saved ? "oklch(0.72 0.14 152 / 35%)" : C.borderNormal}`,
              color: saved ? "oklch(0.72 0.14 152)" : C.textSecondary,
            }}
          >
            <Bookmark className={`h-3.5 w-3.5 transition-all duration-200 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>

          <Link
            to={`/creators/${creator.id}` as "/"}
            className="flex items-center justify-center gap-2 flex-1 rounded-full h-9 text-[12.5px] font-medium transition-all duration-150"
            style={{ background: "oklch(1 0 0 / 8%)", border: `1px solid ${C.borderNormal}`, color: C.textSecondary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 14%)";
              (e.currentTarget as HTMLElement).style.color = C.textPrimary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)";
              (e.currentTarget as HTMLElement).style.color = C.textSecondary;
            }}
          >
            View Profile <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({
  filters, onChange, onClose,
}: {
  filters: GlobeFilters;
  onChange: (f: GlobeFilters) => void;
  onClose: () => void;
}) {
  function togglePlatform(p: string) {
    onChange({
      ...filters,
      platforms: filters.platforms.includes(p)
        ? filters.platforms.filter((x) => x !== p)
        : [...filters.platforms, p],
    });
  }
  function toggleCategory(c: string) {
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });
  }

  return (
    <div
      className="absolute top-[64px] left-4 z-30 w-[260px] rounded-2xl overflow-hidden"
      style={{
        background: "oklch(0.09 0 0)",
        border: `1px solid ${C.borderStrong}`,
        boxShadow: C.shadowPanel,
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[11px] font-semibold tracking-[0.06em]" style={{ color: C.textSecondary }}>Filters</span>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg transition-all duration-100"
          style={{ color: C.textMuted, background: "oklch(1 0 0 / 5%)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-4">
        <div>
          <div className="text-[9px] uppercase tracking-[0.30em] mb-2.5" style={{ color: C.textQuaternary }}>
            Availability
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "available", "traveling"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => onChange({ ...filters, availability: opt })}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-100"
                style={{
                  background: filters.availability === opt ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 4%)",
                  border: `1px solid ${filters.availability === opt ? "oklch(0.82 0 0 / 35%)" : C.borderSubtle}`,
                  color: filters.availability === opt ? C.textPrimary : C.textTertiary,
                }}
              >
                {opt === "all" ? "All" : opt === "available" ? "Available Now" : "Traveling Soon"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-[0.30em] mb-2.5" style={{ color: C.textQuaternary }}>
            Platform
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-100"
                style={{
                  background: filters.platforms.includes(p) ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 4%)",
                  border: `1px solid ${filters.platforms.includes(p) ? "oklch(0.82 0 0 / 35%)" : C.borderSubtle}`,
                  color: filters.platforms.includes(p) ? C.textPrimary : C.textTertiary,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-[0.30em] mb-2.5" style={{ color: C.textQuaternary }}>
            Category
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleCategory(value)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-100"
                style={{
                  background: filters.categories.includes(value) ? "oklch(1 0 0 / 11%)" : "oklch(1 0 0 / 4%)",
                  border: `1px solid ${filters.categories.includes(value) ? "oklch(0.82 0 0 / 35%)" : C.borderSubtle}`,
                  color: filters.categories.includes(value) ? C.textPrimary : C.textTertiary,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(filters.platforms.length > 0 || filters.categories.length > 0 || filters.availability !== "all") && (
          <button
            onClick={() => onChange({ platforms: [], categories: [], availability: "all" })}
            className="text-[11px] transition-colors"
            style={{ color: C.textTertiary }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textTertiary; }}
          >
            Clear all filters ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
  count,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  count?: number | string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3 w-3 shrink-0" style={{ color: accent ?? C.textMuted }} />
      <span className="text-[9px] uppercase tracking-[0.34em] font-semibold" style={{ color: C.textMuted }}>
        {label}
      </span>
      {count !== undefined && (
        <span className="ml-auto text-[10px] font-semibold tabular-nums" style={{ color: accent ? `${accent.replace(")", " / 70%)")}` : C.textQuaternary }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── Creator Sidebar ────────────────────────────────────────────────────────────

function CreatorSidebar({
  creators, onFlyTo,
}: {
  creators: MapCreator[];
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
}) {
  const cityDensity = buildCityDensity(
    creators.map((c) => ({
      city: c.availability?.current_city ?? c.location_city ?? c.location,
      lat:  c.availability?.current_lat  ?? c.location_lat,
      lng:  c.availability?.current_lng  ?? c.location_lng,
    }))
  ).slice(0, 8);

  const traveling = creators
    .filter((c) => c.availability?.traveling_to_city && c.availability.travel_date)
    .slice(0, 5);

  const availableNow = creators.filter((c) => c.availability?.status === "available").length;

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-5 pb-5 space-y-6">
      <div>
        <SectionHeader
          icon={CheckCircle2}
          label="Available Now"
          count={availableNow}
          accent="oklch(0.72 0.14 152)"
        />

        {cityDensity.length === 0 ? (
          <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "oklch(1 0 0 / 3%)", border: `1px dashed ${C.borderSubtle}` }}>
            <MapPin className="h-5 w-5 mx-auto" style={{ color: C.textMuted }} />
            <p className="text-[11.5px] font-medium" style={{ color: C.textTertiary }}>Set your location</p>
            <p className="text-[10.5px]" style={{ color: C.textMuted }}>
              Add your city in your profile to appear on the map and connect with your local creator network.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {cityDensity.map((city) => (
              <button
                key={city.city}
                onClick={() => onFlyTo(city.lat, city.lng, 10)}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-100 group"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <MapPin className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
                <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: C.textSecondary }}>
                  {city.city}
                </span>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textTertiary }}>
                  {city.count}
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.textMuted }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: "1px", background: C.borderSubtle }} />

      <div>
        <SectionHeader icon={Plane} label="Traveling Soon" accent="oklch(0.78 0.12 60)" />

        {traveling.length === 0 ? (
          <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "oklch(1 0 0 / 3%)", border: `1px dashed ${C.borderSubtle}` }}>
            <Plane className="h-5 w-5 mx-auto" style={{ color: C.textMuted }} />
            <p className="text-[11.5px] font-medium" style={{ color: C.textTertiary }}>No travel plans shared</p>
            <p className="text-[10.5px]" style={{ color: C.textMuted }}>
              Add travel plans to your profile so brands can discover you before you arrive.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {traveling.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.borderSubtle}` }}
              >
                <div
                  className="h-7 w-7 rounded-full flex-none flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: avatarColor(c.display_name) }}
                >
                  {c.display_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate" style={{ color: C.textSecondary }}>
                    {c.display_name}
                  </div>
                  <div className="flex items-center gap-1 text-[10.5px]" style={{ color: C.textMuted }}>
                    <span>{c.availability?.current_city ?? "—"}</span>
                    <span style={{ color: "oklch(0.78 0.12 60 / 60%)" }}>→</span>
                    <span>{c.availability?.traveling_to_city}</span>
                  </div>
                  {c.availability?.travel_date && (
                    <div className="text-[10px] mt-0.5" style={{ color: C.textQuaternary }}>
                      {new Date(c.availability.travel_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Business Sidebar ──────────────────────────────────────────────────────────

function BusinessSidebar({
  creators, onFlyTo,
}: {
  creators: MapCreator[];
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
}) {
  const cityDensity = buildCityDensity(
    creators.map((c) => ({
      city: c.availability?.current_city ?? c.location_city ?? c.location,
      lat:  c.availability?.current_lat  ?? c.location_lat,
      lng:  c.availability?.current_lng  ?? c.location_lng,
    }))
  ).slice(0, 6);

  const nicheCounts = creators.reduce<Record<string, number>>((acc, c) => {
    const n = c.niche ?? "Other";
    acc[n] = (acc[n] ?? 0) + 1;
    return acc;
  }, {});
  const topNiches = Object.entries(nicheCounts).sort(([, a], [, b]) => b - a).slice(0, 6);

  const available = creators.filter((c) => c.availability?.status === "available").length;

  const travelingSoon = creators
    .filter((c) => c.availability?.traveling_to_city && c.availability.travel_date)
    .slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-5 pb-5 space-y-6">
      {/* Creators by Market */}
      <div>
        <SectionHeader icon={MapPin} label="Creators in Market" count={`${available} available`} />

        {cityDensity.length === 0 ? (
          <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "oklch(1 0 0 / 3%)", border: `1px dashed ${C.borderSubtle}` }}>
            <GlobeIcon className="h-5 w-5 mx-auto" style={{ color: C.textMuted }} />
            <p className="text-[11.5px] font-medium" style={{ color: C.textTertiary }}>No creators mapped yet</p>
            <p className="text-[10.5px]" style={{ color: C.textMuted }}>
              Creators appear here as they set their location. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {cityDensity.map((city) => (
              <button
                key={city.city}
                onClick={() => onFlyTo(city.lat, city.lng, 10)}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-100 group"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <MapPin className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
                <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: C.textSecondary }}>
                  {city.city}
                </span>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textTertiary }}>
                  {city.count}
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.textMuted }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {topNiches.length > 0 && (
        <>
          <div style={{ height: "1px", background: C.borderSubtle }} />
          <div>
            <SectionHeader icon={TrendingUp} label="Top Niches" />
            <div className="space-y-2">
              {topNiches.map(([niche, count]) => {
                const pct = Math.round((count / topNiches[0][1]) * 100);
                return (
                  <div key={niche} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px]" style={{ color: C.textSecondary }}>{niche}</span>
                      <span className="text-[10.5px] font-semibold tabular-nums" style={{ color: C.textTertiary }}>{count}</span>
                    </div>
                    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 6%)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, oklch(0.82 0.005 250 / 55%), oklch(0.72 0.005 250 / 25%))",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {travelingSoon.length > 0 && (
        <>
          <div style={{ height: "1px", background: C.borderSubtle }} />
          <div>
            <SectionHeader icon={Plane} label="Visiting Soon" accent="oklch(0.78 0.12 60)" />
            <div className="space-y-1.5">
              {travelingSoon.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                  style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.borderSubtle}` }}
                >
                  <div
                    className="h-7 w-7 rounded-full flex-none flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: avatarColor(c.display_name) }}
                  >
                    {c.display_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-medium truncate" style={{ color: C.textSecondary }}>
                      {c.display_name}
                    </div>
                    <div className="text-[10px]" style={{ color: "oklch(0.78 0.12 60 / 75%)" }}>
                      → {c.availability?.traveling_to_city}
                    </div>
                    {c.availability?.travel_date && (
                      <div className="text-[10px]" style={{ color: C.textQuaternary }}>
                        {new Date(c.availability.travel_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {creators.length > 0 && (
        <>
          <div style={{ height: "1px", background: C.borderSubtle }} />
          <div>
            <SectionHeader icon={LayersIcon} label="Creator Categories" />
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(
                creators.reduce<Record<string, number>>((acc, c) => {
                  for (const cat of c.categories) {
                    const label = CATEGORY_LABELS[cat as CreatorCategory] ?? cat;
                    acc[label] = (acc[label] ?? 0) + 1;
                  }
                  return acc;
                }, {})
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([cat, count]) => (
                  <span
                    key={cat}
                    className="flex items-center gap-1 text-[10.5px] rounded-full px-2.5 py-1"
                    style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
                  >
                    {cat}
                    <span className="text-[9px] font-bold" style={{ color: C.textQuaternary }}>{count}</span>
                  </span>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar header strip ──────────────────────────────────────────────────────

function SidebarHeader({ userRole }: { userRole: UserRole }) {
  return (
    <div
      className="shrink-0 px-4 h-[44px] flex items-center"
      style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
    >
      <span className="text-[10px] uppercase tracking-[0.30em] font-semibold" style={{ color: C.textMuted }}>
        {userRole === "business" ? "Market Intelligence" : userRole === "creator" ? "Creator Network" : ""}
      </span>
    </div>
  );
}

// ── Bottom stats bar ──────────────────────────────────────────────────────────

function BottomBar({ creators, userRole }: { creators: MapCreator[]; userRole: UserRole }) {
  const total     = creators.length;
  const available = creators.filter((c) => c.availability?.status === "available").length;
  const traveling = creators.filter((c) => c.availability?.status === "traveling").length;
  const countries = new Set(creators.map((c) => c.location_country ?? "").filter(Boolean)).size;
  const onMap     = creators.filter((c) => resolveCreatorCoords(c) != null).length;
  const niches    = new Set(creators.map((c) => c.niche ?? "").filter(Boolean)).size;
  const platforms = new Set(creators.flatMap((c) => c.platforms)).size;

  const creatorStats = [
    { label: "Creators",      value: total,            icon: Users },
    { label: "On Map",        value: onMap,            icon: GlobeIcon },
    { label: "Countries",     value: countries || "—", icon: Navigation2 },
    { label: "Available",     value: available,        icon: CheckCircle2 },
    { label: "Traveling",     value: traveling,        icon: Plane },
  ];

  const businessStats = [
    { label: "Creators",      value: total,            icon: Users },
    { label: "On Map",        value: onMap,            icon: GlobeIcon },
    { label: "Countries",     value: countries || "—", icon: Navigation2 },
    { label: "Niches",        value: niches,           icon: TrendingUp },
    { label: "Platforms",     value: platforms,        icon: LayersIcon },
  ];

  const stats = userRole === "business" ? businessStats : userRole === "creator" ? creatorStats : [];

  return (
    <div
      className="hidden md:flex h-[44px] px-6 items-center gap-6 shrink-0"
      style={{ borderTop: `1px solid ${C.borderSubtle}`, background: "oklch(0.055 0 0)" }}
    >
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center gap-1.5 shrink-0">
          <Icon className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textSecondary }}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          <span className="text-[10px]" style={{ color: C.textQuaternary }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mobile stat strip ─────────────────────────────────────────────────────────

function MobileStats({ creators }: { creators: MapCreator[] }) {
  const onMap     = creators.filter((c) => resolveCreatorCoords(c) != null).length;
  const available = creators.filter((c) => c.availability?.status === "available").length;

  return (
    <div
      className="md:hidden h-[40px] px-5 flex items-center gap-5 shrink-0"
      style={{ borderTop: `1px solid ${C.borderSubtle}`, background: "oklch(0.055 0 0)" }}
    >
      <div className="flex items-center gap-1.5">
        <Users className="h-3 w-3" style={{ color: C.textMuted }} />
        <span className="text-[11px] font-semibold" style={{ color: C.textSecondary }}>{onMap.toLocaleString()}</span>
        <span className="text-[10px]" style={{ color: C.textQuaternary }}>on map</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.72 0.14 152)", boxShadow: "0 0 4px oklch(0.72 0.14 152 / 70%)" }} />
        <span className="text-[11px] font-semibold" style={{ color: C.textSecondary }}>{available}</span>
        <span className="text-[10px]" style={{ color: C.textQuaternary }}>available</span>
      </div>
    </div>
  );
}

// ── Zoom controls ─────────────────────────────────────────────────────────────

function ZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div
      className="absolute bottom-16 right-4 z-20 flex flex-col rounded-xl overflow-hidden md:bottom-14"
      style={{ background: "oklch(0.10 0 0)", border: `1px solid ${C.borderStrong}`, boxShadow: C.shadowCard }}
    >
      {[
        { label: "+", action: onZoomIn },
        { label: "–", action: onZoomOut },
      ].map(({ label, action }, i) => (
        <button
          key={label}
          onClick={action}
          className="h-9 w-9 flex items-center justify-center text-[17px] font-light transition-all duration-100"
          style={{
            color: C.textTertiary,
            borderBottom: i === 0 ? `1px solid ${C.borderSubtle}` : "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 8%)";
            (e.currentTarget as HTMLElement).style.color = C.textPrimary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = C.textTertiary;
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function GlobePage() {
  const { user }          = useAuth();
  const mapContainerRef   = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef            = useRef<any>(null);
  const searchRef         = useRef<HTMLInputElement>(null);
  const loadedAvatarsRef  = useRef<Set<string>>(new Set());
  const hoveredIdRef      = useRef<string | null>(null);
  const selectedIdRef     = useRef<string | null>(null);

  const [creators,         setCreators]        = useState<MapCreator[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [mapReady,         setMapReady]        = useState(false);
  const [userRole,         setUserRole]        = useState<UserRole>(null);
  const [searchQuery,      setSearchQuery]     = useState("");
  const [showFilters,      setShowFilters]     = useState(false);
  const [selectedCreator,  setSelectedCreator] = useState<SelectedCreator | null>(null);
  const [popupVisible,     setPopupVisible]    = useState(false);
  const [hintVisible,      setHintVisible]     = useState(true);
  const [filters,          setFilters]         = useState<GlobeFilters>({
    platforms: [], categories: [], availability: "all",
  });

  const activeFilterCount =
    filters.platforms.length + filters.categories.length +
    (filters.availability !== "all" ? 1 : 0);

  // ── Fetch user role ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("account_type,onboarding_path")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.warn("[Globe] profile role fetch failed:", error);
          setUserRole("creator");
          return;
        }
        const biz =
          data.account_type === "brand" || data.account_type === "business" ||
          data.onboarding_path === "business_creator" || data.onboarding_path === "business_marketing";
        setUserRole(biz ? "business" : "creator");
      });
  }, [user]);

  // ── Load creators ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [profilesRes, availRes] = await Promise.all([
          (supabase as any)
            .from("creator_profiles")
            .select(
              "id,display_name,profile_image_url,follower_count,categories,platforms,niche," +
              "location,location_lat,location_lng,location_city,location_country"
            )
            .eq("is_public", true)
            .eq("status", "active")
            .order("created_at", { ascending: false }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from("creator_availability").select("*"),
        ]);

        const profiles: MapCreator[] = profilesRes.data ?? [];
        const availMap: Record<string, MapCreator["availability"]> = {};

        for (const a of availRes.data ?? []) {
          availMap[a.creator_profile_id] = {
            status:            a.status,
            current_city:      a.current_city,
            current_lat:       a.current_lat,
            current_lng:       a.current_lng,
            available_until:   a.available_until,
            traveling_to_city: a.traveling_to_city,
            traveling_to_lat:  a.traveling_to_lat,
            traveling_to_lng:  a.traveling_to_lng,
            travel_date:       a.travel_date,
          };
        }

        setCreators(profiles.map((p) => ({ ...p, availability: availMap[p.id] })));
      } catch {
        toast.error("Could not load creator data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Auto-dismiss hint ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || loading || creators.length === 0) return;
    const t = setTimeout(() => setHintVisible(false), 5000);
    return () => clearTimeout(t);
  }, [mapReady, loading, creators.length]);

  // ── Popup enter animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCreator) { setPopupVisible(false); return; }
    setPopupVisible(false);
    const rAF = requestAnimationFrame(() => requestAnimationFrame(() => setPopupVisible(true)));
    return () => cancelAnimationFrame(rAF);
  }, [selectedCreator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear featureState when popup closes ────────────────────────────────────
  useEffect(() => {
    if (selectedCreator || !mapRef.current) return;
    if (selectedIdRef.current) {
      try {
        mapRef.current.setFeatureState(
          { source: "creators", id: selectedIdRef.current },
          { selected: false }
        );
      } catch { /* ignore if source gone */ }
      selectedIdRef.current = null;
    }
  }, [selectedCreator]);

  // ── Initialize MapLibre ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let mounted = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    let ro: ResizeObserver | undefined;

    import("maplibre-gl").then(({ default: maplibregl }) => {
      if (!mounted || !mapContainerRef.current) return;

      map = new maplibregl.Map({
        container:          mapContainerRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style:              DARK_STYLE as any,
        center:             [20, 22],
        zoom:               2,
        minZoom:            1,
        maxZoom:            18,
        attributionControl: false,
        logoPosition:       "bottom-left",
      });

      mapRef.current = map;

      ro = new ResizeObserver(() => { mapRef.current?.resize(); });
      ro.observe(mapContainerRef.current);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("error", (e: any) => { console.error("[MRKT Globe]", e?.error ?? e); });

      map.on("load", () => {
        if (!mounted) return;
        map.resize();

        // GeoJSON source — promoteId lets MapLibre use creator.id as the feature ID for featureState
        map.addSource("creators", {
          type:           "geojson",
          data:           { type: "FeatureCollection", features: [] },
          cluster:        true,
          clusterMaxZoom: 13,
          clusterRadius:  55,
          promoteId:      "id",
        });

        // Cluster glow
        map.addLayer({
          id:     "creator-clusters-glow",
          type:   "circle",
          source: "creators",
          filter: ["has", "point_count"],
          paint:  {
            "circle-color":   "rgba(220,220,225,0.05)",
            "circle-radius":  ["step", ["get", "point_count"], 38, 10, 50, 50, 60, 200, 70],
            "circle-blur":    0.6,
            "circle-opacity": 1,
          },
        });

        // Cluster circles
        map.addLayer({
          id:     "creator-clusters",
          type:   "circle",
          source: "creators",
          filter: ["has", "point_count"],
          paint:  {
            "circle-color": [
              "step", ["get", "point_count"],
              "rgba(44,44,48,0.96)",   10,
              "rgba(60,60,64,0.96)",   50,
              "rgba(80,80,85,0.96)",  200,
              "rgba(108,108,114,0.96)",
            ],
            "circle-radius":         ["step", ["get", "point_count"], 22, 10, 30, 50, 38, 200, 46],
            "circle-opacity":        0.95,
            "circle-stroke-width":   1.5,
            "circle-stroke-color":   [
              "step", ["get", "point_count"],
              "rgba(255,255,255,0.16)", 10,
              "rgba(255,255,255,0.20)", 50,
              "rgba(255,255,255,0.24)", 200,
              "rgba(255,255,255,0.30)",
            ],
            "circle-stroke-opacity": 1,
          },
        });

        // Cluster count labels
        map.addLayer({
          id:     "creator-cluster-count",
          type:   "symbol",
          source: "creators",
          filter: ["has", "point_count"],
          layout: {
            "text-field":  ["get", "point_count_abbreviated"],
            "text-font":   ["Noto Sans Bold"],
            "text-size":   12,
            "text-anchor": "center",
          },
          paint: {
            "text-color":      "rgba(255,255,255,0.90)",
            "text-halo-color": "rgba(0,0,0,0.4)",
            "text-halo-width": 0.5,
          },
        });

        // Avatar hover/select glow ring — driven by featureState
        map.addLayer({
          id:     "unclustered-avatar-glow",
          type:   "circle",
          source: "creators",
          filter: ["!", ["has", "point_count"]],
          paint:  {
            "circle-color":  "rgba(210,215,240,0.00)",
            "circle-radius": 28,
            "circle-blur":   1.4,
            "circle-opacity": ["case",
              ["boolean", ["feature-state", "selected"], false], 0.90,
              ["boolean", ["feature-state", "hovered"],  false], 0.55,
              0,
            ],
            "circle-opacity-transition": { duration: 180, delay: 0 },
          },
        });

        // Individual creator avatar symbols
        map.addLayer({
          id:     "unclustered-avatar",
          type:   "symbol",
          source: "creators",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-image":              ["concat", "avatar-", ["get", "id"]],
            "icon-size":               1,
            "icon-allow-overlap":      true,
            "icon-anchor":             "center",
            "icon-pitch-alignment":    "viewport",
            "icon-rotation-alignment": "viewport",
          },
          paint: {
            "icon-translate": ["case",
              ["boolean", ["feature-state", "selected"], false], ["literal", [0, -4]],
              ["boolean", ["feature-state", "hovered"],  false], ["literal", [0, -2]],
              ["literal", [0, 0]],
            ],
            "icon-translate-transition": { duration: 200, delay: 0 },
          },
        });

        // Creator name labels (zoom ≥ 12)
        map.addLayer({
          id:      "unclustered-label",
          type:    "symbol",
          source:  "creators",
          filter:  ["!", ["has", "point_count"]],
          minzoom: 12,
          layout:  {
            "text-field":  ["get", "display_name"],
            "text-font":   ["Noto Sans Regular"],
            "text-size":   11,
            "text-offset": [0, 2.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color":      "rgba(255,255,255,0.72)",
            "text-halo-color": "rgba(0,0,0,0.88)",
            "text-halo-width": 1.5,
          },
        });

        // City label under clusters (medium zoom)
        map.addLayer({
          id:      "cluster-city-label",
          type:    "symbol",
          source:  "creators",
          filter:  ["has", "point_count"],
          minzoom: 4,
          layout:  {
            "text-field":  ["get", "cluster_city"],
            "text-font":   ["Noto Sans Regular"],
            "text-size":   10,
            "text-offset": [0, 2.8],
            "text-anchor": "top",
          },
          paint: {
            "text-color":      "rgba(255,255,255,0.32)",
            "text-halo-color": "rgba(0,0,0,0.75)",
            "text-halo-width": 1,
          },
        });

        // ── Events ──────────────────────────────────────────────────────────

        // Cluster click → zoom in
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", "creator-clusters", (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["creator-clusters"] });
          if (!features.length) return;
          const clusterId = features[0].properties.cluster_id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map.getSource("creators") as any).getClusterExpansionZoom(
            clusterId,
            (err: Error | null, zoom: number) => {
              if (err) return;
              map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.5, duration: 650 });
            }
          );
        });

        // Individual avatar click → popup + featureState selected
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", "unclustered-avatar", (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-avatar"] });
          if (!features.length) return;
          const props = features[0].properties;

          // Clear previous selection
          if (selectedIdRef.current && selectedIdRef.current !== props.id) {
            try {
              map.setFeatureState({ source: "creators", id: selectedIdRef.current }, { selected: false });
            } catch { /* ignore */ }
          }
          selectedIdRef.current = props.id;
          try {
            map.setFeatureState({ source: "creators", id: props.id }, { selected: true });
          } catch { /* ignore */ }

          setSelectedCreator({
            id:                  props.id,
            display_name:        props.display_name,
            niche:               props.niche || null,
            categories:          JSON.parse(props.categories || "[]"),
            platforms:           JSON.parse(props.platforms  || "[]"),
            follower_count:      props.follower_count,
            profile_image_url:   props.profile_image_url || null,
            city:                props.city || null,
            availability_status: props.availability_status ?? "available",
          });
          setHintVisible(false);

          map.easeTo({
            center:   features[0].geometry.coordinates,
            zoom:     Math.max(map.getZoom(), 13),
            duration: 500,
          });
        });

        // Click elsewhere → dismiss popup + clear selection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["creator-clusters", "unclustered-avatar"],
          });
          if (!features.length) {
            setSelectedCreator(null);
            setHintVisible(false);
          }
        });

        // Cursor changes + featureState hover
        map.on("mouseenter", "creator-clusters",  () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "creator-clusters",  () => { map.getCanvas().style.cursor = ""; });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("mouseenter", "unclustered-avatar", (e: any) => {
          map.getCanvas().style.cursor = "pointer";
          if (!e.features?.length) return;
          const id = e.features[0].properties.id;
          if (hoveredIdRef.current && hoveredIdRef.current !== id) {
            try { map.setFeatureState({ source: "creators", id: hoveredIdRef.current }, { hovered: false }); } catch { /* ignore */ }
          }
          hoveredIdRef.current = id;
          try { map.setFeatureState({ source: "creators", id }, { hovered: true }); } catch { /* ignore */ }
        });

        map.on("mouseleave", "unclustered-avatar", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredIdRef.current) {
            try { map.setFeatureState({ source: "creators", id: hoveredIdRef.current }, { hovered: false }); } catch { /* ignore */ }
            hoveredIdRef.current = null;
          }
        });

        setMapReady(true);
      });
    }).catch(() => { toast.error("Map failed to load."); });

    return () => {
      mounted = false;
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load avatar images ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || creators.length === 0) return;
    const map = mapRef.current;
    let cancelled = false;

    (async () => {
      for (const creator of creators) {
        if (cancelled) break;
        if (loadedAvatarsRef.current.has(creator.id)) continue;

        const canvas = createAvatarCanvas(creator.display_name);
        if (creator.profile_image_url) {
          await loadAvatarImage(canvas, creator.profile_image_url);
        }

        if (!cancelled) {
          const imageId = `avatar-${creator.id}`;
          if (!map.hasImage(imageId)) {
            map.addImage(imageId, canvas, { pixelRatio: 2 });
          }
          loadedAvatarsRef.current.add(creator.id);
          map.triggerRepaint();
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, creators]);

  // ── Update GeoJSON source ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource("creators");
    if (!source) return;
    source.setData(buildGeoJSON(creators, filters));
  }, [creators, filters, mapReady]);

  // ── Auto-fly to fit creators ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || creators.length === 0) return;
    const withCoords = creators.filter((c) => resolveCreatorCoords(c) !== null);
    if (withCoords.length === 0) return;

    if (withCoords.length === 1) {
      const coords = resolveCreatorCoords(withCoords[0])!;
      mapRef.current.flyTo({ center: coords, zoom: 9, duration: 1800, essential: true });
    } else {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const c of withCoords) {
        const [lng, lat] = resolveCreatorCoords(c)!;
        if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      }
      mapRef.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: { top: 80, bottom: 80, left: 80, right: 344 }, maxZoom: 10, duration: 1800 }
      );
    }
  }, [mapReady, creators]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") {
        setSelectedCreator(null);
        setShowFilters(false);
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const flyTo = useCallback((lat: number, lng: number, zoom = 10) => {
    mapRef.current?.easeTo({ center: [lng, lat], zoom, duration: 1200 });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const cityCoords = CITY_COORDS[q];
    if (cityCoords) { flyTo(cityCoords[0], cityCoords[1], 9); setSearchQuery(""); return; }

    const partialCity = Object.entries(CITY_COORDS).find(([name]) => name.includes(q) || q.includes(name));
    if (partialCity) { flyTo(partialCity[1][0], partialCity[1][1], 9); setSearchQuery(""); return; }

    const creator = creators.find((c) =>
      c.display_name.toLowerCase().includes(q) ||
      (c.niche ?? "").toLowerCase().includes(q) ||
      c.categories.some((cat) => cat.toLowerCase().includes(q)) ||
      c.platforms.some((p) => p.toLowerCase().includes(q))
    );
    if (creator) {
      const coords = resolveCreatorCoords(creator);
      if (coords) { flyTo(coords[1], coords[0], 13); setSearchQuery(""); return; }
    }

    toast("Location not found. Try a city name like Dubai or London.");
  }

  function handleSaveCreator(_creatorId: string) {
    toast.success("Creator saved to pipeline.", { duration: 2500 });
  }

  function zoomIn()  { mapRef.current?.zoomIn({ duration: 300 }); }
  function zoomOut() { mapRef.current?.zoomOut({ duration: 300 }); }

  const visibleOnMap = buildGeoJSON(creators, filters).features.length;

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ flex: "1 1 0%", minHeight: 0, background: C.canvas, color: C.textPrimary }}
    >
      {/* Top bar */}
      <div
        className="h-[52px] px-4 flex items-center gap-3 shrink-0"
        style={{ borderBottom: `1px solid ${C.borderSubtle}`, background: "oklch(0.055 0 0)", zIndex: 20 }}
      >
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <GlobeIcon className="h-3.5 w-3.5" style={{ color: C.chrome }} />
          <span className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>MRKT Globe</span>
        </div>

        {/* Role badge */}
        {userRole && (
          <span
            className="text-[9px] uppercase tracking-[0.22em] font-semibold rounded-full px-2 py-0.5 shrink-0"
            style={{
              background: userRole === "business" ? "oklch(0.66 0.09 250 / 12%)" : "oklch(0.72 0.14 152 / 10%)",
              color: userRole === "business" ? "oklch(0.66 0.09 250 / 75%)" : "oklch(0.72 0.14 152 / 75%)",
              border: `1px solid ${userRole === "business" ? "oklch(0.66 0.09 250 / 20%)" : "oklch(0.72 0.14 152 / 20%)"}`,
            }}
          >
            {userRole === "business" ? "Business" : "Creator"}
          </span>
        )}

        {/* Live dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "oklch(0.72 0.14 152)", boxShadow: "0 0 5px oklch(0.72 0.14 152 / 70%)" }}
          />
          <span className="text-[10px] font-medium" style={{ color: "oklch(0.72 0.14 152 / 75%)" }}>Live</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div
            className="flex items-center gap-2 rounded-xl px-3 h-9"
            style={{ background: "oklch(0.11 0 0)", border: `1px solid ${C.borderNormal}` }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: C.textQuaternary }} />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                userRole === "business"
                  ? "Search city, creator, niche… (⌘K)"
                  : "Search city, creator, opportunity… (⌘K)"
              }
              className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-foreground/20 min-w-0"
              style={{ color: C.textPrimary }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}>
                <X className="h-3 w-3" style={{ color: C.textMuted }} />
              </button>
            )}
          </div>
        </form>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl px-3 h-9 text-[12px] font-medium transition-all duration-150 shrink-0"
          style={{
            background: showFilters || activeFilterCount > 0 ? "oklch(1 0 0 / 8%)" : "oklch(0.11 0 0)",
            border: `1px solid ${showFilters || activeFilterCount > 0 ? C.borderStrong : C.borderNormal}`,
            color: activeFilterCount > 0 ? C.textPrimary : C.textSecondary,
          }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: C.accent, color: "#000" }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Creator count */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: C.textMuted }} />
          ) : (
            <>
              <Users className="h-3.5 w-3.5" style={{ color: C.textMuted }} />
              <span className="text-[11px] font-medium" style={{ color: C.textQuaternary }}>
                {visibleOnMap.toLocaleString()} on map
              </span>
            </>
          )}
        </div>
      </div>

      {/* Body — map + overlaid sidebar */}
      <div className="relative overflow-hidden" style={{ flex: "1 1 0%", minHeight: 0 }}>

        {/* Map */}
        <div ref={mapContainerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

        {/* Edge vignette — focuses attention toward the center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: "radial-gradient(ellipse 88% 85% at 50% 50%, transparent 30%, oklch(0 0 0 / 32%) 100%)",
          }}
        />

        {/* Loading overlay */}
        {(!mapReady || loading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 20, background: "oklch(0.04 0 0)" }}>
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                {/* Pulsing rings */}
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "oklch(0.82 0.005 250 / 10%)", animationDuration: "2s" }}
                />
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.08 0 0)", border: `1px solid ${C.borderNormal}` }}
                >
                  <GlobeIcon className="h-6 w-6" style={{ color: "oklch(1 0 0 / 15%)" }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: C.chrome }} />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <div className="text-[13px] font-semibold" style={{ color: C.textSecondary }}>Loading MRKT Globe</div>
                <div className="text-[11px]" style={{ color: C.textMuted }}>
                  {userRole === "business" ? "Finding creators worldwide…" : "Mapping the creator network…"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter panel */}
        {showFilters && mapReady && (
          <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />
        )}

        {/* Popup */}
        {selectedCreator && mapReady && (
          <CreatorPopup
            creator={selectedCreator}
            onClose={() => setSelectedCreator(null)}
            onSave={handleSaveCreator}
            visible={popupVisible}
          />
        )}

        {/* Zoom controls */}
        {mapReady && <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />}

        {/* Empty state — no creators at all */}
        {mapReady && !loading && creators.length === 0 && (
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 rounded-2xl px-5 py-3.5 flex items-center gap-3 max-w-[340px]"
            style={{
              background: "oklch(0.10 0 0 / 92%)",
              border: `1px solid ${C.borderStrong}`,
              boxShadow: C.shadowCard,
              backdropFilter: "blur(12px)",
            }}
          >
            <Radio className="h-4 w-4 shrink-0" style={{ color: C.textMuted }} />
            <span className="text-[12px]" style={{ color: C.textSecondary }}>
              {userRole === "business"
                ? "Creators appear here as they join MRKT and set their location."
                : "Be the first to set your location and appear on the map."
              }
            </span>
          </div>
        )}

        {/* Empty state — no matches for filters */}
        {mapReady && !loading && visibleOnMap === 0 && creators.length > 0 && (
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 rounded-2xl px-5 py-3.5 flex items-center gap-3"
            style={{
              background: "oklch(0.10 0 0 / 92%)",
              border: `1px solid ${C.borderStrong}`,
              boxShadow: C.shadowCard,
              backdropFilter: "blur(12px)",
            }}
          >
            <Zap className="h-4 w-4 shrink-0" style={{ color: C.textMuted }} />
            <span className="text-[12px]" style={{ color: C.textSecondary }}>No creators match your current filters.</span>
            <button
              onClick={() => setFilters({ platforms: [], categories: [], availability: "all" })}
              className="text-[12px] font-medium underline underline-offset-2 shrink-0 transition-colors"
              style={{ color: C.chrome }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.textPrimary; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.chrome; }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Hint — auto-dismisses after 5s */}
        {mapReady && !loading && visibleOnMap > 0 && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-2 flex items-center gap-2"
            style={{
              background: "oklch(0.09 0 0 / 90%)",
              border: `1px solid ${C.borderSubtle}`,
              backdropFilter: "blur(12px)",
              boxShadow: "0 2px 16px oklch(0 0 0 / 50%)",
              opacity: hintVisible ? 1 : 0,
              transition: "opacity 0.7s ease",
              pointerEvents: hintVisible ? "auto" : "none",
            }}
          >
            <Navigation2 className="h-3 w-3 shrink-0" style={{ color: C.textMuted }} />
            <span className="text-[11px] whitespace-nowrap" style={{ color: C.textTertiary }}>
              {userRole === "business"
                ? "Click a creator to view their profile and save to your pipeline"
                : "Click a creator to view their profile"
              }
            </span>
          </div>
        )}

        {/* Right sidebar — glass panel overlaid on map, desktop only */}
        <div
          className="absolute right-0 top-0 bottom-0 hidden md:flex flex-col overflow-hidden"
          style={{
            width: "264px",
            background: "oklch(0.06 0 0 / 88%)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            borderLeft: `1px solid ${C.borderSubtle}`,
            boxShadow: "-6px 0 24px oklch(0 0 0 / 35%)",
            zIndex: 15,
          }}
        >
          <SidebarHeader userRole={userRole} />
          {userRole === "business" && <BusinessSidebar creators={creators} onFlyTo={flyTo} />}
          {userRole === "creator"  && <CreatorSidebar  creators={creators} onFlyTo={flyTo} />}
          {userRole === null && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: C.textMuted }} />
            </div>
          )}
        </div>
      </div>

      <BottomBar creators={creators} userRole={userRole} />
      <MobileStats creators={creators} />
    </div>
  );
}
