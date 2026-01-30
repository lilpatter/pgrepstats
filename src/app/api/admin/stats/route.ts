import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

const ACTIVE_WINDOW_MINUTES = 5;

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_STATS_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "ADMIN_STATS_TOKEN is not configured." },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-admin-token");
  if (provided !== adminToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const cutoff = new Date(
    Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const [activeUsers, indexedProfiles] = await Promise.all([
    supabase
      .from("pgrep_users")
      .select("steam_id, last_seen_at")
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("pgrep_profiles")
      .select("steam_id, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(200),
  ]);

  if (activeUsers.error || indexedProfiles.error) {
    return NextResponse.json(
      {
        error: "Failed to load stats.",
        details: {
          activeUsers: activeUsers.error?.message ?? null,
          indexedProfiles: indexedProfiles.error?.message ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      activeWindowMinutes: ACTIVE_WINDOW_MINUTES,
      activeUsers: activeUsers.data ?? [],
      indexedProfiles: indexedProfiles.data ?? [],
    },
    { status: 200 }
  );
}

