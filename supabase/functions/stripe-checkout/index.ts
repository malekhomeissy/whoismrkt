// ─────────────────────────────────────────────────────────────────────────────
// stripe-checkout — creates a Stripe Checkout session for a campaign payment
//
// POST body: { contract_id: string }
// Returns:   { checkout_url: string, payment_id: string }
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/security.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    // Payment features are described as "disabled" in the Terms of Service
    // (§7) pending business registration and payment rail setup. Before this
    // fix, that claim was true only because no frontend code called this
    // function — the endpoint itself was fully live and would process a real
    // charge for anyone who invoked it directly. This flag makes the "not
    // enabled yet" claim actually true server-side. Flip
    // PAYMENTS_ENABLED=true (Supabase project secret) when payments formally
    // launch — no code change needed at that point.
    if (Deno.env.get("PAYMENTS_ENABLED") !== "true") {
      return new Response(JSON.stringify({ error: "Payments are not yet enabled on MRKT." }), {
        status: 503,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe is not configured. Set STRIPE_SECRET_KEY." }), {
        status: 503,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders(req) });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders(req) });

    const { contract_id } = await req.json();
    if (!contract_id) return new Response(JSON.stringify({ error: "Missing contract_id" }), { status: 400, headers: corsHeaders(req) });

    // Load contract
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("id, title, campaign_id, campaign_title, amount_cents, currency, creator_id, business_id")
      .eq("id", contract_id)
      .eq("status", "accepted")
      .single();

    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found or not accepted" }), { status: 404, headers: corsHeaders(req) });
    }
    if (contract.business_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the business can initiate payment" }), { status: 403, headers: corsHeaders(req) });
    }
    if (!contract.amount_cents || contract.amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "Contract has no payment amount" }), { status: 400, headers: corsHeaders(req) });
    }

    // Check for existing payment
    const { data: existing } = await supabase
      .from("campaign_payments")
      .select("id, stripe_session_id, payment_url, status")
      .eq("contract_id", contract_id)
      .in("status", ["pending", "paid"])
      .maybeSingle();

    if (existing?.payment_url) {
      return new Response(JSON.stringify({ checkout_url: existing.payment_url, payment_id: existing.id }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // MRKT platform fee = 10%
    const platformFeeCents = Math.round(contract.amount_cents * 0.10);

    const siteUrl = Deno.env.get("SITE_URL") || "https://usemrkt.app";

    // Create Stripe Checkout session
    const stripeResp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode":                            "payment",
        "line_items[0][price_data][currency]":            contract.currency ?? "usd",
        "line_items[0][price_data][unit_amount]":         String(contract.amount_cents),
        "line_items[0][price_data][product_data][name]":  `MRKT — ${contract.campaign_title}`,
        "line_items[0][price_data][product_data][description]": contract.title ?? "Campaign payment",
        "line_items[0][quantity]":         "1",
        "success_url":                     `${siteUrl}/payments?session={CHECKOUT_SESSION_ID}&status=success`,
        "cancel_url":                      `${siteUrl}/contracts?status=cancelled`,
        "metadata[contract_id]":           contract_id,
        "metadata[business_id]":           user.id,
        "metadata[creator_id]":            contract.creator_id,
        "metadata[campaign_id]":           contract.campaign_id,
        "metadata[platform_fee_cents]":    String(platformFeeCents),
      }),
    });

    if (!stripeResp.ok) {
      const err = await stripeResp.json();
      throw new Error(err.error?.message ?? "Stripe error");
    }

    const session = await stripeResp.json();

    // Record payment in DB
    const { data: payment, error: pErr } = await supabase
      .from("campaign_payments")
      .insert({
        contract_id:        contract_id,
        campaign_id:        contract.campaign_id,
        creator_id:         contract.creator_id,
        business_id:        user.id,
        gross_amount_cents: contract.amount_cents,
        platform_fee_cents: platformFeeCents,
        currency:           contract.currency ?? "usd",
        status:             "pending",
        stripe_session_id:  session.id,
        payment_url:        session.url,
        initiated_at:       new Date().toISOString(),
      })
      .select("id")
      .single();

    if (pErr) throw pErr;

    return new Response(
      JSON.stringify({ checkout_url: session.url, payment_id: payment.id }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
