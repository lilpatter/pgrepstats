import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ playerId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`faceit:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const apiKey = getEnv("FACEIT_SERVER_API_KEY");
    const { playerId } = await context.params;

    const profileRes = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!profileRes.ok) {
      throw new Error("FACEIT profile fetch failed.");
    }

    const profile = await profileRes.json();

    return NextResponse.json(
      {
        ok: true,
        playerId,
        profile,
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
