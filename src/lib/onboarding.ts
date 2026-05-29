// Shared types and helpers for the onboarding intent flow.
// Intent is stored in localStorage (survives Google OAuth cross-origin redirect).
// It is committed to the Supabase profiles table immediately after authentication.

export type IntentPath = "creator" | "business_creator" | "business_marketing";
export type BusinessStage = "startup" | "growing" | "established";

export interface OnboardingIntent {
  path: IntentPath;
  business_stage?: BusinessStage;
}

const KEY = "mrkt_onboarding";

export function getStoredIntent(): OnboardingIntent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingIntent) : null;
  } catch {
    return null;
  }
}

export function storeIntent(intent: OnboardingIntent): void {
  localStorage.setItem(KEY, JSON.stringify(intent));
}

export function clearIntent(): void {
  localStorage.removeItem(KEY);
}

/** Maps our intent path to the existing account_type enum in Supabase. */
export function intentToAccountType(path: IntentPath): "creator" | "brand" | "business" {
  if (path === "creator") return "creator";
  if (path === "business_creator") return "brand";
  return "business";
}
