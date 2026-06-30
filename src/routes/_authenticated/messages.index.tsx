import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages/")({
  component: MessagesEmptyState,
});

function MessagesEmptyState() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center gap-4 text-center px-8"
      style={{ background: "#000" }}
    >
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center"
        style={{ background: "oklch(0.10 0 0)", border: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <MessageSquare className="h-6 w-6" style={{ color: "oklch(1 0 0 / 22%)" }} />
      </div>
      <div>
        <p className="font-medium text-[14px]" style={{ color: "oklch(1 0 0 / 68%)" }}>
          Your messages
        </p>
        <p className="text-[12px] mt-1.5 max-w-[240px]" style={{ color: "oklch(1 0 0 / 32%)" }}>
          Select a conversation from the list, or start one from a creator profile or campaign.
        </p>
      </div>
    </div>
  );
}
