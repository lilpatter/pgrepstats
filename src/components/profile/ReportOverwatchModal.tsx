"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHEAT_TYPES = [
  "Aim",
  "Wallhack",
  "Triggerbot",
  "Rage hacking",
  "Spinbot",
  "Macro",
  "Other",
] as const;

type ReportOverwatchModalProps = {
  steamId?: string;
  playerName?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  viewerSteamId?: string | null;
};

export function ReportOverwatchModal({
  steamId,
  playerName,
  disabled = false,
  disabledReason,
  viewerSteamId,
}: ReportOverwatchModalProps) {
  const [open, setOpen] = useState(false);
  const [occurredAt, setOccurredAt] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [cheatType, setCheatType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!steamId) {
      setMessage("Missing Steam ID for this profile.");
      return;
    }
    if (!occurredAt || !demoUrl || !cheatType) {
      setMessage("Please fill in date, demo URL, and cheat type.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSteamId: steamId,
          targetName: playerName ?? null,
          occurredAt,
          demoUrl,
          cheatType,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setMessage(payload?.error ?? "Failed to submit report.");
        return;
      }

      setMessage("Report submitted. Thank you.");
      setOccurredAt("");
      setDemoUrl("");
      setCheatType("");
    } catch {
      setMessage("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const isSelfReport = Boolean(viewerSteamId && steamId && viewerSteamId === steamId);
  const finalDisabled = disabled || isSelfReport;
  const finalReason =
    disabledReason ?? (isSelfReport ? "You cannot report yourself." : undefined);

  return (
    <>
      <Button
        variant="ghost"
        className="gap-2"
        onClick={() => (finalDisabled ? null : setOpen(true))}
        disabled={finalDisabled}
        title={finalDisabled ? finalReason : undefined}
      >
        Report for Overwatch
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,6,20,0.75)] p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-[rgba(255,140,64,0.5)] bg-[rgba(15,10,20,0.98)] p-6 shadow-[0_0_40px_rgba(255,140,64,0.2)]">
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 text-[rgba(233,228,255,0.6)] transition hover:text-white"
              aria-label="Close report dialog"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <AlertTriangle className="h-5 w-5 text-[#ff8c40]" />
              Report {playerName ?? "Player"} for Cheating
            </div>
            <p className="mt-2 text-sm text-[rgba(233,228,255,0.65)]">
              Provide details so the report can be verified and reviewed.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                Date of incident
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(8,6,20,0.7)] px-4 py-2 text-sm text-white"
                />
              </label>

              <label className="block text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                Demo URL
                <input
                  type="url"
                  placeholder="https://..."
                  value={demoUrl}
                  onChange={(event) => setDemoUrl(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(8,6,20,0.7)] px-4 py-2 text-sm text-white"
                />
              </label>

              <label className="block text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                Cheat type
                <select
                  value={cheatType}
                  onChange={(event) => setCheatType(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(8,6,20,0.7)] px-4 py-2 text-sm text-white"
                >
                  <option value="">Select a type</option>
                  {CHEAT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              {message ? (
                <div className="rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,8,24,0.85)] px-4 py-2 text-xs text-[rgba(233,228,255,0.75)]">
                  {message}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={close} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={submitting || finalDisabled}
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

