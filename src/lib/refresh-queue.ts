import {
  fetchFaceitProfile,
  fetchLeetifyProfile,
  fetchSteamProfile,
} from "@/lib/profile-sources";

type RefreshJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

type RefreshJobRow = {
  id: string;
  steam_id: string;
  requester_steam_id?: string | null;
  status: RefreshJobStatus;
  attempt_count?: number | null;
  max_attempts?: number | null;
  last_error?: string | null;
  next_attempt_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export async function enqueueRefreshJob(
  supabase: any,
  steamId: string,
  requesterSteamId: string | null
) {
  const { data: existing } = await supabase
    .from("refresh_queue")
    .select("id, status")
    .eq("steam_id", steamId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return {
      job: existing as Pick<RefreshJobRow, "id" | "status">,
      created: false,
    };
  }

  const { data, error } = await supabase
    .from("refresh_queue")
    .insert({
      steam_id: steamId,
      requester_steam_id: requesterSteamId,
      status: "queued",
    })
    .select("id, status")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to enqueue refresh job.");
  }

  return { job: data as Pick<RefreshJobRow, "id" | "status">, created: true };
}

export async function runRefreshJob(
  supabase: any,
  jobId: string,
  steamId: string
) {
  const nowIso = new Date().toISOString();
  await supabase
    .from("refresh_queue")
    .update({ status: "processing", started_at: nowIso, updated_at: nowIso })
    .eq("id", jobId);

  const [steamResult, leetifyResult, faceitResult] = await Promise.allSettled([
    fetchSteamProfile(steamId),
    fetchLeetifyProfile(steamId),
    fetchFaceitProfile(steamId),
  ]);

  const steamSnapshot =
    steamResult.status === "fulfilled" ? steamResult.value : null;
  const leetifySnapshot =
    leetifyResult.status === "fulfilled" ? leetifyResult.value : null;
  const faceitSnapshot =
    faceitResult.status === "fulfilled" ? faceitResult.value : null;

  const nowDoneIso = new Date().toISOString();
  const { error: upsertError } = await supabase.from("pgrep_profiles").upsert(
    {
      steam_id: steamId,
      steam_snapshot: steamSnapshot,
      leetify_snapshot: leetifySnapshot,
      faceit_snapshot: faceitSnapshot,
      last_refreshed_at: nowDoneIso,
    },
    { onConflict: "steam_id" }
  );

  if (upsertError) {
    await supabase
      .from("refresh_queue")
      .update({
        status: "failed",
        last_error: upsertError.message,
        finished_at: nowDoneIso,
        updated_at: nowDoneIso,
      })
      .eq("id", jobId);
    throw new Error(upsertError.message);
  }

  await supabase
    .from("refresh_queue")
    .update({
      status: "completed",
      finished_at: nowDoneIso,
      updated_at: nowDoneIso,
    })
    .eq("id", jobId);

  return { refreshedAt: nowDoneIso };
}

export async function claimNextQueuedJob(
  supabase: any
) {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("refresh_queue")
    .select("id, steam_id, status, next_attempt_at")
    .eq("status", "queued")
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.id || !data.steam_id) return null;

  const { error } = await supabase
    .from("refresh_queue")
    .update({ status: "processing", started_at: nowIso, updated_at: nowIso })
    .eq("id", data.id)
    .eq("status", "queued");

  if (error) return null;

  return { id: data.id, steam_id: data.steam_id };
}
