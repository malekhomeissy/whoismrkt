import "maplibre-gl/dist/maplibre-gl.css";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth.tsx";
import { toast } from "sonner";
import {
  Search, X, SlidersHorizontal, Users, MapPin, Plane,
  ArrowUpRight, Loader2, Zap, Navigation2,
  ChevronRight, Globe as GlobeIcon, CheckCircle2, Bookmark,
  TrendingUp, Layers as LayersIcon, Radio,
} from "lucide-react";
import { guessCoords, CITY_COORDS, buildCityDensity, deterministicJitter } from "@/lib/geocoding";
import {
  formatFollowers, CATEGORY_LABELS, platformShort,
  type CreatorCategory,
} from "@/types/creator";
import {
  computeMatchScore, type CampaignInput, scoreBg, scoreColor,
} from "@/lib/matchScore";
import { MatchScoreBadge } from "@/components/ui/MatchScoreBadge";
import { VerifiedBadge } from "@/components/app/VerifiedBadge";
import { RatingsDisplay } from "@/components/app/RatingsDisplay";

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
  city?: string | null;
  availability_status?: string | null;
  is_verified?: boolean;
  avg_rating?: number | null;
  review_count?: number;
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
  is_verified?: boolean;
  avg_rating?: number | null;
  review_count?: number;
};

type GlobeFilters = {
  platforms: string[];
  categories: string[];
  availability: "all" | "available" | "traveling";
};

// ── Design tokens ─────────────────────────────────────────────────────────────

import { C } from "@/lib/theme";

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
  C.chrome,  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)", "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

// ── City lights data — [lng, lat, intensity 1–5] ─────────────────────────────

const CITY_LIGHTS: [number, number, number][] = [
  // North America
  [-74.006,  40.713, 5], [-87.630,  41.878, 4], [-118.244, 34.052, 4],
  [-95.370,  29.760, 3], [-112.074, 33.448, 3], [-77.037,  38.907, 3],
  [-122.419, 37.775, 3], [-122.332, 47.606, 2], [-80.192,  25.762, 3],
  [-99.133,  19.433, 4], [-79.383,  43.653, 3], [-73.567,  45.502, 2],
  [-96.797,  32.776, 3], [-84.388,  33.749, 2],
  // South America
  [-46.633, -23.551, 4], [-43.173, -22.907, 3], [-58.382, -34.604, 3],
  [-70.669, -33.449, 2], [-74.072,   4.711, 2], [-77.043, -12.046, 2],
  // Europe
  [  -0.128,  51.507, 5], [  2.352,  48.857, 4], [ 13.405,  52.520, 3],
  [  18.069,  59.329, 2], [  4.904,  52.368, 2], [ 16.374,  48.208, 2],
  [   9.184,  45.468, 2], [ 12.496,  41.903, 2], [ 11.582,  48.135, 2],
  [  -9.140,  38.722, 2], [ -3.704,  40.417, 2], [  4.352,  50.850, 2],
  [  30.523,  50.450, 3], [ 21.006,  52.230, 2], [ 26.098,  44.427, 2],
  [  28.979,  41.008, 4], [ 23.322,  42.698, 2], [ 23.728,  37.984, 2],
  // Africa & Middle East
  [  31.236,  30.044, 3], [  3.379,   6.524, 3], [ 36.822,  -1.292, 2],
  [  28.047, -26.204, 3], [ 18.424, -33.925, 2], [  3.867,  11.517, 2],
  [  55.271,  25.205, 4], [ 51.389,  35.689, 3], [ 46.675,  24.714, 3],
  [  51.655,  25.285, 3], [ 35.502,  33.894, 2], [ 44.332,  33.315, 2],
  [  39.858,  21.389, 2],
  // Russia & Central Asia
  [  37.622,  55.756, 4], [ 82.921,  55.030, 2], [ 60.597,  56.838, 2],
  // South Asia
  [  67.009,  24.862, 3], [ 74.359,  31.520, 2], [ 72.878,  19.076, 4],
  [  77.209,  28.614, 4], [ 88.364,  22.573, 3], [ 80.271,  13.083, 2],
  [  85.324,  27.717, 2],
  // SE & East Asia
  [ 103.820,   1.352, 4], [101.687,   3.148, 3], [100.502,  13.756, 3],
  [ 106.630,  10.823, 3], [104.868,  11.556, 2], [105.834,  21.028, 3],
  [ 114.170,  22.319, 4], [121.474,  31.230, 5], [116.407,  39.904, 5],
  [ 113.264,  23.129, 3], [126.978,  37.566, 4], [129.076,  35.180, 2],
  [ 135.502,  34.694, 3], [136.907,  35.182, 2], [139.692,  35.690, 5],
  [ 130.402,  33.590, 2], [120.984,  14.600, 2], [121.565,  25.033, 3],
  // Oceania
  [ 151.209, -33.869, 3], [144.963, -37.814, 3], [115.858, -31.951, 2],
  [ 153.025, -27.470, 2], [138.601, -34.929, 2],
];

