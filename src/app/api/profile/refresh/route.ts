import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { enqueueRefreshJob, runRefreshJob } from "@/lib/refresh-queue";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 }
    );
  }

  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { steamId?: string }
    | null;
  if (!payload?.steamId) {
    return NextResponse.json({ error: "Missing steamId." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const cooldownMinutes = Number(process.env.REFRESH_COOLDOWN_MINUTES ?? "5");
  if (cooldownMinutes > 0) {
    const { data } = await supabase
      .from("pgrep_profiles")
      .select("last_refreshed_at")
      .eq("steam_id", payload.steamId)
      .maybeSingle();
    const lastRefreshedAt = data?.last_refreshed_at
      ? new Date(data.last_refreshed_at).getTime()
      : null;
    if (lastRefreshedAt) {
      const diffMs = Date.now() - lastRefreshedAt;
      const cooldownMs = cooldownMinutes * 60 * 1000;
      if (diffMs < cooldownMs) {
        const retryAfterSec = Math.ceil((cooldownMs - diffMs) / 1000);
        return NextResponse.json(
          {
            error: `Refresh cooldown active. Try again in ${retryAfterSec}s.`,
            retryAfterSec,
          },
          { status: 429 }
        );
      }
    }
  }

  const { job, created } = await enqueueRefreshJob(
    supabase,
    payload.steamId,
    session.steamId
  );

  if (!created) {
    return NextResponse.json(
      { ok: true, status: job.status, jobId: job.id },
      { status: 200 }
    );
  }

  try {
    const result = await runRefreshJob(supabase, job.id, payload.steamId);
    return NextResponse.json(
      { ok: true, status: "completed", jobId: job.id, refreshedAt: result.refreshedAt },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        jobId: job.id,
        error: error instanceof Error ? error.message : "Refresh failed.",
      },
      { status: 500 }
    );
  }
}
