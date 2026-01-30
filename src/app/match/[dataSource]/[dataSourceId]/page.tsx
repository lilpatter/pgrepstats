import Link from "next/link";
import { getEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase";
import { ReportOverwatchModal } from "@/components/profile/ReportOverwatchModal";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type MatchStat = {
  steam64_id?: string;
  name?: string;
  initial_team_number?: number;
  total_kills?: number;
  total_deaths?: number;
  total_assists?: number;
  kd_ratio?: number;
  dpr?: number;
  total_damage?: number;
  rounds_count?: number;
  total_hs_kills?: number;
  rounds_survived_percentage?: number;
  mvps?: number;
  leetify_rating?: number;
};

type TeamScore = {
  team_number: number;
  score: number;
};

type MatchDetails = {
  id?: string;
  map_name?: string;
  finished_at?: string;
  data_source?: string;
  data_source_match_id?: string;
  team_scores?: TeamScore[];
  stats?: MatchStat[];
};

function formatPercent(value?: number | null, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatNumber(value?: number | null, digits = 2) {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
}

function matchTypeLabel(source?: string) {
  if (!source) return "Unknown";
  if (source === "matchmaking") return "Premier";
  if (source === "matchmaking_competitive") return "Competitive";
  if (source === "matchmaking_wingman") return "Wingman";
  if (source === "faceit") return "FACEIT";
  return source.toUpperCase();
}

function toAdr(stat: MatchStat) {
  if (stat.dpr !== undefined && stat.dpr !== null && !Number.isNaN(stat.dpr)) {
    return stat.dpr;
  }
  if (stat.total_damage && stat.rounds_count) {
    return stat.total_damage / stat.rounds_count;
  }
  return null;
}

function toHsPercent(stat: MatchStat) {
  if (!stat.total_kills) return null;
  if (stat.total_hs_kills === undefined || stat.total_hs_kills === null) return null;
  return stat.total_hs_kills / stat.total_kills;
}

function toKast(stat: MatchStat) {
  if (
    stat.rounds_survived_percentage === undefined ||
    stat.rounds_survived_percentage === null
  ) {
    return null;
  }
  return stat.rounds_survived_percentage;
}

export default async function MatchDetailsPage({
  params,
}: {
  params: Promise<{ dataSource: string; dataSourceId: string }>;
}) {
  const { dataSource, dataSourceId } = await params;
  const apiKey = process.env.LEETIFY_API_KEY;
  const rawBaseUrl = getEnv(
    "LEETIFY_BASE_URL",
    "https://api-public.cs-prod.leetify.com"
  );
  const baseUrl = rawBaseUrl.includes("api.leetify.com")
    ? "https://api-public.cs-prod.leetify.com"
    : rawBaseUrl;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers._leetify_key = apiKey;
  }

  const matchUrl =
    dataSource === "leetify"
      ? `${baseUrl}/v2/matches/${dataSourceId}`
      : `${baseUrl}/v2/matches/${dataSource}/${dataSourceId}`;
  const res = await fetch(matchUrl, { headers, next: { revalidate: 60 } });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Match fetch failed (${res.status}) at ${matchUrl}. ${errorText}`
    );
  }

  const match = (await res.json()) as MatchDetails;
  const stats = match.stats ?? [];
  const teamScores = new Map<number, number>();
  (match.team_scores ?? []).forEach((team) => {
    teamScores.set(team.team_number, team.score);
  });

  const teamMap = new Map<number, MatchStat[]>();
  for (const stat of stats) {
    const teamNumber = stat.initial_team_number ?? 0;
    const list = teamMap.get(teamNumber) ?? [];
    list.push(stat);
    teamMap.set(teamNumber, list);
  }

  const teamEntries = Array.from(teamMap.entries()).sort(
    ([teamA], [teamB]) => teamA - teamB
  );

  const steamIds = stats
    .map((stat) => stat.steam64_id)
    .filter((id): id is string => Boolean(id));
  const supabase = createSupabaseServerClient();
  const bannedSet = new Set<string>();
  if (supabase && steamIds.length) {
    const { data } = await supabase
      .from("overwatch_reports")
      .select("target_steam_id")
      .in("target_steam_id", steamIds)
      .eq("status", "approved");
    (data ?? []).forEach((row) => {
      if (row?.target_steam_id) bannedSet.add(row.target_steam_id);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.6)]">
            {matchTypeLabel(match.data_source)}
          </div>
          <div className="text-2xl font-semibold text-white">
            Match Details
          </div>
          <div className="text-sm text-[rgba(233,228,255,0.6)]">
            {match.map_name ?? "Unknown map"} •{" "}
            {match.finished_at ? new Date(match.finished_at).toLocaleString() : "N/A"}
          </div>
        </div>
        <Link
          href="/"
          className="rounded-2xl border border-[rgba(155,108,255,0.35)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.7)] transition hover:text-white"
        >
          Back to profile
        </Link>
      </div>

      {teamEntries.map(([teamNumber, teamStats], index) => (
        <Card key={teamNumber} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team {index + 1}</CardTitle>
              <CardDescription>
                Rounds won: {teamScores.get(teamNumber) ?? "N/A"}
              </CardDescription>
            </div>
            <div className="text-xs text-[rgba(233,228,255,0.6)]">
              Team #{teamNumber}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs text-[rgba(233,228,255,0.75)]">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                <tr>
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">TR</th>
                  <th className="py-2 pr-4">K</th>
                  <th className="py-2 pr-4">D</th>
                  <th className="py-2 pr-4">A</th>
                  <th className="py-2 pr-4">K/D</th>
                  <th className="py-2 pr-4">ADR</th>
                  <th className="py-2 pr-4">HS%</th>
                  <th className="py-2 pr-4">KAST</th>
                  <th className="py-2 pr-4">MVP</th>
                  <th className="py-2">Report</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((stat) => {
                  const steamId = stat.steam64_id ?? "";
                  return (
                    <tr
                      key={`${steamId}-${stat.name}`}
                      className="border-t border-[rgba(155,108,255,0.15)]"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="text-white">
                            {stat.name ?? "Unknown"}
                          </span>
                          <span className="font-mono text-[rgba(233,228,255,0.5)]">
                            {steamId || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">-</td>
                      <td className="py-3 pr-4">{formatNumber(stat.leetify_rating)}</td>
                      <td className="py-3 pr-4">{stat.total_kills ?? "N/A"}</td>
                      <td className="py-3 pr-4">{stat.total_deaths ?? "N/A"}</td>
                      <td className="py-3 pr-4">{stat.total_assists ?? "N/A"}</td>
                      <td className="py-3 pr-4">{formatNumber(stat.kd_ratio)}</td>
                      <td className="py-3 pr-4">{formatNumber(toAdr(stat), 1)}</td>
                      <td className="py-3 pr-4">{formatPercent(toHsPercent(stat))}</td>
                      <td className="py-3 pr-4">{formatPercent(toKast(stat))}</td>
                      <td className="py-3 pr-4">{stat.mvps ?? "N/A"}</td>
                      <td className="py-3">
                        <ReportOverwatchModal
                          steamId={steamId || undefined}
                          playerName={stat.name ?? null}
                          disabled={steamId ? bannedSet.has(steamId) : true}
                          disabledReason="Player is already overwatch banned."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

