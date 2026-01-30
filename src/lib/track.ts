import { createSupabaseServerClient } from "@/lib/supabase";

type TrackProfileViewArgs = {
  profileSteamId: string;
  profilePersonaName?: string | null;
  viewerSteamId?: string | null;
  viewerPersonaName?: string | null;
  viewerPath?: string | null;
};

export async function trackProfileView({
  profileSteamId,
  profilePersonaName,
  viewerSteamId,
  viewerPersonaName,
  viewerPath,
}: TrackProfileViewArgs) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const jobs = [
    supabase
      .from("pgrep_profiles")
      .upsert(
        {
          steam_id: profileSteamId,
          persona_name: profilePersonaName ?? null,
          last_seen_at: now,
        },
        { onConflict: "steam_id" }
      ),
  ];

  if (viewerSteamId) {
    jobs.push(
      supabase
        .from("pgrep_users")
        .upsert(
          {
            steam_id: viewerSteamId,
            persona_name: viewerPersonaName ?? null,
            last_path: viewerPath ?? null,
            last_seen_at: now,
          },
          { onConflict: "steam_id" }
        )
    );
  }

  await Promise.allSettled(jobs);
}

