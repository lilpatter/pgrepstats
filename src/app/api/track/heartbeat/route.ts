import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as
    | { path?: string | null }
    | null;
  const path = body?.path ?? null;
  const now = new Date().toISOString();

  await supabase
    .from("pgrep_users")
    .upsert(
      {
        steam_id: session.steamId,
        persona_name: session.personaName ?? null,
        last_path: path,
        last_seen_at: now,
      },
      { onConflict: "steam_id" }
    );

  return NextResponse.json({ ok: true }, { status: 200 });
}

