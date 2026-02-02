import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchSteamProfile } from "@/lib/profile-sources";

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
    const { steamId } = await context.params;
    const profileData = await fetchSteamProfile(steamId);

    return NextResponse.json(
      {
        ok: true,
        steamId,
        profile: profileData.profile ?? null,
        cs2: profileData.cs2 ?? null,
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
