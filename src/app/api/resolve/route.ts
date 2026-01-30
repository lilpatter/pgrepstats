import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

function extractSteamId(input: string) {
  const match = input.match(/\b(\d{17})\b/);
  return match?.[1] ?? null;
}

function extractVanity(input: string) {
  const vanityMatch = input.match(
    /steamcommunity\.com\/id\/([^/?#]+)/i
  );
  if (vanityMatch?.[1]) {
    return vanityMatch[1];
  }
  return null;
}

function extractFaceitNickname(input: string) {
  const match = input.match(/faceit\.com\/(?:[^/]+\/)?players\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

async function resolveVanity(vanity: string) {
  const apiKey = getEnv("STEAM_WEB_API_KEY");
  const res = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanity}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) {
    throw new Error("Steam vanity lookup failed.");
  }
  const data = await res.json();
  if (data?.response?.success !== 1) {
    throw new Error("Steam vanity not found.");
  }
  return data.response.steamid as string;
}

async function resolveFaceitNickname(nickname: string) {
  const apiKey = getEnv("FACEIT_SERVER_API_KEY");
  const res = await fetch(
    `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(
      nickname
    )}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) {
    throw new Error("FACEIT nickname lookup failed.");
  }
  const data = await res.json();
  return data?.steam_id_64 ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`resolve:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  if (!query) {
    return NextResponse.json(
      { error: "Missing query." },
      { status: 400 }
    );
  }

  try {
    const directSteamId = extractSteamId(query);
    if (directSteamId) {
      return NextResponse.json({ ok: true, steamId: directSteamId });
    }

    const vanity = extractVanity(query);
    if (vanity) {
      const steamId = await resolveVanity(vanity);
      return NextResponse.json({ ok: true, steamId, resolvedFrom: vanity });
    }

    const faceitNickname = extractFaceitNickname(query);
    if (faceitNickname) {
      const steamId = await resolveFaceitNickname(faceitNickname);
      if (!steamId) {
        throw new Error("FACEIT profile has no Steam64 linked.");
      }
      return NextResponse.json({
        ok: true,
        steamId,
        resolvedFrom: faceitNickname,
      });
    }

    if (/steamcommunity\.com\/profiles\//i.test(query)) {
      const idFromProfile = extractSteamId(query);
      if (idFromProfile) {
        return NextResponse.json({ ok: true, steamId: idFromProfile });
      }
    }

    if (query.includes("leetify.com")) {
      const leetifySteamId = extractSteamId(query);
      if (leetifySteamId) {
        return NextResponse.json({ ok: true, steamId: leetifySteamId });
      }
    }

    const fallbackVanity = query.replace(/https?:\/\//i, "").split("/")[0];
    const steamId = await resolveVanity(fallbackVanity);
    return NextResponse.json({ ok: true, steamId, resolvedFrom: fallbackVanity });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to resolve.",
      },
      { status: 400 }
    );
  }
}

