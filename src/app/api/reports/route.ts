import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { verifyCsrf } from "@/lib/csrf";
import { getPublicError, sanitizeText } from "@/lib/utils";
import { z } from "zod";

const ALLOWED_TYPES = new Set([
  "Aim",
  "Wallhack",
  "Triggerbot",
  "Rage hacking",
  "Spinbot",
  "Macro",
  "Other",
]);

const reportSchema = z.object({
  targetSteamId: z.string().min(1),
  targetName: z.string().nullable().optional(),
  occurredAt: z.string().min(1),
  demoUrl: z.string().min(1),
  cheatType: z.string().min(1),
  matchUrl: z.string().url().nullable().optional(),
  matchPreview: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json(
      { error: "You must be logged in to report." },
      { status: 401 }
    );
  }

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const payload = parsed.data;

  const {
    targetSteamId,
    targetName,
    occurredAt,
    demoUrl,
    cheatType,
    matchUrl,
    matchPreview,
  } = payload;
  const sanitizedTargetName = targetName ? sanitizeText(targetName) : null;
  if (!ALLOWED_TYPES.has(cheatType)) {
    return NextResponse.json(
      { error: "Invalid cheat type." },
      { status: 400 }
    );
  }

  if (targetSteamId === session.steamId) {
    return NextResponse.json(
      { error: "You cannot report yourself." },
      { status: 409 }
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
      { error: "Service unavailable." },
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
    target_persona_name: sanitizedTargetName,
    reporter_steam_id: session.steamId,
    reporter_persona_name: session.personaName ?? null,
    demo_url: demo.toString(),
    cheat_type: cheatType,
    occurred_at: occurredDate.toISOString(),
    match_url: matchUrl ?? null,
    match_preview: matchPreview ?? null,
    status: "pending",
  });

  if (error) {
    return NextResponse.json(
      { error: getPublicError(error.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

