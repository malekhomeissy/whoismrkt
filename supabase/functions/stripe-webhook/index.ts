// ─────────────────────────────────────────────────────────────────────────────
// stripe-webhook — handles Stripe events, updates campaign_payments
//
// Register in Stripe Dashboard: endpoint URL = https://<project>.supabase.co/functions/v1/stripe-webhook
// Events to listen for: checkout.session.completed, checkout.session.expired
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const stripeKey         = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret     = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl       = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 503, headers: CORS });
  }

  const rawBody = await req.text();

  // Signature verification is mandatory — reject requests without a configured secret.
  // Without this, any caller can POST a fake checkout.session.completed and mark
  // payments as paid without going through Stripe.
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured — rejecting all webhook events");
    return new Response(JSON.stringify({ error: "Webhook secret not configured on server" }), { status: 503, headers: CORS });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400, headers: CORS });
  }

  // Parse timestamp and signatures from header
  const elements = sig.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.trim().split("=");
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = elements["t"];
  const v1Sig     = elements["v1"];

  if (!timestamp || !v1Sig) {
    return new Response(JSON.stringify({ error: "Invalid signature header" }), { status: 400, headers: CORS });
  }

  // Verify HMAC
  const encoder  = new TextEncoder();
  const payload  = `${timestamp}.${rawBody}`;
  const key      = await crypto.subtle.importKey(
    "raw", encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig_bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed  = Array.from(new Uint8Array(sig_bytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed !== v1Sig) {
    return new Response(JSON.stringify({ error: "Signature mismatch" }), { status: 400, headers: CORS });
  }

  // Reject events older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return new Response(JSON.stringify({ error: "Timestamp too old" }), { status: 400, headers: CORS });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (event.type === "checkout.session.completed") {
    const session    = event.data.object as Record<string, unknown>;
    const sessionId  = session["id"] as string;
    const metadata   = (session["metadata"] as Record<string, string>) ?? {};
    const contractId = metadata["contract_id"];

    const { error } = await supabase
      .from("campaign_payments")
      .update({
        status:    "paid",
        paid_at:   new Date().toISOString(),
      })
      .eq("stripe_session_id", sessionId);

    if (error) {
      console.error("Failed to update payment:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
    }

    // Update the contract to mark payment received
    if (contractId) {
      await supabase
        .from("contracts")
        .update({ payment_status: "paid" })
        .eq("id", contractId);
    }

    console.log(`Payment confirmed: session ${sessionId}`);
  }

  if (event.type === "checkout.session.expired") {
    const session   = event.data.object as Record<string, unknown>;
    const sessionId = session["id"] as string;

    await supabase
      .from("campaign_payments")
      .update({ status: "failed" })
      .eq("stripe_session_id", sessionId)
      .eq("status", "pending");
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
