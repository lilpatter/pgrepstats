import { createSupabaseServerClient } from "@/lib/supabase";

type TrackProfileViewArgs = {
  profileSteamId: string;
  viewerSteamId?: string | null;
};

export async function trackProfileView({
  profileSteamId,
  viewerSteamId,
}: TrackProfileViewArgs) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const jobs = [
    supabase
      .from("pgrep_profiles")
      .upsert({ steam_id: profileSteamId, last_seen_at: now }, { onConflict: "steam_id" }),
  ];

  if (viewerSteamId) {
    jobs.push(
      supabase
        .from("pgrep_users")
        .upsert({ steam_id: viewerSteamId, last_seen_at: now }, { onConflict: "steam_id" })
    );
  }

  await Promise.allSettled(jobs);
}

