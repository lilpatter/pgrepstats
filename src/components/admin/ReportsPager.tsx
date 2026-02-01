"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReportModerationActions } from "@/components/admin/ReportModerationActions";

type ReportItem = {
  id: number;
  target_steam_id: string;
  target_persona_name?: string | null;
  reporter_steam_id: string;
  reporter_persona_name?: string | null;
  demo_url?: string | null;
  cheat_type?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  status?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  match_url?: string | null;
  match_preview?: Record<string, unknown> | null;
};

function formatTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function MatchPreview({
  report,
}: {
  report: Pick<ReportItem, "match_url" | "match_preview" | "target_persona_name">;
}) {
  const preview =
    report.match_preview && typeof report.match_preview === "object"
      ? report.match_preview
      : null;
  if (!preview) return null;

  const previewMap = preview.mapName ? String(preview.mapName) : "Unknown map";
  const previewSource = preview.dataSource
    ? String(preview.dataSource).toUpperCase()
    : "MATCH";
  const previewScore = Array.isArray(preview.score)
    ? `${preview.score?.[0]}-${preview.score?.[1]}`
    : "N/A";
  const previewOutcome = preview.outcome ? String(preview.outcome) : "Result";
  const previewPlayer = preview.playerName
    ? String(preview.playerName)
    : report.target_persona_name ?? "Player";
  const previewStats =
    preview.kills !== undefined &&
    preview.deaths !== undefined &&
    preview.assists !== undefined
      ? `${preview.kills}-${preview.deaths}-${preview.assists}`
      : "N/A";
  const previewMapSlug = previewMap.toLowerCase();
  const previewMapImage =
    previewMapSlug.startsWith("de_") || previewMapSlug.startsWith("cs_")
      ? `/map-previews/${previewMapSlug}.webp`
      : null;

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,8,20,0.75)] px-4 py-3 text-xs text-[rgba(233,228,255,0.7)]">
      {previewMapImage ? (
        <>
          <img
            src={previewMapImage}
            alt={previewMap}
            className="absolute inset-0 h-full w-full object-cover opacity-70 blur-[1px]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[rgba(8,6,16,0.7)]" />
        </>
      ) : null}
      <div className="relative flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[rgba(155,108,255,0.4)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#9b6cff]">
              {previewSource}
            </span>
            <span className="text-sm font-semibold text-white">{previewMap}</span>
          </div>
          <div className="text-[rgba(233,228,255,0.6)]">
            {previewPlayer} • K/D/A {previewStats}
          </div>
        </div>
        <div className="text-right text-sm text-white">
          {previewScore}
          <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
            {previewOutcome}
          </div>
        </div>
      </div>
      {report.match_url ? (
        <Link
          href={report.match_url}
          target="_blank"
          rel="noreferrer"
          className="relative mt-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#9b6cff] hover:text-white"
        >
          View match
        </Link>
      ) : null}
    </div>
  );
}

export function ReportsPager({
  reports,
  pageSize = 5,
  showActions = true,
  emptyMessage = "No reports yet.",
}: {
  reports: ReportItem[];
  pageSize?: number;
  showActions?: boolean;
  emptyMessage?: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));

  const pageItems = useMemo(() => {
    const start = page * pageSize;
    return reports.slice(start, start + pageSize);
  }, [page, pageSize, reports]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setPage((prev) => Math.max(0, prev - 1));
      }
      if (event.key === "ArrowRight") {
        setPage((prev) => Math.min(totalPages - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [totalPages]);

  useEffect(() => {
    setPage(0);
  }, [reports.length, pageSize]);

  return (
    <div className="mt-4 space-y-4 text-xs text-[rgba(233,228,255,0.75)]">
      {pageItems.length ? (
        pageItems.map((report) => (
          <div
            key={report.id}
            className="rounded-2xl border border-[rgba(155,108,255,0.2)] bg-[rgba(20,16,40,0.5)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[rgba(233,228,255,0.6)]">
                  Case #{report.id}
                </div>
                <div className="text-white">
                  {report.target_persona_name ?? "Unknown"} (
                  <Link
                    href={`/profile/${report.target_steam_id}`}
                    className="font-mono text-[rgba(233,228,255,0.7)] hover:text-[#9b6cff]"
                  >
                    {report.target_steam_id}
                  </Link>
                  )
                </div>
                <div className="text-[rgba(233,228,255,0.6)]">
                  Reported by {report.reporter_persona_name ?? "Unknown"} (
                  <span className="font-mono">{report.reporter_steam_id}</span>)
                </div>
                <div className="text-[rgba(233,228,255,0.6)]">
                  Cheat type: {report.cheat_type ?? "N/A"}
                </div>
                <div className="text-[rgba(233,228,255,0.6)]">
                  Incident date: {formatTime(report.occurred_at)}
                </div>
                <div className="text-[rgba(233,228,255,0.6)]">
                  Created: {formatTime(report.created_at)}
                </div>
                {report.resolved_at ? (
                  <div className="text-[rgba(233,228,255,0.6)]">
                    Approved at: {formatTime(report.resolved_at)}
                  </div>
                ) : null}
                {report.resolved_by ? (
                  <div className="text-[rgba(233,228,255,0.6)]">
                    Approved by:{" "}
                    <span className="font-mono">{report.resolved_by}</span>
                  </div>
                ) : null}
                {report.demo_url ? (
                  <a
                    href={report.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#9b6cff] hover:text-white"
                  >
                    View demo
                  </a>
                ) : null}
                <MatchPreview report={report} />
              </div>
              {showActions ? (
                <ReportModerationActions
                  reportId={report.id}
                  status={(report.status as "pending" | "approved" | "declined") ?? "pending"}
                />
              ) : null}
            </div>
          </div>
        ))
      ) : (
        <div className="text-[rgba(233,228,255,0.5)]">{emptyMessage}</div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-[rgba(233,228,255,0.6)]">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1"
              disabled={page === 0}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1"
              disabled={page >= totalPages - 1}
            >
              →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
