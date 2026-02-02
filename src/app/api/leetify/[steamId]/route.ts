import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { fetchLeetifyProfile } from "@/lib/profile-sources";
import { jsonWithCache } from "@/lib/cache";
import { getPublicError } from "@/lib/utils";

export async function GET(
  request: Request,
  context: { params: Promise<{ steamId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkRateLimit(`leetify:${ip}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429 }
    );
  }

  try {
    const { steamId } = await context.params;
    const profile = await fetchLeetifyProfile(steamId);

    return jsonWithCache(
      request,
      {
        ok: true,
        steamId,
        profile,
      },
      { maxAgeSeconds: 60, staleWhileRevalidateSeconds: 120 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getPublicError(
          error instanceof Error ? error.message : "Unknown error."
        ),
      },
      { status: 500 }
    );
  }
}
