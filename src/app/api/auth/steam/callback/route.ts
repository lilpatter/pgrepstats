import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import {
  buildOpenIdLoginUrl,
  encodeSteamSession,
  getSteamIdFromOpenId,
  setSteamSessionCookie,
  verifyOpenIdResponse,
} from "@/lib/steam-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const params = url.searchParams;

  const valid = await verifyOpenIdResponse(params);
  if (!valid) {
    return NextResponse.redirect(buildOpenIdLoginUrl(origin));
  }

  const identity = params.get("openid.claimed_id") ?? params.get("openid.identity");
  const steamId = getSteamIdFromOpenId(identity);
  if (!steamId) {
    return NextResponse.redirect(buildOpenIdLoginUrl(origin));
  }

  const apiKey = getEnv("STEAM_WEB_API_KEY");
  const summaryRes = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`
  );
  const summaryData = summaryRes.ok ? await summaryRes.json() : null;
  const player = summaryData?.response?.players?.[0] as
    | {
        personaname?: string;
        avatarfull?: string;
        profileurl?: string;
      }
    | undefined;

  const session = encodeSteamSession({
    steamId,
    personaName: player?.personaname ?? "Steam User",
    avatar: player?.avatarfull ?? "",
    profileUrl: player?.profileurl ?? "",
  });

  const response = NextResponse.redirect(`${origin}/profile/${steamId}`);
  if (session) {
    setSteamSessionCookie(response, session);
  }
  return response;
}

