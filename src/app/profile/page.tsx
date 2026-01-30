import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { MapPreviewImage } from "@/components/profile/MapPreviewImage";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { FaceitStats } from "@/components/profile/FaceitStats";
import { ReportOverwatchModal } from "@/components/profile/ReportOverwatchModal";
import { createSupabaseServerClient } from "@/lib/supabase";

type SteamProfile = {
  personaname?: string;
  avatarfull?: string;
  profileurl?: string;
  timecreated?: number;
  gameextrainfo?: string;
  loccountrycode?: string;
  communityvisibilitystate?: number;
  lastlogoff?: number;
  personastate?: number;
};

type SteamGame = {
  playtime_forever?: number;
};

type ProfileTemplateProps = {
  steamId?: string;
  steamProfile?: SteamProfile | null;
  cs2?: SteamGame | null;
  steamLevel?: number | null;
  steamFriendsCount?: number | null;
  steamRecentGames?: Array<{
    appid?: number;
    name?: string;
    playtime_2weeks?: number;
    playtime_forever?: number;
    img_icon_url?: string;
  }>;
  initialRefreshedAt?: number;
  leetifyProfile?: Record<string, unknown> | null;
  faceitProfile?: Record<string, unknown> | null;
  errors?: Partial<Record<"steam" | "leetify" | "faceit", string>>;
  overwatchBanned?: boolean;
  viewerSteamId?: string | null;
};

const statCards = [
  { label: "Premier Rating", value: "22,239" },
  { label: "Win Rate", value: "51.8%" },
  { label: "HS Accuracy", value: "19.2%" },
  { label: "Matches", value: "1,388" },
];

function formatDate(timestamp?: number) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp * 1000).toLocaleDateString();
}

function formatHours(minutes?: number) {
  if (!minutes) return "0";
  return Math.round(minutes / 60).toLocaleString();
}

function displayValue(value: string, hasData: boolean) {
  return hasData ? value : "N/A";
}

function formatPercent(value?: number, fraction = false) {
  if (value === undefined || value === null) return "N/A";
  const numeric = fraction ? value * 100 : value;
  return `${numeric.toFixed(1)}%`;
}

function formatNumber(value?: number, digits = 1) {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
}

function valueColor(
  value: number | undefined,
  threshold: number,
  invert = false
) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "text-white";
  }
  const good = invert ? value <= threshold : value >= threshold;
  return good ? "text-[#47f59d]" : "text-[#ff5a7a]";
}

function ratingToPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  const normalized = (value + 1) / 3;
  return Math.max(0, Math.min(100, normalized * 100));
}

function parseRecentResults(results?: string) {
  if (!results) return [];
  return results
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);
}

function formatPremierParts(rating?: number | null) {
  if (rating === undefined || rating === null) {
    return { main: "N/A", suffix: "" };
  }
  const formatted = rating.toLocaleString();
  const parts = formatted.split(",");
  if (parts.length === 1) {
    return { main: parts[0], suffix: "" };
  }
  return { main: parts[0], suffix: `,${parts.slice(1).join(",")}` };
}

function formatAccountAge(createdAt: number | undefined, nowMs: number) {
  if (!createdAt) return "N/A";
  const createdDate = new Date(createdAt * 1000);
  const now = new Date(nowMs);
  let years = now.getFullYear() - createdDate.getFullYear();
  let months = now.getMonth() - createdDate.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "N/A";
  return `${years}y ${months}m`;
}

function normalizeStat(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  if (value >= 0 && value <= 1) return value * 100;
  if (value >= -1 && value <= 1) return (value + 1) * 50;
  if (value > 1 && value <= 100) return value;
  return Math.max(0, Math.min(100, value / 10));
}

function normalizeInverse(value?: number, min = 300, max = 900) {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  const clamped = Math.max(min, Math.min(max, value));
  const percent = (clamped - min) / (max - min);
  return Math.max(0, Math.min(100, (1 - percent) * 100));
}

function getPremierRangeForFaceitLevel(level?: number) {
  if (!level) return null;
  if (level === 1) return { min: 1000, max: 3000 };
  if (level === 2 || level === 3) return { min: 3000, max: 6000 };
  if (level === 4 || level === 5) return { min: 7000, max: 10000 };
  if (level === 6 || level === 7) return { min: 10000, max: 15000 };
  if (level === 8 || level === 9) return { min: 15000, max: 20000 };
  if (level === 10) return { min: 20000, max: 30000 };
  return null;
}

function clampPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function scoreFromAccountAge(createdAt: number | undefined, nowMs: number) {
  if (!createdAt) return null;
  const years = (nowMs - createdAt * 1000) / 31_536_000_000;
  if (!Number.isFinite(years) || years < 0) return null;
  return Math.min(100, Math.round(years * 10) / 10 * 0.4);
}

function scoreFromHours(hours?: number) {
  if (!hours && hours !== 0) return null;
  const score = hours * 0.015;
  return Math.min(100, Math.round(score * 10) / 10);
}

function scoreFromSteamLevel(level?: number | null) {
  if (!level && level !== 0) return null;
  const score = level * 0.6;
  return Math.min(100, Math.round(score * 10) / 10);
}

function bonusFromScore(score: number | null) {
  if (score === null) return null;
  return Math.round(score * 0.025 * 100) / 100;
}

function getStatStatus(stat: {
  label: string;
  raw?: number;
}): { status: "normal" | "elevated" | "flagged"; penalty: number } {
  if (stat.label === "Aim Rating") {
    if (stat.raw !== undefined && stat.raw >= 95) {
      return { status: "flagged", penalty: 50 };
    }
  }
  if (stat.label === "Time to Damage") {
    if (stat.raw !== undefined && stat.raw < 500) {
      return { status: "elevated", penalty: 15 };
    }
  }
  if (stat.label === "Leetify Rating") {
    if (stat.raw !== undefined && stat.raw > 5) {
      return { status: "flagged", penalty: 25 };
    }
  }
  return { status: "normal", penalty: 0 };
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

function countryCodeToFlag(code?: string) {
  if (!code || code.length !== 2) return null;
  const base = 0x1f1e6;
  const chars = code.toUpperCase().split("");
  return String.fromCodePoint(
    base + chars[0].charCodeAt(0) - 65,
    base + chars[1].charCodeAt(0) - 65
  );
}

type MapStat = {
  mapName: string;
  matches: number;
  wins: number;
  hsAvg: number;
  reactionAvg: number;
};

function aggregateLeetifyMaps(matches?: Array<Record<string, unknown>>) {
  if (!matches || matches.length === 0) return [];
  const mapStats = new Map<string, MapStat>();

  for (const match of matches) {
    const mapName = String(match.map_name ?? "unknown");
    const outcome = String(match.outcome ?? "");
    const accuracyHead = Number(match.accuracy_head ?? 0);
    const reaction = Number(match.reaction_time_ms ?? 0);

    const current = mapStats.get(mapName) ?? {
      mapName,
      matches: 0,
      wins: 0,
      hsAvg: 0,
      reactionAvg: 0,
    };

    const nextMatches = current.matches + 1;
    const nextWins = current.wins + (outcome === "win" ? 1 : 0);
    const nextHs = (current.hsAvg * current.matches + accuracyHead) / nextMatches;
    const nextReaction =
      (current.reactionAvg * current.matches + reaction) / nextMatches;

    mapStats.set(mapName, {
      mapName,
      matches: nextMatches,
      wins: nextWins,
      hsAvg: nextHs,
      reactionAvg: nextReaction,
    });
  }

  return Array.from(mapStats.values())
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 4);
}

