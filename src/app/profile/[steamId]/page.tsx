import { ProfileTemplate } from "@/app/profile/page";
import { getEnv } from "@/lib/env";
import { getSteamSession } from "@/lib/steam-auth";
import { trackProfileView } from "@/lib/track";
import { createSupabaseServerClient } from "@/lib/supabase";

type SteamProfile = {
  personaname?: string;
  avatarfull?: string;
  profileurl?: string;
  timecreated?: number;
  gameextrainfo?: string;
  lastlogoff?: number;
  personastate?: number;
};

type SteamGame = {
  playtime_forever?: number;
};

type SteamRecentGame = {
  appid?: number;
  name?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
  img_icon_url?: string;
};

async function fetchSteamProfile(steamId: string) {
  const apiKey = getEnv("STEAM_WEB_API_KEY");
  const summaryRes = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
    { next: { revalidate: 60 } }
  );
  if (!summaryRes.ok) {
    throw new Error("Steam profile fetch failed.");
  }
  const summaryData = await summaryRes.json();
  const profile = summaryData?.response?.players?.[0] as SteamProfile | undefined;

  const gamesRes = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&appids_filter[0]=730&include_appinfo=true`,
    { next: { revalidate: 300 } }
  );
  const gamesData = gamesRes.ok ? await gamesRes.json() : null;
  const cs2 = (gamesData?.response?.games?.[0] as SteamGame) ?? null;

  let friendsCount: number | null = null;
  try {
    const friendsRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamId}&relationship=friend`,
      { next: { revalidate: 300 } }
    );
    if (friendsRes.ok) {
      const friendsData = await friendsRes.json();
      const friends = friendsData?.friendslist?.friends as Array<unknown> | undefined;
      friendsCount = friends ? friends.length : null;
    }
  } catch {
    friendsCount = null;
  }

  let recentGames: SteamRecentGame[] = [];
  try {
    const recentRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=4`,
      { next: { revalidate: 300 } }
    );
    if (recentRes.ok) {
      const recentData = await recentRes.json();
      recentGames = (recentData?.response?.games as SteamRecentGame[]) ?? [];
    }
  } catch {
    recentGames = [];
  }

  let steamLevel: number | null = null;
  try {
    const levelRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${apiKey}&steamid=${steamId}`,
      { next: { revalidate: 300 } }
    );
    if (levelRes.ok) {
      const levelData = await levelRes.json();
      steamLevel = levelData?.response?.player_level ?? null;
    }
  } catch {
    steamLevel = null;
  }

  return {
    profile: profile ?? null,
    cs2,
    steamLevel,
    friendsCount,
    recentGames,
  };
}

async function fetchLeetifyProfile(steamId: string) {
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

  const profileUrl = `${baseUrl}/v3/profile?steam64_id=${steamId}`;
  const res = await fetch(profileUrl, {
    headers,
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Leetify profile fetch failed (${res.status}) at ${profileUrl}. ${errorText}`
    );
  }
  const payload = (await res.json()) as Record<string, unknown>;
  return (payload as { profile?: Record<string, unknown> })?.profile ?? payload;
}

async function fetchFaceitProfile(steamId: string) {
  const apiKey = getEnv("FACEIT_SERVER_API_KEY");
  const res = await fetch(
    `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) {
    throw new Error("FACEIT profile fetch failed.");
  }
  const profile = (await res.json()) as Record<string, unknown>;
  const playerId = profile?.player_id as string | undefined;
  let statsResponse: Record<string, unknown> | null = null;
  let statsResponseCsgo: Record<string, unknown> | null = null;
  let matchHistory: Record<string, unknown> | null = null;
  let matchHistoryCsgo: Record<string, unknown> | null = null;
  let hubsResponse: Record<string, unknown> | null = null;
  let teamsResponse: Record<string, unknown> | null = null;
  let tournamentsResponse: Record<string, unknown> | null = null;

  if (playerId) {
    try {
      const statsRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 60 },
        }
      );
      if (statsRes.ok) {
        statsResponse = (await statsRes.json()) as Record<string, unknown>;
        const lifetime = (statsResponse?.lifetime as Record<string, unknown>) ?? null;
      }
    } catch {
      statsResponse = null;
    }

    try {
      const statsRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/stats/csgo`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 60 },
        }
      );
      if (statsRes.ok) {
        statsResponseCsgo = (await statsRes.json()) as Record<string, unknown>;
      }
    } catch {
      statsResponseCsgo = null;
    }

    try {
      const historyRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 60 },
        }
      );
      if (historyRes.ok) {
        matchHistory = (await historyRes.json()) as Record<string, unknown>;
      }
    } catch {
      matchHistory = null;
    }

    try {
      const historyRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/history?game=csgo&offset=0&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 60 },
        }
      );
      if (historyRes.ok) {
        matchHistoryCsgo = (await historyRes.json()) as Record<string, unknown>;
      }
    } catch {
      matchHistoryCsgo = null;
    }

    try {
      const hubsRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/hubs?offset=0&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 300 },
        }
      );
      if (hubsRes.ok) {
        hubsResponse = (await hubsRes.json()) as Record<string, unknown>;
      }
    } catch {
      hubsResponse = null;
    }

    try {
      const teamsRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/teams?offset=0&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 300 },
        }
      );
      if (teamsRes.ok) {
        teamsResponse = (await teamsRes.json()) as Record<string, unknown>;
      }
    } catch {
      teamsResponse = null;
    }

    try {
      const tournamentsRes = await fetch(
        `https://open.faceit.com/data/v4/players/${playerId}/tournaments?offset=0&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          next: { revalidate: 300 },
        }
      );
      if (tournamentsRes.ok) {
        tournamentsResponse = (await tournamentsRes.json()) as Record<string, unknown>;
      }
    } catch {
      tournamentsResponse = null;
    }
  }

  return {
    ...profile,
    statsResponse,
    statsResponseCsgo,
    matchHistory,
    matchHistoryCsgo,
    hubsResponse,
    teamsResponse,
    tournamentsResponse,
  };
}

