// /payments — Payments & Payouts (coming in a future release)

import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { C } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Payments — MRKT" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <div className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-3xl mx-auto w-full">
      <div className="mb-6 flex items-center gap-2">
        <DollarSign className="h-5 w-5" style={{ color: C.chrome }} />
        <h1 className="text-[22px] font-bold leading-tight" style={{ color: C.text }}>Payments</h1>
      </div>

      <div
        className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "oklch(0.70 0.08 68 / 10%)", border: "1px solid oklch(0.70 0.08 68 / 22%)" }}
        >
          <DollarSign className="h-6 w-6" style={{ color: "oklch(0.70 0.08 68)" }} />
        </div>

        <h2 className="text-[18px] font-bold mb-2" style={{ color: C.text }}>
          Payments & Payouts
        </h2>

        <p className="text-[13px] max-w-[340px] leading-relaxed" style={{ color: C.muted }}>
          Integrated payment processing and creator payouts are launching soon. Compensation is currently coordinated directly between brands and creators.
        </p>

        <p className="text-[12px] mt-5" style={{ color: C.faint }}>
          Questions?{" "}
          <a href="mailto:hello@usemrkt.app" style={{ color: C.chrome }}>
            hello@usemrkt.app
          </a>
        </p>
      </div>
    </div>
  );
}
