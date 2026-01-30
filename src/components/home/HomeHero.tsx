"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { SearchBar } from "@/components/search/SearchBar";

type HomeStatsResponse = {
  playersIndexed: number | null;
  activeUsers: number | null;
  reportsSubmitted: number | null;
  aiAutoFlagged: number | null;
};

const fallbackStats: HomeStatsResponse = {
  playersIndexed: null,
  activeUsers: null,
  reportsSubmitted: null,
  aiAutoFlagged: null,
};

function formatStat(value: number | null) {
  if (value === null || value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function HomeHero() {
  // TODO: Replace /api/home-stats with Supabase "home_stats" once configured.
  // Table: home_stats (players_indexed, active_users, reports_submitted, ai_auto_flagged).
  // Env: SUPABASE_URL + SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY).
  const [stats, setStats] = useState<HomeStatsResponse>(fallbackStats);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home-stats")
      .then((res) => res.json())
      .then((data: HomeStatsResponse) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(fallbackStats);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Players Indexed", value: formatStat(stats.playersIndexed) },
      { label: "Active Users", value: formatStat(stats.activeUsers) },
      { label: "Reports Submitted", value: formatStat(stats.reportsSubmitted) },
      { label: "AI Auto-Flagged", value: formatStat(stats.aiAutoFlagged) },
    ],
    [stats]
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 text-center">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.4em] text-[rgba(155,108,255,0.7)]">
          PGREP Intelligence
        </p>
        <h1 className="font-display text-4xl font-semibold text-white md:text-6xl">
          CS2 Player Reputation
        </h1>
        <p className="mx-auto max-w-2xl text-base text-[rgba(233,228,255,0.7)] md:text-lg">
          Centralize Steam, FACEIT, and Leetify data into a single intelligence
          view. Identify trends, verify ranks, and make better queue decisions.
        </p>
      </div>

      <Card className="w-full max-w-3xl p-3">
        <SearchBar showButton />
      </Card>

      {/* TODO: WIP — replace with live system status + indexing progress. */}
      <div className="flex items-center gap-2 rounded-full border border-[rgba(155,108,255,0.3)] bg-[rgba(20,16,40,0.6)] px-4 py-1 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.6)]">
        Work in progress
      </div>

      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -4 }}
            className="glass-card rounded-3xl p-5 text-left"
          >
            <div className="text-2xl font-semibold text-white">
              {stat.value}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.6)]">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

