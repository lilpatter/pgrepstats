"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDuration(fromIso: string) {
  const start = new Date(fromIso).getTime();
  if (Number.isNaN(start)) return "N/A";
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function AutoFlagBadge({
  flaggedAt,
  reason,
}: {
  flaggedAt: string;
  reason: string;
}) {
  const [open, setOpen] = useState(false);
  const duration = useMemo(() => formatDuration(flaggedAt), [flaggedAt]);

  return (
    <>
      <Button
        variant="ghost"
        className="gap-2 text-[#ff5a7a]"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-4 w-4" />
        Auto-Flagged
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,6,20,0.75)] p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-[rgba(255,90,122,0.5)] bg-[rgba(15,10,20,0.98)] p-6 shadow-[0_0_40px_rgba(255,90,122,0.25)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-[rgba(233,228,255,0.6)] transition hover:text-white"
              aria-label="Close auto-flag dialog"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <AlertTriangle className="h-5 w-5 text-[#ff5a7a]" />
              Auto-Flagged
            </div>
            <p className="mt-2 text-sm text-[rgba(233,228,255,0.7)]">
              This player was automatically flagged due to low trust rating.
            </p>
            <div className="mt-4 space-y-2 text-sm text-[rgba(233,228,255,0.7)]">
              <div>
                <span className="text-[rgba(233,228,255,0.5)]">Flagged at:</span>{" "}
                {new Date(flaggedAt).toLocaleString()}
              </div>
              <div>
                <span className="text-[rgba(233,228,255,0.5)]">Duration:</span>{" "}
                {duration}
              </div>
              <div>
                <span className="text-[rgba(233,228,255,0.5)]">Reason:</span>{" "}
                {reason}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

