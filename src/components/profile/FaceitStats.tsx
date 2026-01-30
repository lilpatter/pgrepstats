"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FaceitStatsResponse = {
  lifetime?: Record<string, unknown>;
};

type FaceitHistory = {
  items?: Array<Record<string, unknown>>;
};

type FaceitHubs = {
  items?: Array<Record<string, unknown>>;
};

type FaceitTeams = {
  items?: Array<Record<string, unknown>>;
};

type FaceitTournaments = {
  items?: Array<Record<string, unknown>>;
};

type FaceitProfile = {
  nickname?: string;
  country?: string;
  avatar?: string;
  player_id?: string;
  faceit_url?: string;
  created_at?: number;
  games?: Record<string, unknown>;
};

function getLifetimeValue(
  lifetime: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!lifetime) return "N/A";
  for (const key of keys) {
    const value = lifetime[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "N/A";
}

function getLifetimeNumber(
  lifetime: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!lifetime) return null;
  for (const key of keys) {
    const raw = lifetime[key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function formatRatio(value: number | null) {
  if (value === null) return "N/A";
  return value.toFixed(2);
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}`;
}

function formatCount(value: number | null) {
  if (value === null) return "N/A";
  return Math.round(value).toLocaleString();
}

function formatFaceitDate(dateValue?: string | number) {
  if (!dateValue) return "N/A";
  if (typeof dateValue === "number") {
    const ms = dateValue > 10_000_000_000 ? dateValue : dateValue * 1000;
    return new Date(ms).toLocaleDateString();
  }
  const parsed = Date.parse(dateValue);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString();
  }
  return "N/A";
}

function getProfileDate(profile: FaceitProfile | null) {
  if (!profile) return "N/A";
  const source = profile as Record<string, unknown>;
  const dateKeys = [
    "created_at",
    "activated_at",
    "registered_at",
    "registration_date",
    "member_since",
  ];
  for (const key of dateKeys) {
    const value = source[key];
    if (typeof value === "number" || typeof value === "string") {
      const formatted = formatFaceitDate(value);
      if (formatted !== "N/A") return formatted;
    }
  }
  return "N/A";
}

function getPlayerFactionId(
  match: Record<string, unknown>,
  playerId?: string
) {
  if (!playerId) return null;
  const teams = match.teams as Record<string, unknown> | undefined;
  if (!teams) return null;
  for (const [factionKey, factionValue] of Object.entries(teams)) {
    const faction = factionValue as { players?: Array<{ player_id?: string }> };
    const players = faction?.players ?? [];
    if (players.some((player) => player.player_id === playerId)) {
      return factionKey;
    }
  }
  return null;
}

function buildRecentForm(history?: FaceitHistory, playerId?: string) {
  if (!history?.items) return [];
  return history.items.slice(0, 12).map((item) => {
    const results = item.results as { winner?: string } | undefined;
    const winnerFaction = results?.winner ?? "";
    const playerFaction = getPlayerFactionId(item, playerId);
    if (!playerFaction) return "L";
    return winnerFaction === playerFaction ? "W" : "L";
  });
}

function getMatchTeams(match: Record<string, unknown>) {
  const teams = match.teams as Record<
    string,
    { nickname?: string; avatar?: string }
  > | undefined;
  if (!teams) return [];
  return Object.entries(teams)
    .slice(0, 2)
    .map(([id, team]) => ({
      id,
      name: team?.nickname ?? "Team",
      avatar: team?.avatar,
    }));
}

function getMatchScore(
  match: Record<string, unknown>,
  teamIds: string[]
): { left: number | null; right: number | null } {
  const results = match.results as { score?: Record<string, number> } | undefined;
  const score = results?.score;
  if (!score || teamIds.length < 2) {
    return { left: null, right: null };
  }
  const left = typeof score[teamIds[0]] === "number" ? score[teamIds[0]] : null;
  const right = typeof score[teamIds[1]] === "number" ? score[teamIds[1]] : null;
  return { left, right };
}

function getMatchCompetition(match: Record<string, unknown>) {
  const name = match.competition_name as string | undefined;
  const type = match.competition_type as string | undefined;
  return { name: name ?? "Unknown competition", type: type ?? "Matchmaking" };
}

function getMatchRegion(match: Record<string, unknown>) {
  return (match.region as string | undefined)?.toUpperCase() ?? "N/A";
}

function getMatchRoomUrl(matchId: string, game: "cs2" | "csgo") {
  return `https://www.faceit.com/en/${game}/room/${matchId}`;
}

function formatHubGame(gameId?: string) {
  if (!gameId) return "CS2";
  if (gameId.toLowerCase() === "csgo") return "CS:GO";
  if (gameId.toLowerCase() === "cs2") return "CS2";
  return gameId.toUpperCase();
}

function formatTeamGame(gameId?: string) {
  return formatHubGame(gameId);
}

function formatTournamentFormat(gameId?: string, teamSize?: number) {
  const game = formatHubGame(gameId).toLowerCase();
  if (!teamSize) return game;
  return `${game} ${teamSize}v${teamSize}`;
}

function formatTournamentPrize(totalPrize?: number | string, prizeType?: string) {
  if (totalPrize === undefined || totalPrize === null || totalPrize === "") return "N/A";
  const parsed =
    typeof totalPrize === "number"
      ? totalPrize
      : Number.parseFloat(String(totalPrize).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed)) return "N/A";
  const label = prizeType ? ` ${prizeType}` : "";
  return `${Math.round(parsed).toLocaleString()}${label}`;
}

function getTournamentUrl(tournamentId?: string, gameId?: string) {
  if (!tournamentId) return undefined;
  const game = gameId ? gameId.toLowerCase() : "cs2";
  return `https://www.faceit.com/en/${game}/tournament/${tournamentId}`;
}

function getTeamUrl(teamId?: string) {
  if (!teamId) return undefined;
  return `https://www.faceit.com/en/teams/${teamId}`;
}

function getHubUrl(hubId?: string, hubName?: string) {
  if (!hubId) return undefined;
  const slug = encodeURIComponent(hubName ?? "Hub");
  return `https://www.faceit.com/en/hub/${hubId}/${slug}`;
}

export function FaceitStats({
  faceitProfile,
  statsCs2,
  statsCsgo,
  historyCs2,
  historyCsgo,
  hubs,
  teams,
  tournaments,
}: {
  faceitProfile: FaceitProfile | null;
  statsCs2: FaceitStatsResponse | null;
  statsCsgo: FaceitStatsResponse | null;
  historyCs2: FaceitHistory | null;
  historyCsgo: FaceitHistory | null;
  hubs: FaceitHubs | null;
  teams: FaceitTeams | null;
  tournaments: FaceitTournaments | null;
}) {
  const [game, setGame] = useState<"cs2" | "csgo">("cs2");
  const [matchPage, setMatchPage] = useState(0);
  const [tournamentPage, setTournamentPage] = useState(0);

  const stats = game === "cs2" ? statsCs2 : statsCsgo;
  const history = game === "cs2" ? historyCs2 : historyCsgo;
  const lifetime = stats?.lifetime;

  const faceitGames = faceitProfile?.games as Record<string, unknown> | undefined;
  const faceitGame =
    game === "cs2"
      ? (faceitGames?.cs2 as Record<string, unknown>) ?? undefined
      : (faceitGames?.csgo as Record<string, unknown>) ?? undefined;

  const faceitElo = faceitGame?.faceit_elo as number | undefined;
  const faceitLevel = faceitGame?.skill_level as number | undefined;
  const faceitLevelBadge = faceitLevel ? `/faceit-levels/lvl${faceitLevel}.svg` : null;
  const faceitRegistered = getProfileDate(faceitProfile);
  const kdPrimary =
    game === "csgo"
      ? getLifetimeNumber(lifetime, ["Average K/D Ratio"])
      : getLifetimeNumber(lifetime, ["K/D Ratio"]);
  const kdFallback =
    game === "csgo"
      ? getLifetimeNumber(lifetime, ["K/D Ratio"])
      : getLifetimeNumber(lifetime, ["Average K/D Ratio"]);
  const kdValue =
    kdPrimary !== null && kdPrimary > 0 && kdPrimary < 10
      ? kdPrimary
      : kdFallback !== null && kdFallback > 0 && kdFallback < 10
      ? kdFallback
      : kdPrimary ?? kdFallback;

  const recentForm = useMemo(
    () => buildRecentForm(history ?? undefined, faceitProfile?.player_id),
    [history, faceitProfile?.player_id]
  );

  const lastMatch = history?.items?.[0] as
    | { finished_at?: string | number; started_at?: string | number }
    | undefined;

  useEffect(() => {
    setMatchPage(0);
  }, [game]);

  const pageSize = 10;
  const allMatches = history?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(allMatches.length / pageSize));
  const clampedPage = Math.min(matchPage, totalPages - 1);
  const pageStart = clampedPage * pageSize;
  const pageItems = allMatches.slice(pageStart, pageStart + pageSize);
  const tournamentPageSize = 10;
  const allTournaments = tournaments?.items ?? [];
  const tournamentPages = Math.max(
    1,
    Math.ceil(allTournaments.length / tournamentPageSize)
  );
  const clampedTournamentPage = Math.min(tournamentPage, tournamentPages - 1);
  const tournamentStart = clampedTournamentPage * tournamentPageSize;
  const tournamentItems = allTournaments.slice(
    tournamentStart,
    tournamentStart + tournamentPageSize
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="stats">
        <TabsList className="w-full justify-start gap-2">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="hubs">Hubs</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.8)]">
              {faceitProfile?.avatar ? (
                <Image
                  src={faceitProfile.avatar}
                  alt="FACEIT avatar"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[rgba(233,228,255,0.6)]">
                  N/A
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {faceitProfile?.nickname ?? "FACEIT Player"}
              </div>
              <div className="text-xs text-[rgba(233,228,255,0.6)]">
                Last Match:{" "}
                {formatFaceitDate(lastMatch?.finished_at ?? lastMatch?.started_at)} •{" "}
                {faceitProfile?.country?.toUpperCase() ?? "N/A"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGame("cs2")}
              className={`rounded-xl border px-3 py-1 text-xs ${
                game === "cs2"
                  ? "border-[rgba(155,108,255,0.4)] bg-[rgba(15,12,30,0.6)] text-[#ff7a1a]"
                  : "border-[rgba(155,108,255,0.2)] bg-[rgba(15,12,30,0.4)] text-[rgba(233,228,255,0.6)]"
              }`}
            >
              CS2
            </button>
            <button
              type="button"
              onClick={() => setGame("csgo")}
              className={`rounded-xl border px-3 py-1 text-xs ${
                game === "csgo"
                  ? "border-[rgba(155,108,255,0.4)] bg-[rgba(15,12,30,0.6)] text-[#ff7a1a]"
                  : "border-[rgba(155,108,255,0.2)] bg-[rgba(15,12,30,0.4)] text-[rgba(233,228,255,0.6)]"
              }`}
            >
              CS:GO
            </button>
          </div>
        </div>

        <TabsContent value="stats">
          <div className="grid gap-4 lg:grid-cols-6">
            {[
              {
                label: "Level",
                value: faceitLevel ?? "N/A",
                badge: faceitLevelBadge,
              },
              { label: "ELO", value: faceitElo ?? "N/A" },
              { label: "Win Rate", value: formatPercent(getLifetimeNumber(lifetime, ["Win Rate %"])) },
              {
                label: "K/D",
                value: formatRatio(kdValue),
              },
              {
                label: "HS%",
                value: formatPercent(
                  getLifetimeNumber(lifetime, ["Average HS %", "Average Headshots %"])
                ),
              },
              { label: "Matches", value: formatCount(getLifetimeNumber(lifetime, ["Matches"])) },
            ].map((stat) => (
              <Card key={stat.label} className="space-y-1 text-center">
                <CardDescription>{stat.label}</CardDescription>
                <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-white">
                  {stat.badge ? (
                    <Image
                      src={stat.badge}
                      alt={`${stat.label} badge`}
                      width={22}
                      height={22}
                    />
                  ) : null}
                  {stat.value}
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <Card className="space-y-3">
              <CardTitle>Combat Stats</CardTitle>
              <div className="grid gap-2 text-xs text-[rgba(233,228,255,0.7)]">
                <div>ADR: {getLifetimeValue(lifetime, ["ADR"])}</div>
                <div>
                  Sniper Kills: {getLifetimeValue(lifetime, ["Total Sniper Kills"])}
                </div>
              </div>
            </Card>
            <Card className="space-y-3">
              <CardTitle>Clutch Performance</CardTitle>
              <div className="grid gap-2 text-xs text-[rgba(233,228,255,0.7)]">
                <div>1v1 Win Rate: {getLifetimeValue(lifetime, ["1v1 Win Rate"])}</div>
                <div>1v2 Win Rate: {getLifetimeValue(lifetime, ["1v2 Win Rate"])}</div>
              </div>
            </Card>
            <Card className="space-y-3">
              <CardTitle>Account Info</CardTitle>
              <div className="grid gap-2 text-xs text-[rgba(233,228,255,0.7)]">
                <div>Registered: {faceitRegistered}</div>
                <div>Total Matches: {formatCount(getLifetimeNumber(lifetime, ["Matches"]))}</div>
              </div>
            </Card>
            <Card className="space-y-3">
              <CardTitle>Recent Form</CardTitle>
              <div className="flex flex-wrap gap-2">
                {(recentForm.length > 0 ? recentForm : ["N/A"]).map((result, index) => (
                  <span
                    key={`faceit-form-${index}`}
                    className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
                      result === "W"
                        ? "bg-[#1d4430] text-[#47f59d]"
                        : result === "L"
                        ? "bg-[#3d1d2b] text-[#ff5a7a]"
                        : "bg-[#3a341d] text-[#f5d447]"
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <details className="mt-6 rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] p-4 text-sm text-[rgba(233,228,255,0.7)]">
            <summary className="cursor-pointer text-white">
              View Advanced Statistics
            </summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3">
                <CardTitle>Utility Usage</CardTitle>
                <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                  <div>Flashes/Round: {getLifetimeValue(lifetime, ["Flashes per Round"])}</div>
                  <div>Utility/Round: {getLifetimeValue(lifetime, ["Utility Usage per Round"])}</div>
                  <div>Flash Success: {getLifetimeValue(lifetime, ["Flash Success Rate"])}</div>
                  <div>Utility Success: {getLifetimeValue(lifetime, ["Utility Success Rate"])}</div>
                  <div>Total Flashes: {getLifetimeValue(lifetime, ["Total Flash Count"])}</div>
                  <div>Total Utility: {getLifetimeValue(lifetime, ["Total Utility Count"])}</div>
                </div>
              </Card>
              <Card className="space-y-3">
                <CardTitle>Entry Stats</CardTitle>
                <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                  <div>Entry Rate: {getLifetimeValue(lifetime, ["Entry Rate"])}</div>
                  <div>Entry Success: {getLifetimeValue(lifetime, ["Entry Success Rate"])}</div>
                  <div>Total Entries: {getLifetimeValue(lifetime, ["Total Entry Count"])}</div>
                </div>
              </Card>
              <Card className="space-y-3">
                <CardTitle>Additional Stats</CardTitle>
                <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                  <div>Total Damage: {getLifetimeValue(lifetime, ["Total Damage"])}</div>
                  <div>Total Headshots: {getLifetimeValue(lifetime, ["Total Headshots %"])}</div>
                  <div>Total Wins: {getLifetimeValue(lifetime, ["Wins"])}</div>
                </div>
              </Card>
            </div>
          </details>
        </TabsContent>
        <TabsContent value="matches">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 text-xs uppercase tracking-widest text-[rgba(233,228,255,0.45)]">
              <span className="w-[38%]">Competition</span>
              <span className="w-[22%]">Teams</span>
              <span className="w-[14%] text-center">Score</span>
              <span className="w-[10%] text-center">Region</span>
              <span className="w-[16%] text-right">Date</span>
            </div>
            <div className="divide-y divide-[rgba(155,108,255,0.2)]">
              {(pageItems.length ? pageItems : []).map((match, index) => {
                  const competition = getMatchCompetition(match);
                  const teams = getMatchTeams(match);
                  const teamIds = teams.map((team) => team.id);
                  const score = getMatchScore(match, teamIds);
                  const playerFaction = getPlayerFactionId(
                    match,
                    faceitProfile?.player_id
                  );
                  const winnerFaction = (
                    match.results as { winner?: string } | undefined
                  )?.winner;
                  const result =
                    playerFaction && winnerFaction
                      ? winnerFaction === playerFaction
                        ? "W"
                        : "L"
                      : "N/A";
                  const resultColor =
                    result === "W"
                      ? "text-[#47f59d]"
                      : result === "L"
                      ? "text-[#ff5a7a]"
                      : "text-[rgba(233,228,255,0.6)]";
                  const matchId = String(
                    (match.match_id as string | undefined) ??
                      (match.id as string | undefined) ??
                      ""
                  );
                  const matchUrl = matchId ? getMatchRoomUrl(matchId, game) : undefined;
                  return (
                    <a
                      key={`${matchId || index}`}
                      href={matchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-[rgba(233,228,255,0.75)] transition hover:bg-[rgba(155,108,255,0.08)]"
                    >
                      <div className="w-[38%]">
                        <div className="text-white">{competition.name}</div>
                        <div className="text-xs text-[rgba(233,228,255,0.5)]">
                          {competition.type}
                        </div>
                      </div>
                      <div className="flex w-[22%] items-center gap-2 text-xs">
                        {teams.map((team, teamIndex) => (
                          <div key={`${team.id}-${teamIndex}`} className="flex items-center gap-2">
                            <div className="relative h-7 w-7 overflow-hidden rounded-lg border border-[rgba(155,108,255,0.25)] bg-[rgba(10,7,20,0.6)]">
                              {team.avatar ? (
                                <Image
                                  src={team.avatar}
                                  alt={team.name}
                                  fill
                                  sizes="28px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-[rgba(233,228,255,0.6)]">
                                  ?
                                </div>
                              )}
                            </div>
                            {teamIndex === 0 && teams.length > 1 ? (
                              <span className="text-[rgba(233,228,255,0.4)]">vs</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="w-[14%] text-center">
                        <span className={`mr-2 text-sm font-semibold ${resultColor}`}>
                          {result}
                        </span>
                        <span className="text-white">
                          {score.left ?? "-"} : {score.right ?? "-"}
                        </span>
                      </div>
                      <div className="w-[10%] text-center text-xs">
                        {getMatchRegion(match)}
                      </div>
                      <div className="w-[16%] text-right text-xs">
                        {formatFaceitDate(
                          (match.finished_at as string | number | undefined) ??
                            (match.started_at as string | number | undefined)
                        )}
                      </div>
                    </a>
                  );
                })}
              {(!history?.items || history.items.length === 0) && (
                <div className="px-4 py-6 text-sm text-[rgba(233,228,255,0.6)]">
                  No match history available.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-xs text-[rgba(233,228,255,0.5)]">
              <span>
                Showing 1 to{" "}
                {Math.min(pageStart + pageItems.length, allMatches.length)}{" "}
                {allMatches.length ? `of ${allMatches.length}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMatchPage(0)}
                  className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.5)] disabled:opacity-40"
                  disabled={clampedPage === 0}
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setMatchPage((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.8)] disabled:opacity-40"
                  disabled={clampedPage === 0}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-white"
                >
                  {clampedPage + 1}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMatchPage((prev) => Math.min(totalPages - 1, prev + 1))
                  }
                  className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.8)] disabled:opacity-40"
                  disabled={clampedPage >= totalPages - 1}
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setMatchPage(totalPages - 1)}
                  className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.5)] disabled:opacity-40"
                  disabled={clampedPage >= totalPages - 1}
                >
                  »
                </button>
              </div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="hubs">
          <div className="grid gap-4 lg:grid-cols-2">
            {(hubs?.items?.length ? hubs.items : []).map((hub, index) => {
              const hubData = hub as {
                name?: string;
                avatar?: string;
                faceit_url?: string;
                hub_id?: string;
                game_id?: string;
                game_data?: { name?: string };
                region?: string;
              };
              const hubName = hubData.name ?? "FACEIT Hub";
              const hubUrl =
                getHubUrl(hubData.hub_id, hubName) ?? hubData.faceit_url ?? undefined;
              const hubGame = formatHubGame(hubData.game_id);
              return (
                <a
                  key={`${hubData.faceit_url ?? hubName}-${index}`}
                  href={hubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] p-4 transition hover:border-[rgba(155,108,255,0.6)]"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.8)]">
                    {hubData.avatar ? (
                      <Image
                        src={hubData.avatar}
                        alt={hubName}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[rgba(233,228,255,0.6)]">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{hubName}</div>
                    <div className="text-xs text-[rgba(233,228,255,0.55)]">
                      {hubGame}
                    </div>
                  </div>
                </a>
              );
            })}
            {(!hubs?.items || hubs.items.length === 0) && (
              <Card className="space-y-2">
                <CardTitle>Hubs</CardTitle>
                <CardDescription>No hubs available.</CardDescription>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="teams">
          {teams?.items?.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {teams.items.map((team, index) => {
                const teamData = team as {
                  name?: string;
                  avatar?: string;
                  faceit_url?: string;
                  team_id?: string;
                  game?: string;
                  region?: string;
                  leader?: string;
                  members?: Array<{ player_id?: string }>;
                };
                const teamName = teamData.name ?? "FACEIT Team";
                const teamUrl = getTeamUrl(teamData.team_id) ?? teamData.faceit_url ?? undefined;
                const teamGame = formatTeamGame(teamData.game);
                const memberCount = teamData.members?.length ?? null;
                const role =
                  teamData.leader &&
                  faceitProfile?.player_id &&
                  teamData.leader === faceitProfile.player_id
                    ? "Leader"
                    : null;
                const region = teamData.region?.toUpperCase() ?? null;
                return (
                  <a
                    key={`${teamData.team_id ?? teamName}-${index}`}
                    href={teamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] p-4 transition hover:border-[rgba(155,108,255,0.6)]"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.8)]">
                      {teamData.avatar ? (
                        <Image
                          src={teamData.avatar}
                          alt={teamName}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[rgba(233,228,255,0.6)]">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{teamName}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[rgba(233,228,255,0.55)]">
                        <span>{teamGame}</span>
                        {region ? <span>{region}</span> : null}
                        {memberCount ? <span>{memberCount} members</span> : null}
                        {role ? <span>{role}</span> : null}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(155,108,255,0.3)] text-[rgba(233,228,255,0.6)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-white">No teams found</div>
              <div className="text-xs text-[rgba(233,228,255,0.6)]">
                This player isn't part of any FACEIT teams.
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="tournaments">
          {tournamentItems.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-4 py-2 text-xs uppercase tracking-widest text-[rgba(233,228,255,0.45)]">
                <span className="w-[44%]">Tournament</span>
                <span className="w-[18%] text-center">Format</span>
                <span className="w-[18%] text-center">Prize</span>
                <span className="w-[20%] text-right">Date</span>
              </div>
              <div className="space-y-3">
                {tournamentItems.map((tournament, index) => {
                  const data = tournament as {
                    name?: string;
                    faceit_url?: string;
                    game_id?: string;
                    team_size?: number;
                    total_prize?: number | string;
                    prize_type?: string;
                    region?: string;
                    number_of_players_participants?: number;
                    number_of_players?: number;
                    started_at?: number | string;
                    tournament_id?: string;
                  };
                  const format = formatTournamentFormat(data.game_id, data.team_size);
                  const prize = formatTournamentPrize(
                    data.total_prize,
                    data.prize_type === "points" ? "pts" : data.prize_type
                  );
                  const region = data.region?.toUpperCase() ?? "N/A";
                  const players =
                    data.number_of_players_participants ?? data.number_of_players ?? null;
                  const date = formatFaceitDate(data.started_at);
                  const tournamentUrl =
                    getTournamentUrl(data.tournament_id, data.game_id) ??
                    data.faceit_url ??
                    undefined;
                  return (
                    <a
                      key={`${data.tournament_id ?? data.faceit_url ?? index}`}
                      href={tournamentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(15,12,30,0.55)] p-4 transition hover:border-[rgba(155,108,255,0.55)]"
                    >
                      <div className="w-[44%]">
                        <div className="text-sm font-semibold text-white">
                          {data.name ?? "FACEIT Tournament"}
                        </div>
                        <div className="text-xs text-[rgba(233,228,255,0.55)]">
                          {region}
                          {players ? ` • ${players} players` : ""}
                        </div>
                      </div>
                      <div className="w-[18%] text-center text-xs text-[rgba(233,228,255,0.8)]">
                        {format}
                      </div>
                      <div className="w-[18%] text-center text-xs text-[#47f59d]">
                        {prize}
                      </div>
                      <div className="w-[20%] text-right text-xs text-[rgba(233,228,255,0.8)]">
                        {date}
                      </div>
                    </a>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-4 py-2 text-xs text-[rgba(233,228,255,0.5)]">
                <span>
                  Showing 1 to{" "}
                  {Math.min(tournamentStart + tournamentItems.length, allTournaments.length)}{" "}
                  {allTournaments.length ? `of ${allTournaments.length}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTournamentPage(0)}
                    className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.5)] disabled:opacity-40"
                    disabled={clampedTournamentPage === 0}
                  >
                    «
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTournamentPage((prev) => Math.max(0, prev - 1))
                    }
                    className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.8)] disabled:opacity-40"
                    disabled={clampedTournamentPage === 0}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-white"
                  >
                    {clampedTournamentPage + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTournamentPage((prev) =>
                        Math.min(tournamentPages - 1, prev + 1)
                      )
                    }
                    className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.8)] disabled:opacity-40"
                    disabled={clampedTournamentPage >= tournamentPages - 1}
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setTournamentPage(tournamentPages - 1)}
                    className="rounded-lg border border-[rgba(155,108,255,0.2)] px-2 py-1 text-[rgba(233,228,255,0.5)] disabled:opacity-40"
                    disabled={clampedTournamentPage >= tournamentPages - 1}
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(155,108,255,0.3)] text-[rgba(233,228,255,0.6)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M8 21h8" />
                  <path d="M12 17c3.5 0 6-2.5 6-6V5H6v6c0 3.5 2.5 6 6 6Z" />
                  <path d="M6 7H4c0 2.5 1.5 4 4 4" />
                  <path d="M18 7h2c0 2.5-1.5 4-4 4" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-white">No tournaments found</div>
              <div className="text-xs text-[rgba(233,228,255,0.6)]">
                This player hasn't participated in any FACEIT tournaments.
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

