"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type AutoFlagRow = {
  steam_id: string;
  persona_name?: string | null;
  avatar_url?: string | null;
  trust_rating?: number | null;
  auto_flagged_at?: string | null;
  premier_rating?: number | null;
  faceit_level?: number | null;
  faceit_elo?: number | null;
};

function formatRelative(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  const minutes = Math.floor(diffMs / 60_000);
  return `${Math.max(1, minutes)} min ago`;
}

function getPremierBadge(rating?: number | null) {
  if (rating === undefined || rating === null) return "/premier/1000.png";
  if (rating >= 30000) return "/premier/30000.png";
  if (rating >= 25000) return "/premier/25000.png";
  if (rating >= 20000) return "/premier/20000.png";
  if (rating >= 15000) return "/premier/15000.png";
  if (rating >= 10000) return "/premier/10000.png";
  if (rating >= 5000) return "/premier/5000.png";
  return "/premier/1000.png";
}

export function AiFlagsTable({
  profiles,
  pageSize = 10,
}: {
  profiles: AutoFlagRow[];
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const total = profiles.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageItems = useMemo(() => {
    const start = page * pageSize;
    return profiles.slice(start, start + pageSize);
  }, [page, pageSize, profiles]);

  const startIndex = total === 0 ? 0 : page * pageSize + 1;
  const endIndex = Math.min(total, (page + 1) * pageSize);

  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-[rgba(233,228,255,0.75)]">
          <thead className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
            <tr>
              <th className="py-2 pr-4">Player</th>
              <th className="py-2 pr-4">Autoflagged</th>
              <th className="py-2 pr-4">Premier</th>
              <th className="py-2 pr-4">FACEIT</th>
              <th className="py-2 pr-4">Trust Rating</th>
              <th className="py-2">Restrictions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length ? (
              pageItems.map((profile) => (
                <tr
                  key={profile.steam_id}
                  className="border-t border-[rgba(155,108,255,0.15)]"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/profile/${profile.steam_id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,26,0.9)]">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.persona_name ?? "Player avatar"}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[rgba(233,228,255,0.6)]">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white">
                          {profile.persona_name ?? "Unknown"}
                        </span>
                        <span className="font-mono text-[rgba(233,228,255,0.5)]">
                          {profile.steam_id}
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    {formatRelative(profile.auto_flagged_at)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="relative h-7 w-16">
                      <img
                        src={getPremierBadge(profile.premier_rating)}
                        alt="Premier Rank"
                        className="h-7 w-auto object-contain"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center italic text-white">
                        <span className="text-xs font-semibold">
                          {profile.premier_rating === null ||
                          profile.premier_rating === undefined
                            ? "--"
                            : profile.premier_rating.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {profile.faceit_level ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={`/faceit-levels/lvl${profile.faceit_level}.svg`}
                          alt={`FACEIT level ${profile.faceit_level}`}
                          className="h-5 w-5"
                        />
                        <span className="text-[rgba(233,228,255,0.8)]">
                          {profile.faceit_elo ?? "N/A"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[rgba(233,228,255,0.5)]">--</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[#ff5a7a]">
                    {profile.trust_rating !== null &&
                    profile.trust_rating !== undefined
                      ? `${profile.trust_rating.toFixed(1)}%`
                      : "N/A"}
                  </td>
                  <td className="py-3">
                    <ShieldAlert className="h-4 w-4 text-[#ff5a7a]" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-[rgba(233,228,255,0.6)]"
                >
                  No auto-flagged players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[rgba(233,228,255,0.6)]">
        <div>
          Showing {startIndex} to {endIndex} of {total}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage(0)}
            className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1"
            disabled={page === 0}
          >
            «
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1"
            disabled={page === 0}
          >
            ‹
          </button>
          <span className="text-[rgba(233,228,255,0.8)]">
            Page {page + 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1"
            disabled={page >= totalPages - 1}
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages - 1)}
            className="rounded-full border border-[rgba(155,108,255,0.35)] px-2 py-1"
            disabled={page >= totalPages - 1}
          >
            »
          </button>
        </div>
      </div>
    </>
  );
}

