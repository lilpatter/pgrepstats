import { Flag, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getEnv } from "@/lib/env";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { AiFlagsTable } from "@/components/ai-flags/AiFlagsTable";

type AutoFlagRow = {
  steam_id: string;
  persona_name?: string | null;
  avatar_url?: string | null;
  trust_rating?: number | null;
  auto_flagged_at?: string | null;
  premier_rating?: number | null;
  faceit_level?: number | null;
  faceit_elo?: number | null;
  premier_updated_at?: string | null;
  faceit_updated_at?: string | null;
};

type PlayerRanks = {
  premier?: number | null;
};

type PlayerProfile = {
  ranks?: PlayerRanks;
};

type FaceitProfile = {
  games?: {
    cs2?: {
      skill_level?: number;
      faceit_elo?: number;
    };
  };
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export default async function AiFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const profiles: AutoFlagRow[] = [];
  const pageSize = 10;
  const params = await searchParams;
  const page = Math.max(0, (Number(params.page) || 1) - 1);
  let totalCount = 0;
  if (supabase) {
    const { count } = await supabase
      .from("pgrep_profiles")
      .select("steam_id", { count: "exact", head: true })
      .not("auto_flagged_at", "is", null);
    totalCount = count ?? 0;

    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data } = await supabase
      .from("pgrep_profiles")
      .select(
        "steam_id, persona_name, avatar_url, trust_rating, auto_flagged_at, premier_rating, faceit_level, faceit_elo, premier_updated_at, faceit_updated_at"
      )
      .not("auto_flagged_at", "is", null)
      .order("auto_flagged_at", { ascending: false })
      .range(from, to);
    if (data) profiles.push(...(data as AutoFlagRow[]));
  }

  const total = totalCount;
  const active = totalCount;
  const steamIds = profiles.map((row) => row.steam_id);
  const leetifyRanks = new Map<string, number | null>();
  const faceitRanks = new Map<
    string,
    { level?: number | null; elo?: number | null }
  >();

  if (steamIds.length) {
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

    const leetifyTargets = profiles.filter((row) => {
      const updatedAt = row.premier_updated_at
        ? new Date(row.premier_updated_at).getTime()
        : 0;
      return !updatedAt || Date.now() - updatedAt > CACHE_TTL_MS;
    });
    await Promise.allSettled(
      leetifyTargets.map(async (row) => {
        const url = `${baseUrl}/v3/profile?steam64_id=${row.steam_id}`;
        const res = await fetch(url, { headers, next: { revalidate: 300 } });
        if (res.status === 404) {
          leetifyRanks.set(row.steam_id, null);
          return;
        }
        if (!res.ok) return;
        const payload = (await res.json()) as PlayerProfile;
        leetifyRanks.set(row.steam_id, payload?.ranks?.premier ?? null);
      })
    );

    const faceitKey = process.env.FACEIT_SERVER_API_KEY;
    if (faceitKey) {
      const faceitTargets = profiles.filter((row) => {
        const updatedAt = row.faceit_updated_at
          ? new Date(row.faceit_updated_at).getTime()
          : 0;
        return !updatedAt || Date.now() - updatedAt > CACHE_TTL_MS;
      });
      await Promise.allSettled(
        faceitTargets.map(async (row) => {
          const url = `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${row.steam_id}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${faceitKey}` },
            next: { revalidate: 300 },
          });
          if (!res.ok) return;
          const payload = (await res.json()) as FaceitProfile;
          const cs2 = payload?.games?.cs2;
          if (cs2) {
            faceitRanks.set(row.steam_id, {
              level: cs2.skill_level ?? null,
              elo: cs2.faceit_elo ?? null,
            });
          }
        })
      );
    }

    if (supabase) {
      const nowIso = new Date().toISOString();
      await Promise.allSettled(
        profiles.map(async (row) => {
          const premier = leetifyRanks.get(row.steam_id);
          const faceit = faceitRanks.get(row.steam_id);
          if (premier !== undefined) {
            row.premier_rating = premier ?? null;
            row.premier_updated_at = nowIso;
          }
          if (faceit) {
            row.faceit_level = faceit.level ?? null;
            row.faceit_elo = faceit.elo ?? null;
            row.faceit_updated_at = nowIso;
          }
          if (premier !== undefined || faceit) {
            await supabase
              .from("pgrep_profiles")
              .upsert(
                {
                  steam_id: row.steam_id,
                  premier_rating: row.premier_rating ?? null,
                  premier_updated_at: row.premier_updated_at ?? null,
                  faceit_level: row.faceit_level ?? null,
                  faceit_elo: row.faceit_elo ?? null,
                  faceit_updated_at: row.faceit_updated_at ?? null,
                },
                { onConflict: "steam_id" }
              );
          }
        })
      );
    }
  }

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
        <AiFlagsTable profiles={profiles} pageSize={pageSize} page={page} total={total} />
      </Card>
    </div>
  );
}

