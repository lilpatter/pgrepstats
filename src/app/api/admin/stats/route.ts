import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { requireAdminSession } from "@/lib/admin";
import { getPublicError } from "@/lib/utils";

const ACTIVE_WINDOW_MINUTES = 5;

export async function GET(request: Request) {
  const { isAdmin } = await requireAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const adminToken = process.env.ADMIN_STATS_TOKEN;
  if (!adminToken) {
    return NextResponse.json(
      { error: "Service unavailable." },
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
      { error: "Service unavailable." },
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
        error: getPublicError("Failed to load stats."),
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

