// ── MRKT App Preloader ─────────────────────────────────────────────────────
// Eagerly downloads JS route chunks and prefetches lightweight Supabase data
// after the first paint so every subsequent navigation feels instant.

import { supabase } from "@/integrations/supabase/client";

// ── TTL cache ─────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  CACHE.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Module-level preload function (set by AppShell once router is ready) ──────

type PreloadFn = (to: string) => void;
let _preloadFn: PreloadFn | null = null;

export function setPreloadFn(fn: PreloadFn): void {
  _preloadFn = fn;
}

/** Call from nav components on onTouchStart / onMouseEnter for explicit preload */
export function preloadRoute(to: string): void {
  _preloadFn?.(to);
}

// ── Prioritized route lists (role-aware) ──────────────────────────────────────

const CREATOR_ROUTES = [
  "/home",
  "/opportunities",
  "/applications",
  "/messages",
  "/chat",
  "/content-planner",
  "/notifications",
  "/profile",
  "/analytics",
  "/growth",
  "/globe",
  "/create",
  "/verification",
  "/contracts",
  "/settings",
];

const BUSINESS_ROUTES = [
  "/home",
  "/campaigns",
  "/pipeline",
  "/find-creators",
  "/messages",
  "/chat",
  "/content-planner",
  "/notifications",
  "/profile",
  "/contracts",
  "/deliverables",
  "/globe",
  "/create",
  "/settings",
];

const FALLBACK_ROUTES = [
  "/home",
  "/messages",
  "/chat",
  "/notifications",
  "/settings",
  "/profile",
];

// ── Singleton guards ───────────────────────────────────────────────────────────

let _chunksPreloaded = false;
let _dataPreloadedFor: string | null = null;

// ── Route chunk preloading ─────────────────────────────────────────────────────

function preloadRouteChunks(role: "creator" | "business" | null): void {
  if (_chunksPreloaded) return;
  _chunksPreloaded = true;

  const routes =
    role === "creator"  ? CREATOR_ROUTES  :
    role === "business" ? BUSINESS_ROUTES :
    FALLBACK_ROUTES;

  // Stagger downloads so we don't saturate the HTTP/2 connection pool.
  // First route starts at 400ms (after first paint), each subsequent at +80ms.
  let delay = 400;
  for (const to of routes) {
    const capturedTo = to;
    setTimeout(() => preloadRoute(capturedTo), delay);
    delay += 80;
  }
}

// ── Lightweight data prefetching ──────────────────────────────────────────────
// Only fetches small, universal data. Never large lists.

async function prefetchData(userId: string, role: "creator" | "business" | null): Promise<void> {
  if (_dataPreloadedFor === userId) return;
  _dataPreloadedFor = userId;

  // --- Shared (all roles) ---

  // Profile row (used by AppShell, profile page, home)
  if (!cacheGet(`profile:${userId}`)) {
    supabase
      .from("profiles")
      .select("id,name,account_type,onboarding_path")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) cacheSet(`profile:${userId}`, data, 10 * 60 * 1000);
      }, () => {});
  }

  // Unread message count — messages has no `read` column; unread state is
  // tracked per-participant on conversation_participants.unread_count
  // (same source messages.tsx uses for its own badge).
  if (!cacheGet(`unread_messages:${userId}`)) {
    supabase
      .from("conversation_participants")
      .select("unread_count")
      .eq("user_id", userId)
      .then(({ data: parts }) => {
        const total = (parts ?? []).reduce((sum, p) => sum + (p.unread_count ?? 0), 0);
        cacheSet(`unread_messages:${userId}`, total, 60 * 1000);
      }, () => {});
  }

  // Unread notifications count
  if (!cacheGet(`unread_notifs:${userId}`)) {
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count }) => {
        cacheSet(`unread_notifs:${userId}`, count ?? 0, 2 * 60 * 1000);
      }, () => {});
  }

  // --- Creator-specific ---
  if (role === "creator") {
    if (!cacheGet(`creator_profile:${userId}`)) {
      supabase
        .from("creator_profiles")
        .select("id,user_id,display_name,bio,niche,categories,platforms,profile_image_url,rate_range,location_city,visibility_score")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) cacheSet(`creator_profile:${userId}`, data, 5 * 60 * 1000);
        }, () => {});
    }

    // Active campaign count (shown on home dashboard)
    if (!cacheGet(`active_opp_count`)) {
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .then(({ count }) => {
          cacheSet(`active_opp_count`, count ?? 0, 2 * 60 * 1000);
        }, () => {});
    }
  }

  // --- Business-specific ---
  if (role === "business") {
    if (!cacheGet(`business_profile:${userId}`)) {
      supabase
        .from("business_profiles")
        .select("id,user_id,name,industry,logo_url")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) cacheSet(`business_profile:${userId}`, data, 5 * 60 * 1000);
        }, () => {});
    }

    // Active campaign count
    if (!cacheGet(`active_campaigns:${userId}`)) {
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active")
        .then(({ count }) => {
          cacheSet(`active_campaigns:${userId}`, count ?? 0, 2 * 60 * 1000);
        }, () => {});
    }
  }
}

// ── Main entry point ───────────────────────────────────────────────────────────

export function runAppPreloader(
  userId: string,
  role: "creator" | "business" | null,
): void {
  // Preload route JS chunks (staggered, non-blocking)
  preloadRouteChunks(role);

  // Prefetch lightweight data slightly later so page load completes first
  setTimeout(() => prefetchData(userId, role), 800);
}

/** Call on logout so the next login gets a fresh preload */
export function resetPreloader(): void {
  _chunksPreloaded = false;
  _dataPreloadedFor = null;
  CACHE.clear();
  _preloadFn = null;
}
