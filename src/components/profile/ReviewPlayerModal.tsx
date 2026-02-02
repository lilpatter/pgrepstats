"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapPreviewImage } from "@/components/profile/MapPreviewImage";
import { getCsrfToken } from "@/lib/csrf-client";

const POSITIVE_REASONS = [
  "Great Comms",
  "Friendly / Positive",
  "Good Teammate",
  "Consistent Player",
  "Clutch Player",
  "Helpful / Mentoring",
] as const;
const NEGATIVE_REASONS = [
  "Toxic / Negative Attitude",
  "Poor Communication",
  "Baiting / Not Trading",
  "AFK / Inactive",
  "Griefing / Trolling",
  "Bottom Fragging / No Impact",
] as const;

type ReviewMatch = {
  id?: string | null;
  dataSource?: string | null;
  dataSourceMatchId?: string | null;
  mapName?: string | null;
  finishedAt?: string | null;
  rankType?: number | null;
  score?: [number, number] | null;
};

type ReviewPlayerModalProps = {
  steamId?: string;
  playerName?: string | null;
  viewerSteamId?: string | null;
  matches?: ReviewMatch[];
  positiveCount?: number | null;
  negativeCount?: number | null;
  hasReviewed?: boolean;
};

function formatRelativeMatchTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "Today";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function formatMapName(mapName?: string | null) {
  if (!mapName) return "Unknown";
  return mapName
    .replace(/^de_/i, "")
    .replace(/^cs_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getMatchLabel(match: ReviewMatch) {
  const rankType = match.rankType ?? null;
  if (rankType === 11) return "PREMIER";
  if (rankType === 12) return "COMPETITIVE";
  if (rankType === 7) return "WINGMAN";
  const source = String(match.dataSource ?? "").toLowerCase();
  if (source === "matchmaking") return "PREMIER";
  if (source === "matchmaking_competitive") return "COMPETITIVE";
  if (source === "matchmaking_wingman") return "WINGMAN";
  if (source === "faceit") return "FACEIT";
  return source ? source.toUpperCase() : "MATCH";
}

export function ReviewPlayerModal({
  steamId,
  playerName,
  viewerSteamId,
  matches = [],
  positiveCount,
  negativeCount,
  hasReviewed = false,
}: ReviewPlayerModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"select" | "form">("select");
  const [reviewType, setReviewType] = useState<"positive" | "negative">("positive");
  const [selectedMatch, setSelectedMatch] = useState<ReviewMatch | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSelfReview = Boolean(viewerSteamId && steamId && viewerSteamId === steamId);
  const canReview =
    Boolean(viewerSteamId) && Boolean(steamId) && !isSelfReview && !hasReviewed;
  const netReviews = (positiveCount ?? 0) - (negativeCount ?? 0);
  const reviewDisplay =
    netReviews > 0 ? `+${netReviews}` : netReviews < 0 ? `${netReviews}` : "0";

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setMessage(null);
    setSelectedMatch(null);
    setSelectedReasons([]);
    setStep("select");
  };

  const openSelect = (type: "positive" | "negative") => {
    if (!canReview) return;
    setReviewType(type);
    setOpen(true);
    setStep("select");
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((item) => item !== reason);
      }
      if (prev.length >= 3) return prev;
      return [...prev, reason];
    });
  };

  const handleSubmit = async () => {
    if (!steamId) {
      setMessage("Missing Steam ID for this profile.");
      return;
    }
    if (!selectedMatch) {
      setMessage("Select a match to review.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({
          targetSteamId: steamId,
          reviewType,
          reasons: selectedReasons,
          matchId: selectedMatch.id ?? selectedMatch.dataSourceMatchId ?? null,
          matchData: selectedMatch,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setMessage(payload?.error ?? "Failed to submit review.");
        return;
      }

      setMessage("Review submitted. Thank you.");
      setSelectedReasons([]);
    } catch {
      setMessage("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const reasonOptions = reviewType === "negative" ? NEGATIVE_REASONS : POSITIVE_REASONS;
  const promptLabel =
    reviewType === "negative" ? "What went wrong?" : "What was good about this player?";
  const matchCards = useMemo(
    () =>
      matches.map((match) => {
        const mapName = match.mapName ? String(match.mapName) : null;
        const mapSlug = mapName ? mapName.toLowerCase() : null;
        const mapImage =
          mapSlug && (mapSlug.startsWith("de_") || mapSlug.startsWith("cs_"))
            ? `/map-previews/${mapSlug}.webp`
            : null;
        return { match, mapImage };
      }),
    [matches]
  );

  return (
    <>
      <div className="rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-[rgba(233,228,255,0.65)]">
          <button
            type="button"
            onClick={() => openSelect("positive")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              canReview
                ? "bg-[#0f2b21] text-[#47f59d]"
                : "bg-[rgba(15,12,30,0.7)] text-[rgba(233,228,255,0.4)]"
            }`}
            disabled={!canReview}
            title={hasReviewed ? "You have already reviewed this player." : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
            +REP
          </button>
          <div className="rounded-full bg-[rgba(233,228,255,0.08)] px-3 py-1 text-sm font-semibold text-white">
            {reviewDisplay}
          </div>
          <button
            type="button"
            onClick={() => openSelect("negative")}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              canReview
                ? "bg-[#2b1418] text-[#ff5a7a]"
                : "bg-[rgba(15,12,30,0.7)] text-[rgba(233,228,255,0.4)]"
            }`}
            disabled={!canReview}
            title={hasReviewed ? "You have already reviewed this player." : undefined}
          >
            <Minus className="h-3.5 w-3.5" />
            -REP
          </button>
        </div>
        <div className="mt-2 text-[rgba(233,228,255,0.5)]">
          {netReviews === 0 ? "Not enough reviews yet" : "Community reviews"}
        </div>
        {!viewerSteamId ? (
          <div className="mt-2 text-[rgba(233,228,255,0.45)]">
            Sign in with Steam to leave a review.
          </div>
        ) : isSelfReview ? (
          <div className="mt-2 text-[rgba(233,228,255,0.45)]">
            You cannot review yourself.
          </div>
        ) : hasReviewed ? (
          <div className="mt-2 text-[rgba(233,228,255,0.45)]">
            You already reviewed this player.
          </div>
        ) : null}
      </div>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,6,20,0.75)] p-4">
              <div className="relative w-full max-w-2xl rounded-3xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,20,0.98)] p-6 shadow-[0_0_40px_rgba(124,77,255,0.2)]">
                <button
                  type="button"
                  onClick={close}
                  className="absolute right-4 top-4 text-[rgba(233,228,255,0.6)] transition hover:text-white"
                  aria-label="Close review dialog"
                >
                  <X className="h-5 w-5" />
                </button>

                {step === "select" ? (
                  <div className="space-y-4">
                    <div className="text-lg font-semibold text-white">Select Match</div>
                    <div className="text-sm text-[rgba(233,228,255,0.6)]">
                      Select a match to review {playerName ?? "this player"}.
                    </div>

                    {matchCards.length === 0 ? (
                      <div className="rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] p-4 text-sm text-[rgba(233,228,255,0.6)]">
                        No matches available yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {matchCards.map(({ match, mapImage }) => {
                          const mapName = match.mapName ? String(match.mapName) : "unknown";
                          return (
                            <button
                              type="button"
                              key={`${match.id ?? match.dataSourceMatchId ?? mapName}`}
                              onClick={() => {
                                setSelectedMatch(match);
                                setStep("form");
                              }}
                              className="relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.7)] p-3 text-left text-sm text-[rgba(233,228,255,0.7)] transition hover:border-[#9b6cff]"
                            >
                              {mapImage ? (
                                <div className="relative h-12 w-16 overflow-hidden rounded-xl">
                                  <MapPreviewImage src={mapImage} alt={mapName} />
                                  <div className="absolute inset-0 bg-[rgba(8,6,16,0.45)]" />
                                </div>
                              ) : (
                                <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-[rgba(233,228,255,0.08)] text-xs text-[rgba(233,228,255,0.5)]">
                                  N/A
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="text-base font-semibold text-white">
                                  {formatMapName(mapName)}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-[rgba(233,228,255,0.55)]">
                                  <span>{formatRelativeMatchTime(match.finishedAt)}</span>
                                  <span className="rounded-full bg-[rgba(233,228,255,0.08)] px-2 py-0.5 text-[10px] uppercase tracking-widest">
                                    {getMatchLabel(match)}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-[rgba(233,228,255,0.4)]" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-white">
                      <button
                        type="button"
                        onClick={() => setStep("select")}
                        className="text-[rgba(233,228,255,0.6)] hover:text-white"
                        aria-label="Back to match selection"
                      >
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </button>
                      Write Review
                    </div>

                    <div>
                      <div className="text-sm text-[rgba(233,228,255,0.6)]">Review Type</div>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewType("positive");
                            setSelectedReasons([]);
                          }}
                          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold ${
                            reviewType === "positive"
                              ? "border-[#47f59d] bg-[#0f2b21] text-[#47f59d]"
                              : "border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] text-[rgba(233,228,255,0.6)]"
                          }`}
                        >
                          +REP
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewType("negative");
                            setSelectedReasons([]);
                          }}
                          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold ${
                            reviewType === "negative"
                              ? "border-[#ff5a7a] bg-[#2b1418] text-[#ff5a7a]"
                              : "border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] text-[rgba(233,228,255,0.6)]"
                          }`}
                        >
                          -REP
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-[rgba(233,228,255,0.6)]">
                        {promptLabel} ({selectedReasons.length}/3)
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {reasonOptions.map((reason) => {
                          const checked = selectedReasons.includes(reason);
                          return (
                            <button
                              type="button"
                              key={reason}
                              onClick={() => toggleReason(reason)}
                              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm ${
                                checked
                                  ? "border-[#47f59d] bg-[rgba(71,245,157,0.12)] text-white"
                                  : "border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] text-[rgba(233,228,255,0.65)]"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                                  checked
                                    ? "border-[#47f59d] text-[#47f59d]"
                                    : "border-[rgba(233,228,255,0.3)] text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                              {reason}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {message ? (
                      <div className="rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] p-3 text-sm text-[rgba(233,228,255,0.7)]">
                        {message}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <Button variant="ghost" onClick={close} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="min-w-[140px]"
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