const CITY_LIGHTS_GEOJSON = {
  type: "FeatureCollection" as const,
  features: CITY_LIGHTS.map(([lng, lat, i]) => ({
    type:     "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
    properties: { i },
  })),
};

// ── MapLibre vector style — MRKT Dark ─────────────────────────────────────────
//
// Monochrome palette: pure black land, dark grey roads, no blue/purple tints.
// Roads recede into background — creator markers are the visual focus.
//
// Target palette:
//   Land         #0A0A0A  — near-black
//   Water        #050508  — darker than land (coastline contrast)
//   Parks        #0A0D0A  — same depth, faint warmth
//   Buildings    #121214  — barely visible block structure at z14+
//   Roads:
//     minor       #252525  z13+  hairline only
//     secondary   #2A2A2A  z11+
//     primary     #383838  z9+
//     trunk       #484848  z7+
//     motorway    #505050  z6+   brightest
//   Casings only on primary/trunk/motorway — hairline, purely functional
//   Labels:
//     Road names  #666666  (very dim)
//     Suburbs     #888888
//     Towns       #B0B0B0
//     Cities      #D9D9D9  (readable)
//     Countries   #C0C0C0  uppercase

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const z = (v: unknown) => v as any;

const DARK_STYLE = {
  version: 8 as const,
  glyphs:  "https://tiles.openfreemap.org/glyphs/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: {
      type: "vector" as const,
      url:  "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [

    // ── 0. Background = land colour ────────────────────────────────────
    // Background fills everything that isn't explicitly tagged as water,
    // landcover, etc. — i.e. all the bare land/urban areas between tagged
    // zones. Setting it to grey makes every continent visually clear.
    { id: "background", type: "background" as const,
      paint: { "background-color": "#262626" } },

    // ── 1. Land cover (forest, farmland, grass) ────────────────────────
    // Slightly darker than bare land — subtle natural-area texture
    { id: "landcover", type: "fill" as const,
      source: "openmaptiles", "source-layer": "landcover",
      paint: { "fill-color": "#222222", "fill-opacity": 1 } },

    // ── 2. Land use — residential / commercial ─────────────────────────
    { id: "landuse", type: "fill" as const,
      source: "openmaptiles", "source-layer": "landuse",
      paint: { "fill-color": "#282828", "fill-opacity": 0.85 } },

    // ── 3. Parks / green space ─────────────────────────────────────────
    { id: "park", type: "fill" as const,
      source: "openmaptiles", "source-layer": "park",
      paint: { "fill-color": "#232820", "fill-opacity": 0.9 } },

    // ── 4. Water — clearly darker than land for instant coast contrast ──
    { id: "water", type: "fill" as const,
      source: "openmaptiles", "source-layer": "water",
      paint: { "fill-color": "#0A0A0E" } },

    { id: "waterway", type: "line" as const,
      source: "openmaptiles", "source-layer": "waterway",
      paint: { "line-color": "#060610",
               "line-width": z(["interpolate",["linear"],["zoom"], 8,0.4, 12,1.5, 15,3]) } },

    // ── 5. Buildings — slightly lighter than land, subtle block structure ─
    { id: "building", type: "fill" as const,
      source: "openmaptiles", "source-layer": "building",
      minzoom: 13,
      paint: { "fill-color": "#2E2E2E",
               "fill-opacity": z(["interpolate",["linear"],["zoom"], 13,0, 14,0.8]) } },
    { id: "building-outline", type: "line" as const,
      source: "openmaptiles", "source-layer": "building",
      minzoom: 14,
      paint: { "line-color": "#383838", "line-width": 0.3, "line-opacity": 0.5 } },

    // ── 6. Road casings — only for primary/trunk/motorway, hairline ────
    // Minor + secondary have NO casings — keeps the map calm and flat
    { id: "road-casing-primary", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["==", "class", "primary"]),
      minzoom: 9,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#141414",
               "line-width": z(["interpolate",["linear"],["zoom"], 9,1.2, 12,2, 14,3, 18,6]) } },

    { id: "road-casing-trunk-motorway", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["in", "class", "trunk", "motorway"]),
      minzoom: 7,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#161616",
               "line-width": z(["interpolate",["linear"],["zoom"], 7,1.2, 10,2, 12,3, 14,4.5, 18,8]) } },

    // ── 7. Road fills — monochrome hierarchy ──────────────────────────
    // Roads are whispers, not features. Creator markers are the signal.

    { id: "road-path", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["in", "class", "path", "footway", "cycleway"]),
      minzoom: 15,
      layout: { "line-cap": "round" as const },
      paint: { "line-color": "#1E1E1E",
               "line-width": z(["interpolate",["linear"],["zoom"], 15,0.3, 18,1.5]),
               "line-dasharray": [2, 3] } },

    { id: "road-minor", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["in", "class", "minor", "service", "track"]),
      minzoom: 13,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#252525",
               "line-width": z(["interpolate",["linear"],["zoom"], 13,0.3, 16,1, 18,2]) } },

    { id: "road-secondary", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["in", "class", "secondary", "tertiary"]),
      minzoom: 11,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#2A2A2A",
               "line-width": z(["interpolate",["linear"],["zoom"], 11,0.3, 14,1, 16,2, 18,3.5]) } },

    { id: "road-primary", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["==", "class", "primary"]),
      minzoom: 9,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#383838",
               "line-width": z(["interpolate",["linear"],["zoom"], 9,0.3, 12,0.8, 14,1.5, 18,4]) } },

    { id: "road-trunk", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["==", "class", "trunk"]),
      minzoom: 7,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#484848",
               "line-width": z(["interpolate",["linear"],["zoom"], 7,0.3, 10,0.8, 12,1.5, 14,2.5, 18,5]) } },

    { id: "road-motorway", type: "line" as const,
      source: "openmaptiles", "source-layer": "transportation",
      filter: z(["==", "class", "motorway"]),
      minzoom: 6,
      layout: { "line-cap": "round" as const, "line-join": "round" as const },
      paint: { "line-color": "#505050",
               "line-width": z(["interpolate",["linear"],["zoom"], 6,0.3, 9,0.8, 12,2, 14,3, 18,6]) } },

    // ── 8. Admin boundaries ────────────────────────────────────────────
    { id: "boundary-country", type: "line" as const,
      source: "openmaptiles", "source-layer": "boundary",
      filter: z(["==", "admin_level", 2]),
      paint: { "line-color": "#202020",
               "line-width": z(["interpolate",["linear"],["zoom"], 2,0.5, 6,1.5]),
               "line-dasharray": [4, 2], "line-opacity": 0.75 } },

    // ── 9. Road name labels ────────────────────────────────────────────
    { id: "road-label", type: "symbol" as const,
      source: "openmaptiles", "source-layer": "transportation_name",
      minzoom: 14,
      layout: {
        "text-field":       z(["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]),
        "text-font":        ["Noto Sans Regular"],
        "text-size":        z(["interpolate",["linear"],["zoom"], 14,9, 17,11]),
        "symbol-placement": "line" as const,
        "text-max-angle":   30,
        "text-padding":     6,
      },
      paint: { "text-color": "#666666", "text-halo-color": "#060606", "text-halo-width": 1.5 } },

    // ── 10. Place labels — neighbourhood / suburb ──────────────────────
    { id: "place-suburb", type: "symbol" as const,
      source: "openmaptiles", "source-layer": "place",
      filter: z(["in", "class", "suburb", "neighbourhood", "hamlet", "quarter"]),
      minzoom: 12,
      layout: {
        "text-field":       z(["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]),
        "text-font":        ["Noto Sans Regular"],
        "text-size":        z(["interpolate",["linear"],["zoom"], 12,9, 14,12]),
        "text-max-width":   8,
        "text-letter-spacing": 0.04,
      },
      paint: { "text-color": "#888888", "text-halo-color": "#060606", "text-halo-width": 1.5 } },

    // ── 11. Place labels — town / village ──────────────────────────────
    { id: "place-town", type: "symbol" as const,
      source: "openmaptiles", "source-layer": "place",
      filter: z(["in", "class", "village", "town"]),
      minzoom: 8,
      layout: {
        "text-field":     z(["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]),
        "text-font":      ["Noto Sans Regular"],
        "text-size":      z(["interpolate",["linear"],["zoom"], 8,10, 12,13]),
        "text-max-width": 8,
      },
      paint: { "text-color": "#B0B0B0", "text-halo-color": "#050505", "text-halo-width": 2 } },

    // ── 12. Place labels — city ────────────────────────────────────────
    { id: "place-city", type: "symbol" as const,
      source: "openmaptiles", "source-layer": "place",
      filter: z(["==", "class", "city"]),
      minzoom: 3,
      layout: {
        "text-field":     z(["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]),
        "text-font":      ["Noto Sans Bold"],
        "text-size":      z(["interpolate",["linear"],["zoom"], 3,11, 8,16, 12,20]),
        "text-max-width": 8,
      },
      paint: { "text-color": "#D9D9D9", "text-halo-color": "#040404", "text-halo-width": 3 } },

    // ── 13. Place labels — country ─────────────────────────────────────
    { id: "place-country", type: "symbol" as const,
      source: "openmaptiles", "source-layer": "place",
      filter: z(["==", "class", "country"]),
      layout: {
        "text-field":          z(["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]),
        "text-font":           ["Noto Sans Bold"],
        "text-size":           z(["interpolate",["linear"],["zoom"], 2,10, 5,14]),
        "text-transform":      "uppercase" as const,
        "text-letter-spacing": 0.1,
        "text-max-width":      8,
      },
      paint: { "text-color": "#C0C0C0", "text-halo-color": "#040408", "text-halo-width": 3 } },

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
  creator, onClose, onSave, visible, matchScore, userRole,
}: {
  creator:    SelectedCreator;
  onClose:    () => void;
  onSave:     (id: string) => void;
  visible:    boolean;
  matchScore?: number;
  userRole?:  UserRole;
}) {
  const [saved, setSaved] = useState(false);
  const [invited, setInvited] = useState(false);
  const navigate = useNavigate();

  function handleSave() {
    onSave(creator.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleInvite() {
    setInvited(true);
    localStorage.setItem("mrkt_invite_creator", creator.id);
    setTimeout(() => navigate({ to: `/creators/${creator.id}` as "/" }), 300);
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
                className="h-14 w-14 rounded-full object-cover img-fade"
                style={{ border: "2px solid oklch(1 0 0 / 20%)", boxShadow: "0 0 12px oklch(1 0 0 / 10%)" }}
                onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "1"; }}
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
                  ? C.green
                  : creator.availability_status === "traveling"
                  ? C.amber
                  : C.textTertiary,
                border: "2px solid oklch(0.10 0 0)",
                boxShadow: creator.availability_status === "available"
                  ? `0 0 6px ${C.green}99`
                  : "none",
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[14px] font-semibold truncate" style={{ color: C.textPrimary }}>
                {creator.display_name}
              </span>
              {creator.is_verified && <VerifiedBadge type="creator" size="sm" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {creator.niche && (
                <span
                  className="inline-block text-[9px] uppercase tracking-[0.20em] font-medium rounded-full px-2 py-0.5"
                  style={{ background: "oklch(1 0 0 / 7%)", color: C.textTertiary, border: `1px solid ${C.borderSubtle}` }}
                >
                  {creator.niche}
                </span>
              )}
              {matchScore !== undefined && matchScore > 0 && (
                <MatchScoreBadge score={matchScore} size="xs" showLabel />
              )}
            </div>
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
          {(creator.avg_rating ?? 0) > 0 && (creator.review_count ?? 0) > 0 && (
            <RatingsDisplay avgRating={creator.avg_rating} reviewCount={creator.review_count} />
          )}
          {creator.availability_status === "available" && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: C.green }} />
              <span className="text-[11px]" style={{ color: C.green }}>Available now</span>
            </div>
          )}
          {creator.availability_status === "traveling" && (
            <div className="flex items-center gap-1">
              <Plane className="h-3 w-3 shrink-0" style={{ color: C.chrome }} />
              <span className="text-[11px]" style={{ color: C.chrome }}>Traveling</span>
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
              background: saved ? "oklch(1 0 0 / 14%)" : "oklch(1 0 0 / 6%)",
              border: `1px solid ${saved ? "oklch(1 0 0 / 35%)" : C.borderNormal}`,
              color: saved ? "oklch(0.84 0 0)" : C.textSecondary,
            }}
          >
            <Bookmark className={`h-3.5 w-3.5 transition-all duration-200 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>

          {userRole === "business" ? (
            <button
              onClick={handleInvite}
              className="flex items-center justify-center gap-2 flex-1 rounded-full h-9 text-[12.5px] font-medium transition-all duration-150"
              style={{
                background: invited ? `${C.aiBlue}22` : `${C.aiBlue}18`,
                border: `1px solid ${invited ? C.aiBlue : C.aiBlueBorder}`,
                color: invited ? C.aiBlue : C.aiBlue,
                opacity: invited ? 0.7 : 1,
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              {invited ? "Opening…" : "Invite to Campaign"}
            </button>
          ) : (
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
          )}
        </div>

        {/* Secondary action for business: view full profile */}
        {userRole === "business" && (
          <div className="mt-2">
            <Link
              to={`/creators/${creator.id}` as "/"}
              className="flex items-center justify-center gap-2 w-full rounded-full h-8 text-[11.5px] font-medium transition-all duration-150"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.borderSubtle}`, color: C.textTertiary }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 10%)";
                (e.currentTarget as HTMLElement).style.color = C.textSecondary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 5%)";
                (e.currentTarget as HTMLElement).style.color = C.textTertiary;
              }}
            >
              View Profile <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
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
  creators, onFlyTo, userId, onRefresh,
}: {
  creators: MapCreator[];
  onFlyTo: (lat: number, lng: number, zoom?: number) => void;
  userId: string;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm]     = useState(false);
  const [city, setCity]             = useState("");
  const [date, setDate]             = useState("");
  const [saving, setSaving]         = useState(false);

  async function saveTravelPlan() {
    if (!city.trim() || !date) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: myProfile, error: pErr } = await (supabase as any)
        .from("creator_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (pErr || !myProfile) { toast.error("Creator profile not found."); return; }

      const coords = guessCoords(city.trim().toLowerCase());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("creator_availability")
        .upsert({
          creator_profile_id: myProfile.id,
          traveling_to_city:  city.trim(),
          traveling_to_lat:   coords ? coords[1] : null,
          traveling_to_lng:   coords ? coords[0] : null,
          travel_date:        date,
        }, { onConflict: "creator_profile_id" });

      if (error) { toast.error("Could not save travel plan."); return; }
      toast.success("Travel plan saved.");
      setShowForm(false); setCity(""); setDate("");
      onRefresh();
    } finally {
      setSaving(false);
    }
  }
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
          accent="oklch(0.84 0 0)"
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
        <div className="flex items-center gap-2 mb-3">
          <Plane className="h-3 w-3 shrink-0" style={{ color: C.chrome }} />
          <span className="text-[9px] uppercase tracking-[0.34em] font-semibold" style={{ color: C.textMuted }}>
            Traveling Soon
          </span>
          <button
            onClick={() => { setShowForm((v) => !v); setCity(""); setDate(""); }}
            className="ml-auto text-[9px] font-semibold rounded-full px-2 py-0.5 transition-all"
            style={{ background: C.borderFaint, color: C.textMuted, border: `1px solid ${C.borderSubtle}` }}
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl p-3.5 space-y-2.5 mb-3" style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.borderSubtle}` }}>
            <input
              type="text"
              placeholder="Destination city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: "oklch(1 0 0 / 6%)", border: `1px solid ${C.borderSubtle}`, color: C.textPrimary }}
            />
            <button
              onClick={saveTravelPlan}
              disabled={saving || !city.trim() || !date}
              className="w-full rounded-lg py-2 text-[11.5px] font-semibold transition-all disabled:opacity-40"
              style={{ background: C.raised, color: C.chrome, border: `1px solid ${C.borderNormal}` }}
            >
              {saving ? "Saving…" : "Save travel plan"}
            </button>
          </div>
        )}

        {traveling.length === 0 ? (
          <div className="rounded-xl p-4 text-center space-y-1.5" style={{ background: "oklch(1 0 0 / 3%)", border: `1px dashed ${C.borderSubtle}` }}>
            <Plane className="h-5 w-5 mx-auto" style={{ color: C.textMuted }} />
            <p className="text-[11.5px] font-medium" style={{ color: C.textTertiary }}>No travel plans yet</p>
            <p className="text-[10.5px]" style={{ color: C.textMuted }}>
              Let brands discover you before you arrive.
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
                    <span style={{ color: C.textTertiary }}>→</span>
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
                          background: "linear-gradient(90deg, oklch(0.62 0.10 224 / 70%), oklch(0.82 0.18 264 / 40%))",
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
            <SectionHeader icon={Plane} label="Available in Your City Soon" accent={C.chrome} />
            <p className="text-[10.5px] mb-2" style={{ color: C.textMuted }}>
              Creators traveling to new markets — reach out before they arrive.
            </p>
            <div className="space-y-1.5">
              {travelingSoon.map((c) => (
                <Link
                  key={c.id}
                  to={`/creators/${c.id}` as "/"}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-100 group"
                  style={{ background: "oklch(1 0 0 / 3%)", border: `1px solid ${C.borderSubtle}`, textDecoration: "none", display: "flex" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 6%)"; (e.currentTarget as HTMLElement).style.borderColor = C.borderNormal; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 3%)"; (e.currentTarget as HTMLElement).style.borderColor = C.borderSubtle; }}
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
                    <div className="text-[10px]" style={{ color: C.chrome }}>
                      → {c.availability?.traveling_to_city}
                    </div>
                    {c.availability?.travel_date && (
                      <div className="text-[10px]" style={{ color: C.textQuaternary }}>
                        {new Date(c.availability.travel_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                  <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: C.textMuted }} />
                </Link>
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
        <div className="h-1.5 w-1.5 rounded-full" style={{ background: "oklch(0.84 0 0)", boxShadow: "0 0 4px oklch(1 0 0 / 70%)" }} />
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
  const hoveredIdRef      = useRef<string | null>(null);
  const selectedIdRef     = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maplibreRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const domMarkersRef     = useRef<Record<string, any>>({});

  const [creators,         setCreators]        = useState<MapCreator[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [mapReady,         setMapReady]        = useState(false);
  const [userRole,         setUserRole]        = useState<UserRole>(null);
  const [searchQuery,      setSearchQuery]     = useState("");
  const [showFilters,      setShowFilters]     = useState(false);
  const [selectedCreator,  setSelectedCreator] = useState<SelectedCreator | null>(null);
  const [popupVisible,     setPopupVisible]    = useState(false);
  const [hintVisible,      setHintVisible]     = useState(true);
  const [activeCampaign,   setActiveCampaign]  = useState<CampaignInput | null>(null);
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

  // ── Load active campaign for match scores (business only) ──────────────────
  useEffect(() => {
    if (!user || userRole !== "business") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("campaigns")
      .select("id,title,niche,platforms,target_audience,location,budget_min,budget_max,follower_min,follower_max,categories")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: CampaignInput | null }) => {
        if (data) setActiveCampaign(data);
      });
  }, [user, userRole]);

  // ── Load creators ───────────────────────────────────────────────────────────
  const loadCreators = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [profilesRes, availRes] = await Promise.all([
        (supabase as any)
          .from("creator_profiles")
          .select(
            "id,display_name,profile_image_url,follower_count,categories,platforms,niche," +
            "location,location_lat,location_lng,location_city,location_country,is_verified,avg_rating,review_count"
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadCreators(); }, [loadCreators]);

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
      maplibreRef.current = maplibregl;

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

        // ── City lights — satellite-accurate, no yellow bloom ──────────────
        // Two layers only: a tight champagne-white core (pinpoint at world zoom)
        // and a faint atmosphere halo that only appears once you're zoomed in.
        // No yellow, no amber, no blurry orbs at global scale.
        try {
          map.addSource("citylights", { type: "geojson", data: CITY_LIGHTS_GEOJSON });

          // Faint urban-atmosphere halo — only visible at world/country zoom.
          // Fades completely before you reach city level (z9+).
          map.addLayer({
            id: "lights-halo", type: "circle", source: "citylights",
            minzoom: 3, maxzoom: 10,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"],
                3, ["*", ["get", "i"],  1.6],
                6, ["*", ["get", "i"],  5.0],
                9, ["*", ["get", "i"], 11.0],
              ],
              "circle-color":   "rgba(255,238,205,0.028)",
              "circle-blur":    0.88,
              // Fade: fully visible at z3, gone by z9
              "circle-opacity": ["interpolate", ["linear"], ["zoom"],
                3, 1.0,
                6, 0.7,
                8, 0.15,
                9, 0,
              ],
            },
          });

          // Champagne-white city core — world/country view only.
          // Fades as streets and roads take over at city zoom.
          map.addLayer({
            id: "lights-core", type: "circle", source: "citylights",
            maxzoom: 10,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"],
                1, ["*", ["get", "i"], 0.45],
                4, ["*", ["get", "i"], 1.30],
                7, ["*", ["get", "i"], 3.00],
               10, ["*", ["get", "i"], 6.50],
              ],
              "circle-color":   "rgba(255,244,218,0.45)",
              "circle-blur":    0.08,
              // Fade: full at z1–5, progressive fade z6–9, invisible z10+
              "circle-opacity": ["interpolate", ["linear"], ["zoom"],
                1, 1.0,
                5, 1.0,
                7, 0.6,
                9, 0.05,
               10, 0,
              ],
            },
          });
        } catch (err) {
          console.warn("[MRKT Globe] city lights skipped:", err);
        }

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

        // Click elsewhere → dismiss popup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["creator-clusters"],
          });
          if (!features.length) {
            setSelectedCreator(null);
            setHintVisible(false);
          }
        });

        // Cursor changes on cluster hover
        map.on("mouseenter", "creator-clusters",  () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "creator-clusters",  () => { map.getCanvas().style.cursor = ""; });

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

  // ── DOM Markers + GeoJSON (for clusters) ────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !maplibreRef.current) return;
    const map = mapRef.current;

    // Update GeoJSON source for cluster layer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const source = map.getSource("creators") as any;
    if (source) source.setData(buildGeoJSON(creators, filters));

    // Remove all existing DOM markers
    Object.values(domMarkersRef.current).forEach((m: any) => m.remove());
    domMarkersRef.current = {};

    // Create a DOM marker for each creator with valid coordinates
    for (const creator of creators) {
      const coords = resolveCreatorCoords(creator);
      if (!coords) continue;

      // Outer wrapper
      const el = document.createElement("div");
      el.style.cssText = `
        position: relative;
        display: flex; flex-direction: column; align-items: center;
        cursor: pointer;
        will-change: transform;
      `;

      // Circle container — chrome ring with cinematic glow
      const circle = document.createElement("div");
      circle.style.cssText = `
        width: 52px; height: 52px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid rgba(255,255,255,0.92);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.88), 0 0 22px rgba(255,255,255,0.10), 0 0 48px rgba(255,255,255,0.04);
        background: ${avatarColor(creator.display_name)};
        display: flex; align-items: center; justify-content: center;
        will-change: transform;
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.22s ease;
      `;

      if (creator.profile_image_url) {
        const img = document.createElement("img");
        img.src = creator.profile_image_url;
        img.alt = creator.display_name;
        img.crossOrigin = "anonymous";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        img.onerror = () => {
          img.remove();
          const fallback = document.createElement("span");
          fallback.textContent = creator.display_name[0]?.toUpperCase() ?? "?";
          fallback.style.cssText = `
            font-size: 20px; font-weight: 700; color: rgba(0,0,0,0.8);
            font-family: -apple-system, sans-serif; line-height: 1;
          `;
          circle.appendChild(fallback);
        };
        circle.appendChild(img);
      } else {
        const fallback = document.createElement("span");
        fallback.textContent = creator.display_name[0]?.toUpperCase() ?? "?";
        fallback.style.cssText = `
          font-size: 20px; font-weight: 700; color: rgba(0,0,0,0.8);
          font-family: -apple-system, sans-serif; line-height: 1;
        `;
        circle.appendChild(fallback);
      }

      el.appendChild(circle);

      // Hover name tooltip — hidden by default, shown on mouseenter
      const nameTag = document.createElement("div");
      nameTag.textContent = creator.display_name;
      nameTag.style.cssText = `
        position: absolute; top: calc(100% + 7px); left: 50%; transform: translateX(-50%);
        background: rgba(10,10,10,0.92); backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 7px; padding: 4px 9px;
        font-size: 11.5px; font-weight: 600; color: rgba(255,255,255,0.92);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        white-space: nowrap; line-height: 1.4; letter-spacing: 0.01em;
        pointer-events: none;
        opacity: 0; transition: opacity 0.15s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      `;
      el.appendChild(nameTag);

      el.addEventListener("mouseenter", () => {
        circle.style.transform = "scale(1.2)";
        circle.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.45), 0 8px 32px rgba(0,0,0,0.92), 0 0 38px rgba(255,255,255,0.18), 0 0 76px rgba(255,255,255,0.08)";
        circle.style.borderColor = "rgba(255,255,255,1)";
        nameTag.style.opacity = "1";
      });
      el.addEventListener("mouseleave", () => {
        circle.style.transform = "scale(1)";
        circle.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.88), 0 0 22px rgba(255,255,255,0.10), 0 0 48px rgba(255,255,255,0.04)";
        circle.style.borderColor = "rgba(255,255,255,0.92)";
        nameTag.style.opacity = "0";
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedIdRef.current = creator.id;
        setSelectedCreator({
          id:                  creator.id,
          display_name:        creator.display_name,
          niche:               creator.niche ?? null,
          categories:          creator.categories,
          platforms:           creator.platforms,
          follower_count:      creator.follower_count,
          profile_image_url:   creator.profile_image_url ?? null,
          city:                creator.city ?? null,
          availability_status: creator.availability_status ?? "available",
          is_verified:         creator.is_verified ?? false,
          avg_rating:          creator.avg_rating ?? null,
          review_count:        creator.review_count ?? 0,
        });
        setHintVisible(false);
        map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 13), duration: 500 });
      });

      const marker = new maplibreRef.current.Marker({ element: el, anchor: "center" })
        .setLngLat(coords)
        .addTo(map);

      domMarkersRef.current[creator.id] = marker;
    }

    return () => {
      Object.values(domMarkersRef.current).forEach((m: any) => m.remove());
      domMarkersRef.current = {};
    };
  }, [mapReady, creators, filters]); // eslint-disable-line react-hooks/exhaustive-deps

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
              background: userRole === "business" ? C.blueBg : C.borderFaint,
              color: userRole === "business" ? C.aiBlue : C.textSecondary,
              border: `1px solid ${userRole === "business" ? C.blueBorder : C.borderSubtle}`,
            }}
          >
            {userRole === "business" ? "Business" : "Creator"}
          </span>
        )}

        {/* Live dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "oklch(0.84 0 0)", boxShadow: "0 0 5px oklch(1 0 0 / 70%)" }}
          />
          <span className="text-[10px] font-medium" style={{ color: "oklch(1 0 0 / 75%)" }}>Live</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div
            className="flex items-center gap-2 rounded-xl px-3 h-9"
            style={{ background: "oklch(0.10 0 0)", border: `1px solid ${C.borderNormal}` }}
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
            background: showFilters || activeFilterCount > 0 ? "oklch(1 0 0 / 8%)" : "oklch(0.10 0 0)",
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

        {/* Edge vignette — cinematic frame focusing attention on map */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: "radial-gradient(ellipse 82% 78% at 50% 50%, transparent 25%, oklch(0 0 0 / 22%) 60%, oklch(0 0 0 / 52%) 100%)",
          }}
        />

        {/* Loading overlay */}
        {(!mapReady || loading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 20, background: "oklch(0 0 0)" }}>
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                {/* Pulsing rings */}
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "oklch(0.82 0.005 0 / 10%)", animationDuration: "2s" }}
                />
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.065 0 0)", border: `1px solid ${C.borderNormal}` }}
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
            userRole={userRole}
            matchScore={
              activeCampaign
                ? computeMatchScore(
                    {
                      platforms:         selectedCreator.platforms,
                      niche:             selectedCreator.niche,
                      categories:        selectedCreator.categories,
                      follower_count:    selectedCreator.follower_count,
                      location:          selectedCreator.city ?? null,
                      audience_location: null,
                      primary_language:  null,
                      accepts_paid:      true,
                      accepts_gifted:    true,
                      accepts_affiliate: true,
                    },
                    activeCampaign,
                  ).total
                : undefined
            }
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
          {userRole === "creator"  && <CreatorSidebar  creators={creators} onFlyTo={flyTo} userId={user?.id ?? ""} onRefresh={loadCreators} />}
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