export default async function ProfileBySteamId({
  params,
}: {
  params: Promise<{ steamId: string }>;
}) {
  const { steamId } = await params;
  const session = await getSteamSession();

  const [steamResult, leetifyResult, faceitResult] = await Promise.allSettled([
    fetchSteamProfile(steamId),
    fetchLeetifyProfile(steamId),
    fetchFaceitProfile(steamId),
  ]);

  const steamProfile =
    steamResult.status === "fulfilled" ? steamResult.value.profile : null;
  const cs2 =
    steamResult.status === "fulfilled" ? steamResult.value.cs2 : null;
  const steamLevel =
    steamResult.status === "fulfilled" ? steamResult.value.steamLevel : null;
  const steamFriendsCount =
    steamResult.status === "fulfilled" ? steamResult.value.friendsCount : null;
  const steamRecentGames =
    steamResult.status === "fulfilled" ? steamResult.value.recentGames : [];
  const leetifyProfile =
    leetifyResult.status === "fulfilled" ? leetifyResult.value : null;
  const faceitProfile =
    faceitResult.status === "fulfilled" ? faceitResult.value : null;

  const errors: Record<string, string> = {};
  if (steamResult.status === "rejected") {
    errors.steam = steamResult.reason?.message ?? "Steam fetch failed.";
  }
  if (leetifyResult.status === "rejected") {
    errors.leetify = leetifyResult.reason?.message ?? "Leetify fetch failed.";
  }
  if (faceitResult.status === "rejected") {
    errors.faceit = faceitResult.reason?.message ?? "FACEIT fetch failed.";
  }

  console.info("[profile]", {
    steamId,
    viewer: session
      ? { steamId: session.steamId, name: session.personaName }
      : null,
    fetches: {
      steam: steamResult.status,
      leetify: leetifyResult.status,
      faceit: faceitResult.status,
    },
  });

  let overwatchBanned = false;
  const supabase = createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase
      .from("overwatch_reports")
      .select("id")
      .eq("target_steam_id", steamId)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();
    overwatchBanned = Boolean(data);
  }

  try {
    await trackProfileView({
      profileSteamId: steamId,
      profilePersonaName: steamProfile?.personaname ?? null,
      viewerSteamId: session?.steamId ?? null,
      viewerPersonaName: session?.personaName ?? null,
      viewerPath: `/profile/${steamId}`,
    });
  } catch {
    // Ignore analytics failures; profile should still render.
  }

  return (
    <ProfileTemplate
      steamId={steamId}
      steamProfile={steamProfile}
      cs2={cs2}
      steamLevel={steamLevel}
      steamFriendsCount={steamFriendsCount}
      steamRecentGames={steamRecentGames}
      initialRefreshedAt={Date.now()}
      leetifyProfile={leetifyProfile}
      faceitProfile={faceitProfile}
      errors={errors}
      overwatchBanned={overwatchBanned}
    />
  );
}