function formatMapName(mapName: string) {
  return mapName.replace(/^de_/, "").replace(/^cs_/, "").toUpperCase();
}

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

export async function ProfileTemplate({
  steamId,
  steamProfile,
  cs2,
  steamLevel,
  steamFriendsCount,
  steamRecentGames,
  initialRefreshedAt,
  leetifyProfile,
  faceitProfile,
  errors,
  overwatchBanned,
  viewerSteamId,
}: ProfileTemplateProps) {
  const nowMs = initialRefreshedAt ?? Date.now();
  const hasSteam = Boolean(steamProfile);
  const leetifyData =
    (leetifyProfile as { profile?: Record<string, unknown> } | null)?.profile ??
    leetifyProfile;
  const hasLeetify = Boolean(leetifyData);
  const hasFaceit = Boolean(faceitProfile);
  const hasSteamCommends = false;
  const steamPrivate =
    steamProfile?.communityvisibilitystate !== undefined &&
    steamProfile.communityvisibilitystate !== 3;
  const leetifyPrivacyMode = leetifyData?.privacy_mode as string | undefined;
  const leetifyPrivate =
    leetifyPrivacyMode !== undefined && leetifyPrivacyMode !== "public";
  const defaultTab = "reputation";

  const displayName = steamProfile?.personaname ?? "Unknown Player";
  const avatarUrl =
    steamProfile?.avatarfull ??
    "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/ee/ee4a2b9b2e1d8d4f59f4d0d9cbd2fcdabf1c7f80_full.jpg";
  const steamProfileUrl = steamProfile?.profileurl ?? "steamcommunity.com";
  const lastOnline = steamProfile?.lastlogoff
    ? formatDate(steamProfile.lastlogoff)
    : "N/A";
  const personaState = steamProfile?.personastate ?? 0;
  const personaLabel =
    personaState === 1
      ? "Online"
      : personaState === 2
      ? "Busy"
      : personaState === 3
      ? "Away"
      : personaState === 4
      ? "Snooze"
      : personaState === 5
      ? "Looking to trade"
      : personaState === 6
      ? "Looking to play"
      : "Offline";
  const personaColor =
    personaState === 1
      ? "text-[#56d1ff]"
      : "text-[rgba(233,228,255,0.6)]";
  const isPlaying = Boolean(steamProfile?.gameextrainfo);
  const gameStatus = isPlaying
    ? `Playing ${steamProfile?.gameextrainfo ?? ""}`
    : personaLabel;
  const statusColor = isPlaying ? "text-[#47f59d]" : personaColor;

  const leetifyRanks = leetifyData?.ranks as
    | {
        premier?: number | null;
        leetify?: number | null;
        wingman?: number | null;
      }
    | undefined;
  const leetifyRating = leetifyData?.rating as
    | {
        aim?: number;
        positioning?: number;
        utility?: number;
        clutch?: number;
        opening?: number;
        ct_leetify?: number;
        t_leetify?: number;
      }
    | undefined;
  const leetifyStats = leetifyData?.stats as
    | {
        accuracy_head?: number;
        preaim?: number;
        accuracy_enemy_spotted?: number;
        reaction_time_ms?: number;
        t_opening_duel_success_percentage?: number;
        ct_opening_duel_success_percentage?: number;
        flashbang_thrown?: number;
        flashbang_hit_foe_per_flashbang?: number;
        flashbang_hit_foe_avg_duration?: number;
        flashbang_leading_to_kill?: number;
        he_foes_damage_avg?: number;
        he_friends_damage_avg?: number;
        utility_on_death_avg?: number;
        flashbang_hit_friend_per_flashbang?: number;
        trade_kills_success_percentage?: number;
        trade_kill_opportunities_per_round?: number;
        traded_deaths_success_percentage?: number;
        counter_strafing_good_shots_ratio?: number;
        t_opening_aggression_success_rate?: number;
        ct_opening_aggression_success_rate?: number;
      }
    | undefined;
  const leetifyWinrate = leetifyData?.winrate as number | undefined;
  const leetifyMatches = leetifyData?.total_matches as number | undefined;
  const leetifyFirstMatch = leetifyData?.first_match_date as string | undefined;
  const leetifyRecentMatches = leetifyData?.recent_matches as
    | Array<Record<string, unknown>>
    | undefined;
  const leetifyMapStats = aggregateLeetifyMaps(leetifyRecentMatches);
  const premierBadge =
    leetifyRanks?.premier == null ? null : getPremierBadge(leetifyRanks.premier);
  const leetifyRecentForm = (leetifyRecentMatches ?? [])
    .slice(0, 12)
    .map((match) => {
      const outcome = String(match.outcome ?? "").toLowerCase();
      if (outcome === "win") return "W";
      if (outcome === "loss") return "L";
      return "D";
    });
  const combinedMatches = (leetifyRecentMatches ?? [])
    .slice()
    .sort((a, b) => {
      const aTime = new Date(String(a.finished_at ?? 0)).getTime();
      const bTime = new Date(String(b.finished_at ?? 0)).getTime();
      return bTime - aTime;
    });

  const faceitNickname = faceitProfile?.nickname as string | undefined;
  const faceitCountry = faceitProfile?.country as string | undefined;
  const faceitGames = faceitProfile?.games as Record<string, unknown> | undefined;
  const faceitCs2 = (faceitGames?.cs2 as Record<string, unknown>) ?? undefined;
  const faceitElo = faceitCs2?.faceit_elo as number | undefined;
  const faceitLevel = faceitCs2?.skill_level as number | undefined;
  const faceitProfileUrl = (faceitProfile?.faceit_url as string | undefined) ?? "faceit.com";
  const faceitLevelBadge = faceitLevel ? `/faceit-levels/lvl${faceitLevel}.svg` : null;
  const faceitStatsResponse = faceitProfile?.statsResponse as
    | { lifetime?: Record<string, unknown> }
    | undefined;
  const faceitHistory = faceitProfile?.matchHistory as
    | { items?: Array<Record<string, unknown>> }
    | undefined;
  const faceitStatsCs2 = faceitProfile?.statsResponse as
    | { lifetime?: Record<string, unknown> }
    | null;
  const faceitStatsCsgo = faceitProfile?.statsResponseCsgo as
    | { lifetime?: Record<string, unknown> }
    | null;
  const faceitHistoryCs2 = faceitProfile?.matchHistory as
    | { items?: Array<Record<string, unknown>> }
    | null;
  const faceitHistoryCsgo = faceitProfile?.matchHistoryCsgo as
    | { items?: Array<Record<string, unknown>> }
    | null;
  const faceitHubs = faceitProfile?.hubsResponse as
    | { items?: Array<Record<string, unknown>> }
    | null;
  const faceitTeams = faceitProfile?.teamsResponse as
    | { items?: Array<Record<string, unknown>> }
    | null;
  const faceitTournaments = faceitProfile?.tournamentsResponse as
    | { items?: Array<Record<string, unknown>> }
    | null;
  const faceitProfileData = (faceitProfile as Record<string, unknown> | null) ?? null;

  const accountAge = formatAccountAge(steamProfile?.timecreated, nowMs);
  const accountAgeScore = scoreFromAccountAge(steamProfile?.timecreated, nowMs);
  const accountAgeBonus = bonusFromScore(accountAgeScore);
  const cs2HoursValue = cs2?.playtime_forever
    ? Math.round(cs2.playtime_forever / 60)
    : null;
  const cs2HoursScore = scoreFromHours(cs2HoursValue ?? undefined);
  const cs2HoursBonus = bonusFromScore(cs2HoursScore);
  const steamLevelScore = scoreFromSteamLevel(steamLevel ?? undefined);
  const steamLevelBonus = bonusFromScore(steamLevelScore);
  const premierRange = getPremierRangeForFaceitLevel(faceitLevel);
  const premierValue = leetifyRanks?.premier ?? undefined;
  const rankMismatch =
    premierRange && premierValue != null
      ? premierValue < premierRange.min || premierValue > premierRange.max
      : null;
  const statsAnalysis = [
    {
      label: "Aim Rating",
      value: leetifyRating?.aim,
      display: leetifyRating?.aim?.toFixed(1) ?? "N/A",
      percent: clampPercent(normalizeStat(leetifyRating?.aim)),
    },
    {
      label: "Positioning",
      value: leetifyRating?.positioning,
      display: leetifyRating?.positioning?.toFixed(1) ?? "N/A",
      percent: clampPercent(normalizeStat(leetifyRating?.positioning)),
    },
    {
      label: "Clutch Rating",
      value: leetifyRating?.clutch,
      display: leetifyRating?.clutch?.toFixed(1) ?? "N/A",
      percent: clampPercent(normalizeStat(leetifyRating?.clutch)),
    },
    {
      label: "HS Accuracy",
      value: leetifyStats?.accuracy_head,
      display: leetifyStats?.accuracy_head
        ? `${leetifyStats.accuracy_head.toFixed(1)}%`
        : "N/A",
      percent: clampPercent(normalizeStat(leetifyStats?.accuracy_head)),
    },
    {
      label: "Enemy Spotted Acc",
      value: leetifyStats?.accuracy_enemy_spotted,
      display: leetifyStats?.accuracy_enemy_spotted
        ? `${leetifyStats.accuracy_enemy_spotted.toFixed(1)}%`
        : "N/A",
      percent: clampPercent(normalizeStat(leetifyStats?.accuracy_enemy_spotted)),
    },
    {
      label: "Time to Damage",
      value: leetifyStats?.reaction_time_ms,
      display: leetifyStats?.reaction_time_ms
        ? `${Math.round(leetifyStats.reaction_time_ms)}ms`
        : "N/A",
      percent: clampPercent(
        normalizeInverse(leetifyStats?.reaction_time_ms, 300, 900)
      ),
    },
    {
      label: "Utility",
      value: leetifyRating?.utility,
      display: leetifyRating?.utility?.toFixed(1) ?? "N/A",
      percent: clampPercent(normalizeStat(leetifyRating?.utility)),
    },
    {
      label: "Opening Rating",
      value: leetifyRating?.opening,
      display: leetifyRating?.opening?.toFixed(1) ?? "N/A",
      percent: clampPercent(normalizeStat(leetifyRating?.opening)),
    },
    {
      label: "Preaim",
      value: leetifyStats?.preaim,
      display: leetifyStats?.preaim?.toFixed(1) ?? "N/A",
      percent: clampPercent(normalizeStat(leetifyStats?.preaim)),
    },
    {
      label: "Leetify Rating",
      value: leetifyRanks?.leetify ?? undefined,
      display:
        leetifyRanks?.leetify != null ? leetifyRanks.leetify.toFixed(2) : "N/A",
      percent: clampPercent(normalizeStat(leetifyRanks?.leetify ?? undefined)),
    },
  ].map((stat) => {
    const statusInfo = getStatStatus({ label: stat.label, raw: stat.value });
    const impact = statusInfo.penalty ? -statusInfo.penalty : null;
    const rawDelta =
      stat.percent > 0 ? Math.round((stat.percent - 50) * 100) / 100 : null;
    const severity =
      stat.percent > 0 ? Math.round(stat.percent * 10) / 10 : null;
    return { ...stat, ...statusInfo, impact, rawDelta, severity };
  });
  const lastFaceitMatch = (faceitHistory?.items?.[0] as
    | { finished_at?: string | number; started_at?: string | number }
    | undefined) ?? null;
  const lastFaceitMatchAt = lastFaceitMatch?.finished_at ?? lastFaceitMatch?.started_at;
  const lastFaceitDate = lastFaceitMatchAt
    ? new Date(
        typeof lastFaceitMatchAt === "number"
          ? lastFaceitMatchAt > 10_000_000_000
            ? lastFaceitMatchAt
            : lastFaceitMatchAt * 1000
          : Date.parse(String(lastFaceitMatchAt))
      )
    : null;
  const daysSinceFaceit =
    lastFaceitDate && !Number.isNaN(lastFaceitDate.getTime())
      ? Math.floor((nowMs - lastFaceitDate.getTime()) / 86_400_000)
      : null;
  const highSkillInactivityScore =
    faceitElo && faceitElo >= 2300 && daysSinceFaceit !== null && daysSinceFaceit > 30
      ? Math.min(100, Math.round(((daysSinceFaceit - 30) / 60) * 100))
      : 0;
  const rankMismatchPenalty = rankMismatch ? 25 : 0;
  const inactivityPenalty = highSkillInactivityScore
    ? Math.round(highSkillInactivityScore * 0.4)
    : 0;
  const statPenalty = statsAnalysis.reduce(
    (sum, stat) => sum + (stat.penalty ?? 0),
    0
  );
  const hasReputationData = Boolean(leetifyProfile);
  const trustScore = hasReputationData
    ? Math.max(
        0,
        Math.min(
          100,
          100 -
            rankMismatchPenalty -
            inactivityPenalty -
            statPenalty +
            (accountAgeBonus ?? 0) +
            (cs2HoursBonus ?? 0) +
            (steamLevelBonus ?? 0)
        )
      )
    : null;
  const trustScoreValue = trustScore ?? 0;
  const trustLabel = hasReputationData
    ? trustScoreValue >= 80
      ? "Normal"
      : trustScoreValue >= 60
      ? "Review"
      : trustScoreValue >= 40
      ? "Caution"
      : "Highly Suspicious"
    : "Insufficient Data";

  if (steamId && steamProfile) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      await supabase
        .from("pgrep_profiles")
        .upsert(
          {
            steam_id: steamId,
            persona_name: steamProfile.personaname ?? null,
            avatar_url: steamProfile.avatarfull ?? null,
            trust_rating: trustScore ?? null,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "steam_id" }
        );
    }
  }
  const faceitLifetime = faceitStatsResponse?.lifetime;
  const faceitWinrate = getLifetimeValue(faceitLifetime, [
    "Win Rate %",
    "Win Rate",
    "Winrate %",
    "Winrate",
  ]);
  const faceitKd = getLifetimeValue(faceitLifetime, [
    "Average K/D Ratio",
    "Average K/D",
    "K/D Ratio",
    "K/D",
  ]);
  const faceitHs = getLifetimeValue(faceitLifetime, [
    "Average HS %",
    "Average HS%",
    "Average Headshots %",
    "Average Headshots%",
    "HS%",
  ]);
  const faceitMatches = getLifetimeValue(faceitLifetime, [
    "Matches",
    "Total Matches",
  ]);
  const faceitRecentResults = faceitHistory?.items
    ? faceitHistory.items.slice(0, 12).map((item) => {
        const results = item.results as { winner?: string } | undefined;
        const winner = results?.winner ?? "";
        const playerId = faceitProfile?.player_id as string | undefined;
        if (!playerId) return "L";
        return winner === playerId ? "W" : "L";
      })
    : parseRecentResults(getLifetimeValue(faceitLifetime, ["Recent Results"]));
  const faceitLastMatch = faceitHistory?.items?.[0] as
    | { finished_at?: string }
    | undefined;
  const faceitMapStats = leetifyRecentMatches
    ? aggregateLeetifyMaps(
        leetifyRecentMatches.filter((match) => match.data_source === "faceit")
      )
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center gap-4 text-center">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-xl font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(155,108,255,0.6)] bg-[rgba(12,9,26,0.9)] text-xs font-semibold text-white shadow-[0_0_20px_rgba(124,77,255,0.45)]">
                {steamLevel ?? "N/A"}
              </span>
              {displayName}
              {steamProfile?.loccountrycode ? (
                <span className="text-base text-[rgba(233,228,255,0.75)]">
                  {countryCodeToFlag(steamProfile.loccountrycode)}{" "}
                  {steamProfile.loccountrycode}
                </span>
              ) : (
                <span className="text-xs text-[rgba(233,228,255,0.5)]">N/A</span>
              )}
            </div>
            <div className="text-xs text-[rgba(233,228,255,0.7)]">
              Joined Steam: {hasSteam ? formatDate(steamProfile?.timecreated) : "N/A"}
            </div>
            <Badge className={hasSteam ? statusColor : undefined}>
              {hasSteam ? gameStatus : "N/A"}
            </Badge>
          </div>

          <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-[rgba(155,108,255,0.4)]">
            <Image
              src={avatarUrl}
              alt="Steam avatar"
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>

          <div className="flex justify-center gap-2">
            {steamId === "76561197963549247" ? (
              <>
                <div className="group relative">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#47f59d] bg-[rgba(71,245,157,0.12)] text-[#47f59d]">
                    ✓
                  </span>
                  <div className="pointer-events-none absolute left-1/2 top-10 z-50 hidden w-56 -translate-x-1/2 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,26,0.95)] px-4 py-3 text-center text-xs text-[rgba(233,228,255,0.7)] shadow-[0_0_24px_rgba(124,77,255,0.35)] group-hover:block">
                    <div className="mb-1 text-sm font-semibold text-[#9b6cff]">
                      Verified
                    </div>
                    Community member verified by PGREP.
                  </div>
                </div>
                <div className="group relative">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#56d1ff] bg-[rgba(86,209,255,0.12)] text-[#56d1ff]">
                    ★
                  </span>
                  <div className="pointer-events-none absolute left-1/2 top-10 z-50 hidden w-56 -translate-x-1/2 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,26,0.95)] px-4 py-3 text-center text-xs text-[rgba(233,228,255,0.7)] shadow-[0_0_24px_rgba(124,77,255,0.35)] group-hover:block">
                    <div className="mb-1 text-sm font-semibold text-[#9b6cff]">
                      Owner
                    </div>
                    Official PGREP team account.
                  </div>
                </div>
              </>
            ) : null}
            {overwatchBanned ? (
              <div className="group relative">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ff5a7a] bg-[rgba(255,90,122,0.12)] text-[#ff5a7a]">
                  ⛔
                </span>
                <div className="pointer-events-none absolute left-1/2 top-10 z-50 hidden w-56 -translate-x-1/2 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,26,0.95)] px-4 py-3 text-center text-xs text-[rgba(233,228,255,0.7)] shadow-[0_0_24px_rgba(124,77,255,0.35)] group-hover:block">
                  <div className="mb-1 text-sm font-semibold text-[#ff5a7a]">
                    Overwatch Banned
                  </div>
                  Report approved by PGREP moderation.
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-2">
            {hasSteam ? (
              <a
                href={steamProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] text-sm font-semibold text-white transition hover:border-[#9b6cff]"
                title="Steam Profile"
              >
                <svg
                  fill="#FFFFFF"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 50 50"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M 25 3 C 13.59 3 4.209375 11.680781 3.109375 22.800781 L 14.300781 28.529297 C 15.430781 27.579297 16.9 27 18.5 27 L 18.550781 27 C 18.940781 26.4 19.389375 25.649141 19.859375 24.869141 C 20.839375 23.259141 21.939531 21.439062 23.019531 20.039062 C 23.259531 15.569063 26.97 12 31.5 12 C 36.19 12 40 15.81 40 20.5 C 40 25.03 36.430937 28.740469 31.960938 28.980469 C 30.560938 30.060469 28.750859 31.160859 27.130859 32.130859 C 26.350859 32.610859 25.6 33.059219 25 33.449219 L 25 33.5 C 25 37.09 22.09 40 18.5 40 C 14.91 40 12 37.09 12 33.5 C 12 33.33 12.009531 33.17 12.019531 33 L 3.2792969 28.519531 C 4.9692969 38.999531 14.05 47 25 47 C 37.15 47 47 37.15 47 25 C 47 12.85 37.15 3 25 3 z M 31.5 14 C 27.92 14 25 16.92 25 20.5 C 25 24.08 27.92 27 31.5 27 C 35.08 27 38 24.08 38 20.5 C 38 16.92 35.08 14 31.5 14 z M 31.5 16 C 33.99 16 36 18.01 36 20.5 C 36 22.99 33.99 25 31.5 25 C 29.01 25 27 22.99 27 20.5 C 27 18.01 29.01 16 31.5 16 z M 18.5 29 C 17.71 29 16.960313 29.200312 16.320312 29.570312 L 19.640625 31.269531 C 20.870625 31.899531 21.350469 33.410625 20.730469 34.640625 C 20.280469 35.500625 19.41 36 18.5 36 C 18.11 36 17.729375 35.910469 17.359375 35.730469 L 14.029297 34.019531 C 14.289297 36.259531 16.19 38 18.5 38 C 20.99 38 23 35.99 23 33.5 C 23 31.01 20.99 29 18.5 29 z"></path>
                </svg>
              </a>
            ) : null}
            {steamId ? (
              <a
                href={`https://leetify.com/app/profile/${steamId}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] text-sm font-semibold text-white transition hover:border-[#9b6cff]"
                title="Leetify Profile"
              >
                <svg
                  width="192"
                  height="192"
                  viewBox="0 0 192 192"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M73.9185 69.0713L82.7853 27H182.343C187.676 27 192 31.3603 192 36.7391C192 37.4225 191.929 38.1041 191.787 38.7724L167.453 153.726C166.185 159.717 160.936 164 154.861 164L115.137 164L133.363 78.5002C134.26 74.2934 131.605 70.1498 127.434 69.2454C126.9 69.1297 126.356 69.0713 125.81 69.0713H73.9185Z" fill="#BF3B68"></path>
                  <path fillRule="evenodd" clipRule="evenodd" d="M62.9551 76.2187C62.9071 76.3944 62.8637 76.5723 62.8251 76.7522L55.6099 110.406C54.8585 113.911 57.0667 117.366 60.542 118.124C60.989 118.222 61.4451 118.271 61.9025 118.271H84.6352C88.1908 118.271 91.0732 121.178 91.0732 124.764C91.0732 125.221 91.0253 125.676 90.9304 126.123L82.8868 164H9.65702C4.3236 164 0 159.64 0 154.261C0 153.577 0.0713305 152.896 0.212812 152.228L24.5465 37.2744C25.8149 31.2825 31.0636 27 37.1388 27H73.2707L62.9551 76.2187Z" fill="#F84982"></path>
                </svg>
              </a>
            ) : null}
            {faceitProfileUrl ? (
              <a
                href={faceitProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] text-sm font-semibold text-white transition hover:border-[#9b6cff]"
                title="FACEIT Profile"
              >
                <svg
                  height="1520"
                  viewBox="29.3 101.1 451.7 357.9"
                  width="2500"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="m481 104.8c0-1.8-1.9-3.7-1.9-3.7-1.8 0-1.8 0-3.7 1.9-37.5 58.1-76.8 116.2-114.3 176.2h-326.2c-3.7 0-5.6 5.6-1.8 7.5 134.9 50.5 331.7 127.3 440.4 170.4 3.7 1.9 7.5-1.9 7.5-3.7z" fill="#fd5a00"></path>
                  <path d="m481 104.8c0-1.8-1.9-3.7-1.9-3.7-1.8 0-1.8 0-3.7 1.9-37.5 58.1-76.8 116.2-114.3 176.2l119.9 1.23z" fill="#ff690a"></path>
                </svg>
              </a>
            ) : null}
          </div>
          <div className="w-full space-y-3 text-xs text-[rgba(233,228,255,0.7)]">
            <div className="rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] p-3 text-center">
              <div className="text-[rgba(233,228,255,0.5)]">CS2 Hours</div>
              <div className="text-sm font-semibold text-white">
                {hasSteam ? formatHours(cs2?.playtime_forever) : "N/A"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] px-3 py-2 text-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  {faceitLevelBadge && (
                    <Image
                      src={faceitLevelBadge}
                      alt={`FACEIT level ${faceitLevel}`}
                      width={18}
                      height={18}
                    />
                  )}
                  {faceitElo ?? "N/A"}
                </div>
              </div>
              <div className="flex items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] px-3 py-2 text-center">
                {premierBadge ? (
                  <div className="relative">
                    <Image
                      src={premierBadge}
                      alt="Premier Rank"
                      width={72}
                      height={26}
                      className="h-6 w-auto object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center italic">
                      <span className="font-bold text-white drop-shadow-lg">
                        <span className="text-base">
                          {formatPremierParts(leetifyRanks?.premier).main}
                        </span>
                        {formatPremierParts(leetifyRanks?.premier).suffix && (
                          <span className="text-xs">
                            {formatPremierParts(leetifyRanks?.premier).suffix}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-white">N/A</div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2" />
          <ProfileActions
            initialRefreshedAt={initialRefreshedAt ?? Date.now()}
            steamId={steamId}
          />
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div />
            <div className="flex items-center gap-3">
              <ReportOverwatchModal
                steamId={steamId}
                playerName={displayName}
                disabled={Boolean(overwatchBanned)}
                disabledReason="Player is already overwatch banned."
                viewerSteamId={viewerSteamId ?? null}
              />
            </div>
          </div>

          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full justify-between">
              <TabsTrigger value="reputation">Reputation</TabsTrigger>
              {/* Disable when profile is private; later add tooltip + unlock CTA. */}
              <TabsTrigger value="steam" disabled={steamPrivate}>
                Steam
              </TabsTrigger>
              {/* Disable when Leetify is private/unavailable; add privacy prompt later. */}
              <TabsTrigger value="leetify" disabled={leetifyPrivate}>
                Leetify
              </TabsTrigger>
              <TabsTrigger value="faceit">FACEIT</TabsTrigger>
            </TabsList>

            <Card className="space-y-6">
              <TabsContent value="reputation">
                <div className="space-y-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="flex w-full items-center justify-center lg:w-[220px]">
                      <div
                        className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full text-center"
                        style={{
                          background: `conic-gradient(${
                            trustScoreValue < 40 ? "#ff5a7a" : "#47f59d"
                          } ${trustScoreValue * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
                        }}
                      >
                        <div className="absolute inset-[10px] rounded-full bg-[rgba(10,7,20,0.9)]" />
                        <div
                          className={`absolute inset-0 rounded-full ${
                            trustScoreValue < 40
                              ? "shadow-[0_0_24px_rgba(255,90,122,0.35)]"
                              : "shadow-[0_0_24px_rgba(71,245,157,0.35)]"
                          }`}
                        />
                        <div className="relative flex h-full w-full flex-col items-center justify-center">
                        <div className="text-3xl font-semibold text-white">
                          {trustScore === null ? "--" : `${trustScore}%`}
                        </div>
                        <div className="text-xs text-[rgba(233,228,255,0.7)]">
                          Trust Rating
                        </div>
                        <div
                          className={`mt-2 rounded-full px-3 py-0.5 text-[10px] uppercase tracking-widest ${
                            trustScore === null
                              ? "border border-[rgba(155,108,255,0.3)] text-[rgba(233,228,255,0.6)]"
                              : trustScoreValue < 40
                              ? "border border-[#ff5a7a] text-[#ff5a7a]"
                              : "border border-[#47f59d] text-[#47f59d]"
                          }`}
                        >
                          {trustLabel}
                        </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between text-sm text-[rgba(233,228,255,0.7)]">
                        <div className="text-white">Stats Based Analysis</div>
                        <span className="rounded-full border border-[rgba(155,108,255,0.3)] px-2 py-0.5 text-[10px] text-[rgba(233,228,255,0.6)]">
                          Leetify + FACEIT
                        </span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {statsAnalysis.map((stat) => (
                          <div
                            key={stat.label}
                            className="group relative flex items-center gap-3 text-xs text-[rgba(233,228,255,0.7)]"
                          >
                            <div className="w-24 text-[rgba(233,228,255,0.6)]">
                              {stat.label}
                            </div>
                            <div className="flex-1">
                              <div className="h-1.5 w-full rounded-full bg-[rgba(233,228,255,0.08)]">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    stat.status === "flagged"
                                      ? "bg-[#ff5a7a]"
                                      : stat.status === "elevated"
                                      ? "bg-[#ffd35a]"
                                      : "bg-[#47f59d]"
                                  }`}
                                  style={{ width: `${stat.percent}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-16 text-right text-white">
                              {stat.display}
                            </div>
                            {stat.status !== "normal" ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                                  stat.status === "flagged"
                                    ? "text-[#ff5a7a]"
                                    : "text-[#ffd35a]"
                                }`}
                              >
                                {stat.status}
                              </span>
                            ) : null}
                            <div className="pointer-events-none absolute -top-28 right-0 hidden w-44 rounded-lg border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.98)] p-3 text-[11px] text-[rgba(233,228,255,0.8)] shadow-lg group-hover:block">
                              <div className="text-xs font-semibold text-white">
                                {stat.label}
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[rgba(233,228,255,0.6)]">Raw:</span>
                                <span className="text-white">
                                  {stat.rawDelta === null
                                    ? "N/A"
                                    : `${stat.rawDelta >= 0 ? "+" : ""}${stat.rawDelta}%`}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[rgba(233,228,255,0.6)]">Final:</span>
                                <span
                                  className={
                                    stat.rawDelta === null
                                      ? "text-white"
                                      : stat.rawDelta < 0
                                      ? "text-[#ff5a7a]"
                                      : "text-[#47f59d]"
                                  }
                                >
                                  {stat.rawDelta === null
                                    ? "N/A"
                                    : `${stat.rawDelta >= 0 ? "+" : ""}${stat.rawDelta}%`}
                                </span>
                              </div>
                              {stat.status !== "normal" && stat.severity !== null ? (
                                <>
                                  <div className="mt-2 text-[#ff5a7a]">
                                    &#9888; {stat.status === "flagged" ? "Flagged" : "Elevated"} metric
                                  </div>
                                  <div className="mt-1 text-[rgba(233,228,255,0.6)]">
                                    Severity: {stat.severity}%
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-white">Anomalies Detected</div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Card className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <CardTitle>Rank Mismatch</CardTitle>
                          <CardDescription>
                            
                          </CardDescription>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            rankMismatch === null
                              ? "border border-[rgba(155,108,255,0.3)] text-[rgba(233,228,255,0.6)]"
                              : rankMismatch
                              ? "border border-[#ff5a7a] text-[#ff5a7a]"
                              : "border border-[#47f59d] text-[#47f59d]"
                          }`}
                        >
                          {rankMismatch === null
                            ? "N/A"
                            : rankMismatch
                            ? "Mismatch"
                            : "Aligned"}
                        </span>
                      </Card>
                      <Card className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <CardTitle>High Skill FACEIT Inactivity</CardTitle>
                          <CardDescription>
                            
                          </CardDescription>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            highSkillInactivityScore > 0
                              ? "border border-[#ff5a7a] text-[#ff5a7a]"
                              : "border border-[#47f59d] text-[#47f59d]"
                          }`}
                        >
                          {highSkillInactivityScore > 0
                            ? `${highSkillInactivityScore}%`
                            : "Normal"}
                        </span>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-white">Account Reputation</div>
                    <div className="grid gap-3 lg:grid-cols-5">
                      <Card className="group relative space-y-1">
                        <CardDescription>Account Age</CardDescription>
                        <div className="text-lg font-semibold text-white">
                          {accountAge}
                        </div>
                        <div className="pointer-events-none absolute -top-10 right-3 hidden rounded-md border border-[rgba(155,108,255,0.3)] bg-[rgba(10,7,20,0.95)] px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                          <div>Bonus: {accountAgeBonus ?? 0}%</div>
                          <div>
                            Score: {accountAgeScore ?? 0}
                            /100
                          </div>
                        </div>
                      </Card>
                      <Card className="group relative space-y-1">
                        <CardDescription>CS2 Hours</CardDescription>
                        <div className="text-lg font-semibold text-white">
                          {formatHours(cs2?.playtime_forever)}h
                        </div>
                        <div className="pointer-events-none absolute -top-10 right-3 hidden rounded-md border border-[rgba(155,108,255,0.3)] bg-[rgba(10,7,20,0.95)] px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                          <div>Bonus: {cs2HoursBonus ?? 0}%</div>
                          <div>
                            Score: {cs2HoursScore ?? 0}
                            /100
                          </div>
                        </div>
                      </Card>
                      <Card className="space-y-1">
                        <CardDescription>Inventory Value</CardDescription>
                        <div className="text-lg font-semibold text-white">N/A</div>
                      </Card>
                      <Card className="group relative space-y-1">
                        <CardDescription>Steam Level</CardDescription>
                        <div className="text-lg font-semibold text-white">
                          {steamLevel ?? "N/A"}
                        </div>
                        <div className="pointer-events-none absolute -top-10 right-3 hidden rounded-md border border-[rgba(155,108,255,0.3)] bg-[rgba(10,7,20,0.95)] px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
                          <div>Bonus: {steamLevelBonus ?? 0}%</div>
                          <div>
                            Score: {steamLevelScore ?? 0}
                            /100
                          </div>
                        </div>
                      </Card>
                      <Card className="space-y-1">
                        <CardDescription>Collectibles</CardDescription>
                        <div className="text-lg font-semibold text-white">N/A</div>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="steam">
                <div className="grid gap-4 lg:grid-cols-4">
                  <Card className="space-y-2">
                    <CardDescription>Status</CardDescription>
                    <div className="text-2xl font-semibold text-white">
                      {personaLabel}
                    </div>
                    <div className="text-xs text-[rgba(233,228,255,0.6)]">
                      Last online: {lastOnline}
                    </div>
                  </Card>
                  <Card className="space-y-2">
                    <CardDescription>Friends</CardDescription>
                    <div className="text-2xl font-semibold text-white">
                      {steamFriendsCount ?? "N/A"}
                    </div>
                    <div className="text-xs text-[rgba(233,228,255,0.6)]">
                      Public profiles only
                    </div>
                  </Card>
                  <Card className="space-y-2">
                    <CardDescription>Recent Playtime</CardDescription>
                    <div className="text-2xl font-semibold text-white">
                      {steamRecentGames?.length
                        ? `${Math.round(
                            (steamRecentGames[0]?.playtime_2weeks ?? 0) / 60
                          )}h`
                        : "N/A"}
                    </div>
                    <div className="text-xs text-[rgba(233,228,255,0.6)]">
                      Last 2 weeks
                    </div>
                  </Card>
                  <Card className="space-y-2">
                    <CardDescription>Steam Level</CardDescription>
                    <div className="text-2xl font-semibold text-white">
                      {steamLevel ?? "N/A"}
                    </div>
                    <div className="text-xs text-[rgba(233,228,255,0.6)]">
                      Current level
                    </div>
                  </Card>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <Card className="space-y-2">
                    <CardTitle>Steam Profile</CardTitle>
                    <CardDescription>
                      Avatar, join date, and profile details.
                    </CardDescription>
                    <div className="mt-3 space-y-2 text-sm text-[rgba(233,228,255,0.7)]">
                      <div>Steam ID: {steamId ?? "Unknown"}</div>
                      <div>Profile: {hasSteam ? steamProfileUrl : "N/A"}</div>
                      <div>Current Status: {hasSteam ? gameStatus : "N/A"}</div>
                      {errors?.steam && (
                        <div className="text-[#56d1ff]">
                          Steam error: {errors.steam}
                        </div>
                      )}
                    </div>
                  </Card>
                  <Card className="space-y-2">
                    <CardTitle>Recent Games</CardTitle>
                    <CardDescription>Last 2 weeks activity.</CardDescription>
                    <div className="mt-3 space-y-3 text-sm text-[rgba(233,228,255,0.7)]">
                      {steamRecentGames?.length ? (
                        steamRecentGames.map((game) => (
                          <div key={game.appid} className="flex items-center justify-between">
                            <div className="font-semibold text-white">{game.name ?? "Unknown"}</div>
                            <div>{Math.round((game.playtime_2weeks ?? 0) / 60)}h</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-[rgba(233,228,255,0.6)]">N/A</div>
                      )}
                    </div>
                  </Card>
                  <Card className="space-y-2">
                    <CardTitle>CS2 Inventory</CardTitle>
                    <CardDescription>Market value, pins, and collectibles.</CardDescription>
                    <div className="grid grid-cols-2 gap-3 text-sm text-[rgba(233,228,255,0.7)]">
                      <div>Value: N/A</div>
                      <div>Medals: N/A</div>
                      <div>Pins: N/A</div>
                    </div>
                  </Card>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <Card className="space-y-2">
                    <CardTitle>Commends</CardTitle>
                    <CardDescription>Friendly / Teacher / Leader.</CardDescription>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {hasSteamCommends ? (
                        <>
                          <ProgressRing value={64} label="Friendly" />
                          <ProgressRing value={48} label="Teacher" />
                          <ProgressRing value={71} label="Leader" />
                        </>
                      ) : (
                        <div className="col-span-3 text-xs text-[rgba(233,228,255,0.6)]">
                          N/A
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="leetify">
              <div className="grid gap-4 lg:grid-cols-5">
                <Card className="space-y-2">
                  <CardDescription>Rating</CardDescription>
                  <div className={`text-2xl font-semibold ${valueColor(leetifyRanks?.leetify ?? undefined, 0.5)}`}>
                    {hasLeetify ? formatNumber(leetifyRanks?.leetify ?? undefined, 2) : "N/A"}
                  </div>
                </Card>
                <Card className="space-y-2">
                  <CardDescription>Premier</CardDescription>
                  <div className="text-2xl font-semibold text-white">
                    {hasLeetify && leetifyRanks?.premier != null
                      ? leetifyRanks.premier.toLocaleString()
                      : "N/A"}
                  </div>
                </Card>
                <Card className="space-y-2">
                  <CardDescription>Win Rate</CardDescription>
                  <div className={`text-2xl font-semibold ${valueColor(leetifyWinrate ?? undefined, 0.5)}`}>
                    {hasLeetify ? formatPercent(leetifyWinrate, true) : "N/A"}
                  </div>
                </Card>
                <Card className="space-y-2">
                  <CardDescription>HS%</CardDescription>
                  <div className={`text-2xl font-semibold ${valueColor(leetifyStats?.accuracy_head ?? undefined, 20)}`}>
                    {hasLeetify ? formatPercent(leetifyStats?.accuracy_head) : "N/A"}
                  </div>
                </Card>
                <Card className="space-y-2">
                  <CardDescription>Matches</CardDescription>
                  <div className="text-2xl font-semibold text-white">
                    {hasLeetify ? leetifyMatches?.toLocaleString() ?? "N/A" : "N/A"}
                  </div>
                </Card>
              </div>
              {errors?.leetify && (
                <div className="mt-4 rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.6)] p-3 text-xs text-[#56d1ff]">
                  Leetify error: {errors.leetify}
                </div>
              )}

              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <Card className="space-y-3">
                  <CardTitle>Rating Breakdown</CardTitle>
                  {hasLeetify ? (
                    <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                      <div>Aim: {formatNumber(leetifyRating?.aim)}</div>
                      <div>Positioning: {formatNumber(leetifyRating?.positioning)}</div>
                      <div>Utility: {formatNumber(leetifyRating?.utility)}</div>
                      <div>Clutch: {formatNumber(leetifyRating?.clutch)}</div>
                    </div>
                  ) : (
                    <Skeleton className="h-16 w-full" />
                  )}
                </Card>
                <Card className="space-y-3">
                  <CardTitle>Accuracy</CardTitle>
                  {hasLeetify ? (
                    <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                      <div>Enemy Spotted: {formatPercent(leetifyStats?.accuracy_enemy_spotted)}</div>
                      <div>Headshot Accuracy: {formatPercent(leetifyStats?.accuracy_head)}</div>
                      <div>Preaim: {formatNumber(leetifyStats?.preaim)}</div>
                      <div>Time to Damage: {leetifyStats?.reaction_time_ms ? `${Math.round(leetifyStats.reaction_time_ms)}ms` : "N/A"}</div>
                    </div>
                  ) : (
                    <Skeleton className="h-16 w-full" />
                  )}
                </Card>
                <Card className="space-y-3">
                  <CardTitle>Opening Duels</CardTitle>
                  {hasLeetify ? (
                    <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                      <div>
                        T Opening Success:{" "}
                        {formatPercent(leetifyStats?.t_opening_duel_success_percentage)}
                      </div>
                      <div>
                        CT Opening Success:{" "}
                        {formatPercent(leetifyStats?.ct_opening_duel_success_percentage)}
                      </div>
                      <div>
                        Opening Rating: {formatNumber(leetifyRating?.opening, 2)}
                      </div>
                      <div>
                        Time to Damage:{" "}
                        {leetifyStats?.reaction_time_ms
                          ? `${Math.round(leetifyStats.reaction_time_ms)}ms`
                          : "N/A"}
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-16 w-full" />
                  )}
                </Card>
                <Card className="space-y-3">
                  <CardTitle>Recent Form</CardTitle>
                  {hasLeetify ? (
                    <div className="flex flex-wrap gap-2">
                      {leetifyRecentForm.map((result, index) => (
                        <span
                          key={`form-${index}`}
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
                  ) : (
                    <Skeleton className="h-16 w-full" />
                  )}
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
                      <div>Flashbangs Thrown: {formatNumber(leetifyStats?.flashbang_thrown)}</div>
                      <div>HE Damage (Foe): {formatNumber(leetifyStats?.he_foes_damage_avg)}</div>
                      <div>Flash Hit Foe/Flash: {formatNumber(leetifyStats?.flashbang_hit_foe_per_flashbang)}</div>
                      <div>HE Damage (Team): {formatNumber(leetifyStats?.he_friends_damage_avg)}</div>
                      <div>Flash Avg Duration: {formatNumber(leetifyStats?.flashbang_hit_foe_avg_duration)}s</div>
                      <div>Utility on Death: {formatNumber(leetifyStats?.utility_on_death_avg)}</div>
                      <div>Flash to Kill: {formatNumber(leetifyStats?.flashbang_leading_to_kill)}</div>
                      <div>Flash Team Hit: {formatNumber(leetifyStats?.flashbang_hit_friend_per_flashbang)}</div>
                    </div>
                  </Card>
                  <Card className="space-y-3">
                    <CardTitle>Trading Stats</CardTitle>
                    <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                      <div>Trade Kill Success: {formatPercent(leetifyStats?.trade_kills_success_percentage)}</div>
                      <div>Trade Opps/Round: {formatNumber(leetifyStats?.trade_kill_opportunities_per_round, 2)}</div>
                      <div>Traded Death Success: {formatPercent(leetifyStats?.traded_deaths_success_percentage)}</div>
                    </div>
                  </Card>
                  <Card className="space-y-3">
                    <CardTitle>Movement & Mechanics</CardTitle>
                    <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                      <div>Counter-Strafe Good: {formatPercent(leetifyStats?.counter_strafing_good_shots_ratio)}</div>
                      <div>T Opening Aggression: {formatPercent(leetifyStats?.t_opening_aggression_success_rate)}</div>
                      <div>CT Opening Aggression: {formatPercent(leetifyStats?.ct_opening_aggression_success_rate)}</div>
                    </div>
                  </Card>
                  <Card className="space-y-3">
                    <CardTitle>Terrorist Side</CardTitle>
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#ff5a7a ${ratingToPercent(
                            leetifyRating?.t_leetify
                          )}%, rgba(255,255,255,0.15) 0)`,
                        }}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(10,7,20,0.9)] text-xs font-semibold text-white">
                          {formatNumber(leetifyRating?.t_leetify, 2)}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-[rgba(233,228,255,0.7)]">
                        <div>
                          Opening Success:{" "}
                          {formatPercent(leetifyStats?.t_opening_duel_success_percentage)}
                        </div>
                        <div>
                          Aggression Success:{" "}
                          {formatPercent(leetifyStats?.t_opening_aggression_success_rate)}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className="space-y-3">
                    <CardTitle>Counter-Terrorist Side</CardTitle>
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#56d1ff ${ratingToPercent(
                            leetifyRating?.ct_leetify
                          )}%, rgba(255,255,255,0.15) 0)`,
                        }}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(10,7,20,0.9)] text-xs font-semibold text-white">
                          {formatNumber(leetifyRating?.ct_leetify, 2)}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-[rgba(233,228,255,0.7)]">
                        <div>
                          Opening Success:{" "}
                          {formatPercent(leetifyStats?.ct_opening_duel_success_percentage)}
                        </div>
                        <div>
                          Aggression Success:{" "}
                          {formatPercent(leetifyStats?.ct_opening_aggression_success_rate)}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className="space-y-3">
                    <CardTitle>Account Information</CardTitle>
                    <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(233,228,255,0.7)]">
                      <div>First Match: {leetifyFirstMatch ? new Date(leetifyFirstMatch).toLocaleDateString() : "N/A"}</div>
                      <div>Total Matches: {leetifyMatches?.toLocaleString() ?? "N/A"}</div>
                    </div>
                  </Card>
                </div>
              </details>

              </TabsContent>

              <TabsContent value="faceit">
                <FaceitStats
                  faceitProfile={faceitProfileData}
                  statsCs2={faceitStatsCs2}
                  statsCsgo={faceitStatsCsgo}
                  historyCs2={faceitHistoryCs2}
                  historyCsgo={faceitHistoryCsgo}
                  hubs={faceitHubs}
                  teams={faceitTeams}
                  tournaments={faceitTournaments}
                />
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </section>
      <Card className="space-y-3">
        <CardTitle>Recent Matches</CardTitle>
        <CardDescription>
          Combined Leetify matches with source indicators.
        </CardDescription>
        <HorizontalScroll className="flex gap-3">
          {combinedMatches.length === 0 ? (
            <div className="min-w-[220px] rounded-2xl border border-[rgba(155,108,255,0.3)] p-4 text-xs text-[rgba(233,228,255,0.6)]">
              N/A
            </div>
          ) : (
            combinedMatches.slice(0, 30).map((match) => {
              const dataSource = String(match.data_source ?? "unknown");
              const rankTypeRaw = match.rank_type ?? null;
              const rankType =
                typeof rankTypeRaw === "number"
                  ? rankTypeRaw
                  : Number.isNaN(Number(rankTypeRaw))
                  ? null
                  : Number(rankTypeRaw);
              const label =
                rankType === 11
                  ? "Premier"
                  : rankType === 12
                  ? "Competitive"
                  : rankType === 7
                  ? "Wingman"
                  : dataSource === "matchmaking"
                  ? "Premier"
                  : dataSource === "matchmaking_competitive"
                  ? "Competitive"
                  : dataSource === "matchmaking_wingman"
                  ? "Wingman"
                  : dataSource === "faceit"
                  ? "FACEIT"
                  : dataSource.toUpperCase();
              const dataSourceMatchId = String(match.data_source_match_id ?? "");
              const matchId = String(match.id ?? "");
              const matchUrl =
                dataSourceMatchId && dataSource !== "unknown"
                  ? `/match/${encodeURIComponent(dataSource)}/${encodeURIComponent(
                      dataSourceMatchId
                    )}`
                  : matchId
                  ? `/match/leetify/${encodeURIComponent(matchId)}`
                  : undefined;
                      const rawMapName = String(match.map_name ?? "unknown").toLowerCase();
                      const mapImage = rawMapName.startsWith("de_") || rawMapName.startsWith("cs_")
                        ? `/map-previews/${rawMapName}.webp`
                        : null;
              return matchUrl ? (
                <Link
                  key={`${match.id}-${dataSource}`}
                  href={matchUrl}
                  className="relative min-w-[220px] overflow-hidden rounded-2xl border border-[rgba(155,108,255,0.3)] bg-[rgba(15,12,30,0.55)] px-4 py-3 text-xs text-[rgba(233,228,255,0.7)] transition hover:border-[#9b6cff]"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(90,70,160,0.35),_rgba(10,8,20,0.9))]" />
                  {mapImage ? (
                    <>
                      <MapPreviewImage src={mapImage} alt={rawMapName} />
                      <div className="absolute inset-0 bg-[rgba(8,6,16,0.7)]" />
                    </>
                  ) : null}
                  <div className="relative">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(155,108,255,0.4)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#9b6cff]">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {formatMapName(String(match.map_name ?? "UNKNOWN"))}
                    </span>
                  </div>
                  <div className="mt-2 text-[rgba(233,228,255,0.5)]">
                    {String(match.outcome ?? "").toUpperCase()}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {Array.isArray(match.score)
                      ? `${match.score[0]}-${match.score[1]}`
                      : "N/A"}
                  </div>
                          </div>
                </Link>
              ) : (
                <div
                  key={`${match.id}-${dataSource}-na`}
                  className="relative min-w-[220px] overflow-hidden rounded-2xl border border-[rgba(155,108,255,0.2)] bg-[rgba(15,12,30,0.4)] px-4 py-3 text-xs text-[rgba(233,228,255,0.5)]"
                >
                  <div className="relative">
                    Match details unavailable
                  </div>
                </div>
              );
            })
          )}
        </HorizontalScroll>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfileTemplate />;
}

