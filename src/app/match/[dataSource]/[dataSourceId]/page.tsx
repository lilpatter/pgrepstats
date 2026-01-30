import Link from "next/link";
import { Star } from "lucide-react";
import { getEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase";
import { ReportOverwatchModal } from "@/components/profile/ReportOverwatchModal";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { MapPreviewImage } from "@/components/profile/MapPreviewImage";

type MatchStat = {
  steam64_id?: string;
  name?: string;
  initial_team_number?: number;
  rank?: number;
  rank_type?: string | null;
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

type PlayerRanks = {
  premier?: number | null;
  faceit?: number | null;
  faceit_elo?: number | null;
  wingman?: number | null;
  competitive?: Array<{ map_name?: string; rank?: number | null }>;
};

type PlayerProfile = {
  name?: string;
  ranks?: PlayerRanks;
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

function getPremierBadge(rating?: number | null) {
  if (rating === undefined || rating === null) return null;
  if (rating >= 30000) return "/premier/30000.png";
  if (rating >= 25000) return "/premier/25000.png";
  if (rating >= 20000) return "/premier/20000.png";
  if (rating >= 15000) return "/premier/15000.png";
  if (rating >= 10000) return "/premier/10000.png";
  if (rating >= 5000) return "/premier/5000.png";
  return "/premier/1000.png";
}

function formatRankValue(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  return value.toLocaleString();
}

function resolveRankLabel(
  source: string | undefined,
  mapName: string | undefined,
  profile?: PlayerProfile | null
) {
  const ranks = profile?.ranks;
  if (!ranks || !source) return "N/A";
  if (source === "matchmaking") return formatRankValue(ranks.premier);
  if (source === "matchmaking_wingman") return formatRankValue(ranks.wingman);
  if (source === "faceit") return formatRankValue(ranks.faceit ?? ranks.faceit_elo);
  if (source === "matchmaking_competitive") {
    const mapRank = ranks.competitive?.find(
      (entry) => entry.map_name === mapName
    );
    return formatRankValue(mapRank?.rank ?? null);
  }
  return "N/A";
}

function getSteamAvatarUrl(steamId?: string | null) {
  if (!steamId) return null;
  return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/ee/ee4a2b9b2e1d8d4f59f4d0d9cbd2fcdabf1c7f80_full.jpg?steamid=${steamId}`;
}

function getPremierRating(profile?: PlayerProfile | null) {
  const value = profile?.ranks?.premier;
  return value === undefined || value === null ? null : value;
}

function normalizeTrust(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  const scaled = (value + 1) / 2;
  return Math.max(0, Math.min(100, Math.round(scaled * 100)));
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

  const rawMapName = String(match.map_name ?? "unknown").toLowerCase();
  const mapImage =
    rawMapName.startsWith("de_") || rawMapName.startsWith("cs_")
      ? `/map-previews/${rawMapName}.webp`
      : null;

  const steamIds = stats
    .map((stat) => stat.steam64_id)
    .filter((id): id is string => Boolean(id));
  const supabase = createSupabaseServerClient();
  const bannedSet = new Set<string>();
  const trustMap = new Map<string, { trust?: number | null }>();
  if (supabase && steamIds.length) {
    const { data } = await supabase
      .from("overwatch_reports")
      .select("target_steam_id")
      .in("target_steam_id", steamIds)
      .eq("status", "approved");
    (data ?? []).forEach((row) => {
      if (row?.target_steam_id) bannedSet.add(row.target_steam_id);
    });

    const { data: profiles } = await supabase
      .from("pgrep_profiles")
      .select("steam_id, trust_rating")
      .in("steam_id", steamIds);
    (profiles ?? []).forEach((row) => {
      if (row?.steam_id) {
        trustMap.set(row.steam_id, {
          trust: row.trust_rating ?? null,
        });
      }
    });
  }

  const profileMap = new Map<string, PlayerProfile>();
  if (steamIds.length) {
    const uniqueIds = Array.from(new Set(steamIds));
    const profileResponses = await Promise.allSettled(
      uniqueIds.map(async (id) => {
        const url = `${baseUrl}/v3/profile?steam64_id=${id}`;
        const profileRes = await fetch(url, {
          headers,
          next: { revalidate: 300 },
        });
        if (!profileRes.ok) return null;
        const profile = (await profileRes.json()) as PlayerProfile;
        return { id, profile };
      })
    );
    profileResponses.forEach((result) => {
      if (result.status === "fulfilled" && result.value?.profile) {
        profileMap.set(result.value.id, result.value.profile);
      }
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
      {mapImage ? (
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <MapPreviewImage src={mapImage} alt={rawMapName} />
          <div className="absolute inset-0 bg-[rgba(6,5,14,0.78)]" />
        </div>
      ) : null}
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

      {teamEntries.map(([teamNumber, teamStats], index) => {
        const sortedStats = [...teamStats].sort((a, b) => {
          const aKills = a.total_kills ?? 0;
          const bKills = b.total_kills ?? 0;
          return bKills - aKills;
        });
        return (
          <Card key={teamNumber} className="relative overflow-hidden p-5">
            <div className="relative flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex w-full items-center justify-center rounded-3xl border border-[rgba(155,108,255,0.25)] bg-[rgba(10,8,20,0.75)] px-4 py-6 text-center lg:w-28">
                  <div>
                    <div className="text-4xl font-semibold text-white">
                      {teamScores.get(teamNumber) ?? "-"}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.6)]">
                      Team {index + 1}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs text-[rgba(233,228,255,0.75)]">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                      <tr className="border-b border-[rgba(155,108,255,0.2)]">
                        <th className="py-2 pr-4">Player</th>
                        <th className="py-2 pr-4">Rank</th>
                        <th className="py-2 pr-4 text-[rgba(233,228,255,0.35)]">TR</th>
                        <th className="py-2 pr-4">K</th>
                        <th className="py-2 pr-4">D</th>
                        <th className="py-2 pr-4">A</th>
                        <th className="py-2 pr-4">K/D</th>
                        <th className="py-2 pr-4">ADR</th>
                        <th className="py-2 pr-4">HS%</th>
                        <th className="py-2 pr-4 text-[rgba(233,228,255,0.35)]">
                          KAST
                        </th>
                        <th className="py-2 pr-4">MVP</th>
                        <th className="py-2">Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStats.map((stat) => {
                        const steamId = stat.steam64_id ?? "";
                        const profile = steamId ? profileMap.get(steamId) : null;
                        const rankLabel = resolveRankLabel(
                          match.data_source,
                          match.map_name,
                          profile
                        );
                        const trustRecord = steamId ? trustMap.get(steamId) : null;
                        const trustRating = trustRecord?.trust ?? null;
                        const avatarUrl = getSteamAvatarUrl(steamId);
                        const premierRating = getPremierRating(profile);
                        const premierBadge =
                          match.data_source === "matchmaking"
                            ? getPremierBadge(premierRating)
                            : null;
                        return (
                          <tr
                            key={`${steamId}-${stat.name}`}
                            className="border-t border-[rgba(155,108,255,0.12)]"
                          >
                            <td className="py-3 pr-4">
                              <Link
                                href={steamId ? `/profile/${steamId}` : "#"}
                                className="flex items-center gap-3"
                              >
                                <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,26,0.9)]">
                                  {avatarUrl ? (
                                    <img
                                      src={avatarUrl}
                                      alt={stat.name ?? "Player avatar"}
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
                                    {stat.name ?? "Unknown"}
                                  </span>
                                  <span className="font-mono text-[rgba(233,228,255,0.5)]">
                                    {steamId || "N/A"}
                                  </span>
                                </div>
                              </Link>
                            </td>
                            <td className="py-3 pr-4">
                              {premierBadge ? (
                                <div className="relative h-8 w-20">
                                  <img
                                    src={premierBadge}
                                    alt="Premier Rank"
                                    className="h-8 w-auto object-contain"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center italic text-white">
                                    <span className="text-sm font-semibold">
                                      {premierRating?.toLocaleString() ?? "N/A"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-white">{rankLabel}</span>
                                  <span className="text-[rgba(233,228,255,0.5)]">
                                    {matchTypeLabel(match.data_source)}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-[rgba(233,228,255,0.35)]">
                              {trustRating ?? "N/A"}
                            </td>
                            <td className="py-3 pr-4">{stat.total_kills ?? "N/A"}</td>
                            <td className="py-3 pr-4">{stat.total_deaths ?? "N/A"}</td>
                            <td className="py-3 pr-4">{stat.total_assists ?? "N/A"}</td>
                            <td className="py-3 pr-4">{formatNumber(stat.kd_ratio)}</td>
                            <td className="py-3 pr-4">{formatNumber(toAdr(stat), 1)}</td>
                            <td className="py-3 pr-4">{formatPercent(toHsPercent(stat))}</td>
                            <td className="py-3 pr-4 text-[rgba(233,228,255,0.35)]">
                              {formatPercent(toKast(stat))}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-1 text-white">
                                <Star className="h-3.5 w-3.5 text-[#ffd35a]" />
                                {stat.mvps ?? 0}
                              </div>
                            </td>
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
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

