"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getCsrfToken } from "@/lib/csrf-client";
import { AlertTriangle, ExternalLink, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapPreviewImage } from "@/components/profile/MapPreviewImage";

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
  matchUrl?: string | null;
  matchPreview?: {
    mapName?: string | null;
    dataSource?: string | null;
    score?: [number, number] | null;
    outcome?: string | null;
    finishedAt?: string | null;
    playerName?: string | null;
    kills?: number | null;
    deaths?: number | null;
    assists?: number | null;
  } | null;
};

export function ReportOverwatchModal({
  steamId,
  playerName,
  disabled = false,
  disabledReason,
  viewerSteamId,
  matchUrl,
  matchPreview,
}: ReportOverwatchModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

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
        const csrfToken = getCsrfToken();
      const res = await fetch("/api/reports", {
        method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
          },
        body: JSON.stringify({
          targetSteamId: steamId,
          targetName: playerName ?? null,
          occurredAt,
          demoUrl,
          cheatType,
          matchUrl: matchUrl ?? null,
          matchPreview: matchPreview ?? null,
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
  const mapName = matchPreview?.mapName ? String(matchPreview.mapName) : null;
  const mapSlug = mapName ? mapName.toLowerCase() : null;
  const mapImage =
    mapSlug && (mapSlug.startsWith("de_") || mapSlug.startsWith("cs_"))
      ? `/map-previews/${mapSlug}.webp`
      : null;
  const matchLabel = matchPreview?.dataSource
    ? String(matchPreview.dataSource).toUpperCase()
    : "MATCH";
  const scoreLabel = Array.isArray(matchPreview?.score)
    ? `${matchPreview?.score?.[0]}-${matchPreview?.score?.[1]}`
    : "N/A";
  const statsLabel =
    matchPreview?.kills !== null &&
    matchPreview?.kills !== undefined &&
    matchPreview?.deaths !== null &&
    matchPreview?.deaths !== undefined &&
    matchPreview?.assists !== null &&
    matchPreview?.assists !== undefined
      ? `${matchPreview.kills}-${matchPreview.deaths}-${matchPreview.assists}`
      : "N/A";

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

      {open && mounted
        ? createPortal(
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
                  {matchPreview ? (
                    <div className="relative overflow-hidden rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,8,20,0.75)] px-4 py-3 text-xs text-[rgba(233,228,255,0.7)]">
                      {mapImage ? (
                        <>
                          <MapPreviewImage src={mapImage} alt={mapName ?? "Map"} />
                          <div className="absolute inset-0 bg-[rgba(8,6,16,0.7)]" />
                        </>
                      ) : null}
                      <div className="relative flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-[rgba(155,108,255,0.4)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#9b6cff]">
                              {matchLabel}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {mapName ?? "Unknown map"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[rgba(233,228,255,0.6)]">
                            <Swords className="h-3.5 w-3.5" />
                            <span>
                              {matchPreview?.playerName ?? playerName ?? "Player"}
                            </span>
                            <span>•</span>
                            <span>K/D/A {statsLabel}</span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-white">
                          {scoreLabel}
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                            {matchPreview?.outcome ?? "Result"}
                          </div>
                        </div>
                      </div>
                      {matchUrl ? (
                        <a
                          href={matchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#9b6cff] hover:text-white"
                        >
                          View match
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
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
                  {matchUrl ? (
                    <label className="block text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                      Match URL
                      <input
                        type="url"
                        value={matchUrl}
                        readOnly
                        className="mt-2 w-full rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(8,6,20,0.7)] px-4 py-2 text-sm text-white"
                      />
                    </label>
                  ) : null}

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
            </div>,
            document.body
          )
        : null}
    </>
  );
}

