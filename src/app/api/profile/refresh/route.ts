import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json(
      { error: "You must be logged in." },
      { status: 401 }
    );
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

  const nowIso = new Date().toISOString();
  await supabase
    .from("pgrep_profiles")
    .upsert(
      {
        steam_id: payload.steamId,
        last_refreshed_at: nowIso,
        last_seen_at: nowIso,
      },
      { onConflict: "steam_id" }
    );

  return NextResponse.json({ ok: true, refreshedAt: nowIso }, { status: 200 });
}
