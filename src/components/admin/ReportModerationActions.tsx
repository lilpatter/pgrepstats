"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ReportModerationActionsProps = {
  reportId: number;
  status: string;
};

export function ReportModerationActions({
  reportId,
  status,
}: ReportModerationActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateStatus = (nextStatus: "approved" | "declined") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/reports/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: reportId, status: nextStatus }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setError(payload?.error ?? "Failed to update report.");
          return;
        }
        router.refresh();
      } catch {
        setError("Failed to update report.");
      }
    });
  };

  if (status !== "pending") {
    return (
      <span className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.7)]">
        {status}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => updateStatus("declined")}
          disabled={isPending}
        >
          Decline
        </Button>
        <Button
          variant="primary"
          onClick={() => updateStatus("approved")}
          disabled={isPending}
        >
          Approve
        </Button>
      </div>
      {error ? (
        <div className="text-xs text-[#ff5a7a]">{error}</div>
      ) : null}
    </div>
  );
}

