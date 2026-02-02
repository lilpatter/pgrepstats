import { NextResponse } from "next/server";
import { z } from "zod";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { verifyCsrf } from "@/lib/csrf";
import { getPublicError } from "@/lib/utils";

const reviewSchema = z.object({
  targetSteamId: z.string().min(1),
  reviewType: z.enum(["positive", "negative"]),
  reasons: z.array(z.string()).max(3).optional(),
  matchId: z.string().nullable().optional(),
  matchData: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await getSteamSession();
  if (!session?.steamId) {
    return NextResponse.json(
      { error: "You must be logged in to review." },
      { status: 401 }
    );
  }

  if (!(await verifyCsrf(request))) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { targetSteamId, reviewType, reasons, matchId, matchData } = parsed.data;

  if (targetSteamId === session.steamId) {
    return NextResponse.json(
      { error: "You cannot review yourself." },
      { status: 409 }
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 }
    );
  }

  const { error: deleteError } = await supabase
    .from("pgrep_reviews")
    .delete()
    .eq("target_steam_id", targetSteamId)
    .eq("reviewer_steam_id", session.steamId);

  if (deleteError) {
    return NextResponse.json(
      { error: getPublicError(deleteError.message) },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("pgrep_reviews").insert({
    target_steam_id: targetSteamId,
    reviewer_steam_id: session.steamId,
    review_type: reviewType,
    reasons: reasons ?? [],
    match_id: matchId ?? null,
    match_data: matchData ?? null,
  });

  if (error) {
    return NextResponse.json(
      { error: getPublicError(error.message) },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
