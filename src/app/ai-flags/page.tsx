import Link from "next/link";
import { Flag, Search, ShieldAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type AutoFlagRow = {
  steam_id: string;
  persona_name?: string | null;
  avatar_url?: string | null;
  trust_rating?: number | null;
  auto_flagged_at?: string | null;
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

export default async function AiFlagsPage() {
  const supabase = createSupabaseServerClient();
  const profiles: AutoFlagRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("pgrep_profiles")
      .select("steam_id, persona_name, avatar_url, trust_rating, auto_flagged_at")
      .not("auto_flagged_at", "is", null)
      .order("auto_flagged_at", { ascending: false })
      .limit(200);
    if (data) profiles.push(...(data as AutoFlagRow[]));
  }

  const total = profiles.length;
  const active = profiles.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.65)]">
          <Flag className="h-3.5 w-3.5 text-[#ff5a7a]" />
          Trust System
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Autoflagged Players
        </h1>
        <p className="mt-2 text-sm text-[rgba(233,228,255,0.6)]">
          Players automatically flagged by the trust rating system for
          suspicious activity patterns.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#ff5a7a]">{total}</CardTitle>
          <CardDescription>Total Autoflags</CardDescription>
        </Card>
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#ff5a7a]">{active}</CardTitle>
          <CardDescription>Active Autoflags</CardDescription>
        </Card>
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[rgba(233,228,255,0.6)]">
            0
          </CardTitle>
          <CardDescription>Expired Autoflags</CardDescription>
        </Card>
        <Card className="space-y-2 p-4 text-center">
          <CardTitle className="text-2xl text-[#ffd35a]">0</CardTitle>
          <CardDescription>Under Review</CardDescription>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[rgba(233,228,255,0.4)]" />
            <input
              className="w-full rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(12,9,24,0.6)] py-2 pl-9 pr-3 text-xs text-[rgba(233,228,255,0.8)]"
              placeholder="Search by name or SteamID..."
              disabled
            />
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(12,9,24,0.6)] px-3 py-2 text-xs text-[rgba(233,228,255,0.6)]">
              Date Range
            </div>
            <div className="rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(12,9,24,0.6)] px-3 py-2 text-xs text-[rgba(233,228,255,0.6)]">
              Premier Rank
            </div>
            <div className="rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(12,9,24,0.6)] px-3 py-2 text-xs text-[rgba(233,228,255,0.6)]">
              FACEIT Rank
            </div>
          </div>
        </div>

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
              {profiles.length ? (
                profiles.slice(0, 20).map((profile) => (
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
                    <td className="py-3 pr-4 text-[rgba(233,228,255,0.5)]">
                      --
                    </td>
                    <td className="py-3 pr-4 text-[rgba(233,228,255,0.5)]">
                      --
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
      </Card>
    </div>
  );
}

