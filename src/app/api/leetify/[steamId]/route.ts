import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

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
    const apiKey = process.env.LEETIFY_API_KEY;
    const rawBaseUrl = getEnv(
      "LEETIFY_BASE_URL",
      "https://api-public.cs-prod.leetify.com"
    );
    const baseUrl = rawBaseUrl.includes("api.leetify.com")
      ? "https://api-public.cs-prod.leetify.com"
      : rawBaseUrl;
    const { steamId } = await context.params;

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers._leetify_key = apiKey;
    }

    const profileUrl = `${baseUrl}/v3/profile?steam64_id=${steamId}`;
    const profileRes = await fetch(profileUrl, {
      headers,
      next: { revalidate: 60 },
    });
    console.info("[leetify] profile", {
      url: profileUrl,
      status: profileRes.status,
    });

    if (!profileRes.ok) {
      const errorText = await profileRes.text();
      throw new Error(
        `Leetify profile fetch failed (${profileRes.status}). ${errorText}`
      );
    }

    const profile = await profileRes.json();

    return NextResponse.json(
      {
        ok: true,
        steamId,
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
