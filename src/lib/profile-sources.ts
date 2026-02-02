import { getEnv } from "@/lib/env";
import { dedupeRequest } from "@/lib/request-dedupe";

export type SteamProfile = {
  personaname?: string;
  avatarfull?: string;
  profileurl?: string;
  timecreated?: number;
  gameextrainfo?: string;
  lastlogoff?: number;
  personastate?: number;
  loccountrycode?: string;
  communityvisibilitystate?: number;
};

export type SteamGame = {
  playtime_forever?: number;
};

export type SteamRecentGame = {
  appid?: number;
  name?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
  img_icon_url?: string;
};

function fetchSteamProfileInternal(steamId: string, noCache: boolean) {
  const cacheOptions = noCache ? { cache: "no-store" as const } : { next: { revalidate: 60 } };
  const cacheOptionsLong = noCache
    ? { cache: "no-store" as const }
    : { next: { revalidate: 300 } };
  return dedupeRequest(`steam:${steamId}:${noCache ? "fresh" : "cached"}`, async () => {
    const apiKey = getEnv("STEAM_WEB_API_KEY");
    const summaryRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
      cacheOptions
    );
    if (!summaryRes.ok) {
      throw new Error("Steam profile fetch failed.");
    }
    const summaryData = await summaryRes.json();
    const profile = summaryData?.response?.players?.[0] as SteamProfile | undefined;

    const gamesRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&appids_filter[0]=730&include_appinfo=true`,
      cacheOptionsLong
    );
    const gamesData = gamesRes.ok ? await gamesRes.json() : null;
    const cs2 = (gamesData?.response?.games?.[0] as SteamGame) ?? null;

    let friendsCount: number | null = null;
    try {
      const friendsRes = await fetch(
        `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${apiKey}&steamid=${steamId}&relationship=friend`,
        cacheOptionsLong
      );
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        const friends = friendsData?.friendslist?.friends as
          | Array<unknown>
          | undefined;
        friendsCount = friends ? friends.length : null;
      }
    } catch {
      friendsCount = null;
    }

    let recentGames: SteamRecentGame[] = [];
    try {
      const recentRes = await fetch(
        `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=4`,
        cacheOptionsLong
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
        cacheOptionsLong
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
  });
}

export function fetchSteamProfile(steamId: string) {
  return fetchSteamProfileInternal(steamId, false);
}

export function fetchSteamProfileFresh(steamId: string) {
  return fetchSteamProfileInternal(steamId, true);
}

export function fetchLeetifyProfile(steamId: string) {
  return dedupeRequest(`leetify:${steamId}`, async () => {
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
    if (res.status === 404) {
      const errorText = await res.text().catch(() => "");
      console.warn("[leetify] profile not found", {
        url: profileUrl,
        status: res.status,
        body: errorText.slice(0, 500),
      });
      return null;
    }
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error("[leetify] profile fetch failed", {
        url: profileUrl,
        status: res.status,
        body: errorText.slice(0, 500),
      });
      throw new Error(
        `Leetify profile fetch failed (${res.status}). ${errorText}`
      );
    }
    const payload = (await res.json()) as Record<string, unknown>;
    return (payload as { profile?: Record<string, unknown> })?.profile ?? payload;
  });
}

export function fetchFaceitProfile(steamId: string) {
  return dedupeRequest(`faceit:${steamId}`, async () => {
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
          `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=12`,
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
          `https://open.faceit.com/data/v4/players/${playerId}/history?game=csgo&offset=0&limit=12`,
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
  });
}
