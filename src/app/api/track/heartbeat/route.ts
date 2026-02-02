import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { verifyCsrf } from "@/lib/csrf";
import { z } from "zod";

const payloadSchema = z.object({
  path: z.string().max(200).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const path = parsed.data.path ?? null;
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

