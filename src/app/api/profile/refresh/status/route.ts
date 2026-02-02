import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { isAdminSteamId } from "@/lib/admin";

export async function GET(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get("steamId");
  if (!steamId) {
    return NextResponse.json({ error: "Missing steamId." }, { status: 400 });
  }

  if (steamId !== session.steamId && !isAdminSteamId(session.steamId)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const { data: job } = await supabase
    .from("refresh_queue")
    .select("id, status, created_at, updated_at, started_at, finished_at")
    .eq("steam_id", steamId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let etaSeconds: number | null = null;
  if (job?.status === "queued" && job.created_at) {
    const avgSeconds = Number(process.env.REFRESH_AVG_SECONDS ?? "30");
    const { count: aheadCount } = await supabase
      .from("refresh_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .lte("created_at", job.created_at);
    if (aheadCount && avgSeconds > 0) {
      etaSeconds = Math.max(0, aheadCount - 1) * avgSeconds;
    }
  }

  const { data: profile } = await supabase
    .from("pgrep_profiles")
    .select("last_refreshed_at")
    .eq("steam_id", steamId)
    .maybeSingle();

  return NextResponse.json({
    job: job ? { ...job, eta_seconds: etaSeconds } : null,
    lastRefreshedAt: profile?.last_refreshed_at ?? null,
  });
}
