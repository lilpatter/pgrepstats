import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";

const ALLOWED_TYPES = new Set([
  "Aim",
  "Wallhack",
  "Triggerbot",
  "Rage hacking",
  "Spinbot",
  "Macro",
  "Other",
]);

type ReportPayload = {
  targetSteamId?: string;
  targetName?: string | null;
  occurredAt?: string;
  demoUrl?: string;
  cheatType?: string;
};

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json(
      { error: "You must be logged in to report." },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => null)) as ReportPayload | null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { targetSteamId, targetName, occurredAt, demoUrl, cheatType } = payload;
  if (!targetSteamId || !occurredAt || !demoUrl || !cheatType) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(cheatType)) {
    return NextResponse.json(
      { error: "Invalid cheat type." },
      { status: 400 }
    );
  }

  const occurredDate = new Date(occurredAt);
  if (Number.isNaN(occurredDate.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  let demo: URL;
  try {
    demo = new URL(demoUrl);
  } catch {
    return NextResponse.json({ error: "Invalid demo URL." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const { data: existingBan } = await supabase
    .from("overwatch_reports")
    .select("id")
    .eq("target_steam_id", targetSteamId)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();
  if (existingBan) {
    return NextResponse.json(
      { error: "Player is already overwatch banned." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("overwatch_reports").insert({
    target_steam_id: targetSteamId,
    target_persona_name: targetName ?? null,
    reporter_steam_id: session.steamId,
    reporter_persona_name: session.personaName ?? null,
    demo_url: demo.toString(),
    cheat_type: cheatType,
    occurred_at: occurredDate.toISOString(),
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

