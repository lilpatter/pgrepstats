import Link from "next/link";
import { Flag, Search, ShieldAlert } from "lucide-react";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ReportOverwatchModal } from "@/components/profile/ReportOverwatchModal";
import { getEnv } from "@/lib/env";

type ReportRow = {
  id: number;
  target_steam_id: string;
  target_persona_name?: string | null;
  reporter_steam_id: string;
  reporter_persona_name?: string | null;
  cheat_type?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type MatchStat = {
  steam64_id?: string;
};

type MatchDetails = {
  stats?: MatchStat[];
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

async function buildOpponentSet(steamId: string) {
  const apiKey = process.env.LEETIFY_API_KEY;
  const rawBaseUrl = getEnv(
    "LEETIFY_BASE_URL",
    "https://api-public.cs-prod.leetify.com"
  );
  const baseUrl = rawBaseUrl.includes("api.leetify.com")
    ? "https://api-public.cs-prod.leetify.com"
    : rawBaseUrl;
  if (!apiKey) return new Set<string>();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    _leetify_key: apiKey,
  };

  const profileUrl = `${baseUrl}/v3/profile?steam64_id=${steamId}`;
  const profileRes = await fetch(profileUrl, { headers, next: { revalidate: 300 } });
  if (!profileRes.ok) return new Set<string>();
  const profile = (await profileRes.json()) as {
    recent_matches?: Array<{
      data_source?: string;
      data_source_match_id?: string;
    }>;
  };
  const recent = profile.recent_matches ?? [];
  const matchIds = recent
    .slice(0, 6)
    .map((match) => ({
      source: match.data_source ?? null,
      id: match.data_source_match_id ?? null,
    }))
    .filter((item) => item.source && item.id) as Array<{
    source: string;
    id: string;
  }>;

  const opponents = new Set<string>();
  const matchResponses = await Promise.allSettled(
    matchIds.map(async (match) => {
      const url = `${baseUrl}/v2/matches/${match.source}/${match.id}`;
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (!res.ok) return null;
      return (await res.json()) as MatchDetails;
    })
  );
  matchResponses.forEach((result) => {
    if (result.status === "fulfilled" && result.value?.stats) {
      result.value.stats.forEach((stat) => {
        if (stat.steam64_id && stat.steam64_id !== steamId) {
          opponents.add(stat.steam64_id);
        }
      });
    }
  });

  return opponents;
}

export default async function ReportedPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const session = await getSteamSession();
  const params = await searchParams;
  const tab = params.tab ?? "pending";
  const page = Math.max(0, (Number(params.page) || 1) - 1);
  const pageSize = 10;
  const supabase = createSupabaseServerClient();
  const reports: ReportRow[] = [];
  let total = 0;
  let pending = 0;
  let approved = 0;
  let declined = 0;

  if (supabase) {
    const { count: totalCount } = await supabase
      .from("overwatch_reports")
      .select("id", { count: "exact", head: true });
    total = totalCount ?? 0;

    const { count: pendingCount } = await supabase
      .from("overwatch_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pending = pendingCount ?? 0;

    const { count: approvedCount } = await supabase
      .from("overwatch_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    approved = approvedCount ?? 0;

    const { count: declinedCount } = await supabase
      .from("overwatch_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "declined");
    declined = declinedCount ?? 0;

    const from = page * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from("overwatch_reports")
      .select(
        "id, target_steam_id, target_persona_name, reporter_steam_id, reporter_persona_name, cheat_type, created_at, status"
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (tab === "pending") query = query.eq("status", "pending");
    if (tab === "approved") query = query.eq("status", "approved");
    if (tab === "declined") query = query.eq("status", "declined");
    if (tab === "mine" && session?.steamId) {
      query = query.eq("reporter_steam_id", session.steamId);
    }
    if (tab === "against" && session?.steamId) {
      query = query.eq("target_steam_id", session.steamId);
    }

    const { data } = await query;
    if (data) reports.push(...(data as ReportRow[]));
  }

  const opponentSet = session?.steamId
    ? await buildOpponentSet(session.steamId)
    : new Set<string>();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.65)]">
          <ShieldAlert className="h-3.5 w-3.5 text-[#ff8c40]" />
          Community Reports
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Reported Players
        </h1>
        <p className="mt-2 text-sm text-[rgba(233,228,255,0.6)]">
          Track players reported for cheating through our community-driven
          Overwatch system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#ff8c40]">{total}</CardTitle>
          <CardDescription>Total Reports</CardDescription>
        </Card>
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#ffd35a]">{pending}</CardTitle>
          <CardDescription>Pending Review</CardDescription>
        </Card>
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#ff5a7a]">{approved}</CardTitle>
          <CardDescription>Convicted</CardDescription>
        </Card>
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#47f59d]">{declined}</CardTitle>
          <CardDescription>Insufficient Evidence</CardDescription>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(12,9,24,0.6)] px-3 py-2 text-xs text-[rgba(233,228,255,0.6)]">
            <Search className="h-4 w-4" />
            Search disabled for pending cases
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[
            { key: "pending", label: "Pending", count: pending },
            { key: "approved", label: "Convicted", count: approved },
            { key: "declined", label: "Insufficient", count: declined },
            { key: "mine", label: "My Reports", count: 0 },
            { key: "against", label: "Against Me", count: 0 },
          ].map((item) => (
            <Link
              key={item.key}
              href={`/reported-players?tab=${item.key}`}
              className={`rounded-full border px-3 py-1 ${
                tab === item.key
                  ? "border-[rgba(155,108,255,0.45)] bg-[rgba(20,16,40,0.6)] text-white"
                  : "border-[rgba(155,108,255,0.25)] text-[rgba(233,228,255,0.6)]"
              }`}
            >
              {item.label}{" "}
              <span className="ml-2 rounded-full border border-[rgba(155,108,255,0.25)] px-2 py-0.5 text-[10px]">
                {item.count}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-[rgba(233,228,255,0.75)]">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
              <tr>
                <th className="py-2 pr-4">Player</th>
                <th className="py-2 pr-4">Reported</th>
                <th className="py-2 pr-4">Reported By</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Cheat Type</th>
                <th className="py-2">Report</th>
              </tr>
            </thead>
            <tbody>
              {reports.length ? (
                reports.map((report) => {
                  const playedAgainst = opponentSet.has(report.target_steam_id);
                  return (
                    <tr
                      key={report.id}
                      className="border-t border-[rgba(155,108,255,0.15)]"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/profile/${report.target_steam_id}`}
                          className="flex flex-col"
                        >
                          <span className="text-white">
                            {report.target_persona_name ?? "Unknown"}
                          </span>
                          <span className="font-mono text-[rgba(233,228,255,0.5)]">
                            {report.target_steam_id}
                          </span>
                          {playedAgainst ? (
                            <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#ff8c40]">
                              Played Against You
                            </span>
                          ) : null}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        {formatRelative(report.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="text-white">
                            {report.reporter_persona_name ?? "Unknown"}
                          </span>
                          <span className="font-mono text-[rgba(233,228,255,0.5)]">
                            {report.reporter_steam_id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[rgba(233,228,255,0.6)]">
                        {report.status ?? "pending"}
                      </td>
                      <td className="py-3 pr-4 text-[rgba(233,228,255,0.6)]">
                        {report.cheat_type ?? "N/A"}
                      </td>
                      <td className="py-3">
                        <ReportOverwatchModal
                          steamId={report.target_steam_id}
                          playerName={report.target_persona_name ?? null}
                          disabled={false}
                          viewerSteamId={session?.steamId ?? null}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-[rgba(233,228,255,0.6)]"
                  >
                    No reported players found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

