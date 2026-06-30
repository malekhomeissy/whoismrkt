// ─────────────────────────────────────────────────────────────────────────────
// abuse-report — submit a content/user abuse report
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  corsHeaders, isRateLimited, requireAuth, jsonOk, jsonErr, AuthError,
  sanitizeString,
} from "../_shared/security.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  if (isRateLimited(`abuse-report:${ip}`, { maxRequests: 5, windowMs: 60_000 })) {
    return jsonErr("Too many reports submitted. Please wait before filing another.", req, 429);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const user = await requireAuth(req, supabase);

    const body = await req.json().catch(() => ({}));
    const { content_type, content_id, reported_user_id, reason, description } = body as {
      content_type?: string;
      content_id?: string;
      reported_user_id?: string;
      reason?: string;
      description?: string;
    };

    const VALID_CONTENT_TYPES = ["user", "campaign", "message", "profile", "contract", "other"];
    const VALID_REASONS = [
      "spam", "harassment", "inappropriate_content", "fake_profile",
      "scam", "copyright", "underage", "other",
    ];

    if (!content_type || !VALID_CONTENT_TYPES.includes(content_type)) {
      return jsonErr("Invalid content_type.", req, 400);
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return jsonErr("Invalid reason.", req, 400);
    }

    const { error } = await supabase.from("abuse_reports").insert({
      reporter_id:      user.id,
      reported_user_id: reported_user_id ?? null,
      content_type,
      content_id:       content_id ?? null,
      reason,
      description:      sanitizeString(description ?? "", 1000),
    });

    if (error) throw error;

    return jsonOk({ success: true, message: "Report submitted. Our team will review it within 48 hours." }, req);

  } catch (err) {
    if (err instanceof AuthError) return jsonErr("Unauthorized", req, 401);
    console.error("abuse-report error:", err);
    return jsonErr("Report submission failed. Please email abuse@usemrkt.app.", req, 500);
  }
});
