"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type IndexedProfile = {
  steam_id: string;
  persona_name?: string | null;
  last_seen_at?: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export function IndexedProfilesPager({
  profiles,
  pageSize = 10,
}: {
  profiles: IndexedProfile[];
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(profiles.length / pageSize));

  const pageItems = useMemo(() => {
    const start = page * pageSize;
    return profiles.slice(start, start + pageSize);
  }, [page, pageSize, profiles]);

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
  }, [profiles.length, pageSize]);

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <CardTitle className="mb-1">Indexed Profiles</CardTitle>
          <CardDescription>
            Most recently seen profiles (page {page + 1}/{totalPages}).
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-xs text-[rgba(233,228,255,0.6)]">
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

      <div className="space-y-2 text-xs text-[rgba(233,228,255,0.75)]">
        {pageItems.length ? (
          pageItems.map((profile) => (
            <div
              key={profile.steam_id}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <Link
                  href={`/profile/${profile.steam_id}`}
                  className="text-white hover:text-[#9b6cff]"
                >
                  {profile.persona_name ?? "Unknown"}
                </Link>
                <span className="font-mono text-[rgba(233,228,255,0.6)]">
                  {profile.steam_id}
                </span>
              </div>
              <span>{formatTime(profile.last_seen_at)}</span>
            </div>
          ))
        ) : (
          <div className="text-[rgba(233,228,255,0.5)]">
            No indexed profiles.
          </div>
        )}
      </div>
    </Card>
  );
}

