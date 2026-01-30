import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

export async function GET(
  request: Request,
  context: { params: Promise<{ steamId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`steam:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const apiKey = getEnv("STEAM_WEB_API_KEY");
    const { steamId } = await context.params;

    const summaryRes = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
      { next: { revalidate: 60 } }
    );
    if (!summaryRes.ok) {
      throw new Error("Steam profile fetch failed.");
    }
    const summaryData = await summaryRes.json();
    const player = summaryData?.response?.players?.[0];

    const gamesRes = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&appids_filter[0]=730&include_appinfo=true`,
      { next: { revalidate: 300 } }
    );
    const gamesData = gamesRes.ok ? await gamesRes.json() : null;
    const cs2 = gamesData?.response?.games?.[0] ?? null;

    return NextResponse.json(
      {
        ok: true,
        steamId,
        profile: player ?? null,
        cs2,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }
}

