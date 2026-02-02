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

const BACKOFF_BASE_SECONDS = Number(
  process.env.REFRESH_BACKOFF_BASE_SECONDS ?? "60"
);
const MAX_BACKOFF_SECONDS = Number(
  process.env.REFRESH_BACKOFF_MAX_SECONDS ?? "900"
);
const PROCESSING_TIMEOUT_MINUTES = Number(
  process.env.REFRESH_PROCESSING_TIMEOUT_MINUTES ?? "15"
);
const QUEUE_TIMEOUT_MINUTES = Number(
  process.env.REFRESH_QUEUE_TIMEOUT_MINUTES ?? "120"
);

function computeBackoffSeconds(attemptCount: number) {
  const exponential = BACKOFF_BASE_SECONDS * Math.pow(2, attemptCount);
  return Math.min(MAX_BACKOFF_SECONDS, Math.max(BACKOFF_BASE_SECONDS, exponential));
}

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
  const { data: jobRow } = await supabase
    .from("refresh_queue")
    .select(
      "id, attempt_count, max_attempts, status, created_at, started_at, updated_at"
    )
    .eq("id", jobId)
    .maybeSingle();

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
    const nextAttempt = (jobRow?.attempt_count ?? 0) + 1;
    const maxAttempts = jobRow?.max_attempts ?? 3;
    if (nextAttempt >= maxAttempts) {
      await supabase
        .from("refresh_queue")
        .update({
          status: "failed",
          attempt_count: nextAttempt,
          last_error: upsertError.message,
          finished_at: nowDoneIso,
          updated_at: nowDoneIso,
        })
        .eq("id", jobId);
    } else {
      const backoffSeconds = computeBackoffSeconds(nextAttempt);
      const nextAttemptAt = new Date(
        Date.now() + backoffSeconds * 1000
      ).toISOString();
      await supabase
        .from("refresh_queue")
        .update({
          status: "queued",
          attempt_count: nextAttempt,
          last_error: upsertError.message,
          next_attempt_at: nextAttemptAt,
          updated_at: nowDoneIso,
        })
        .eq("id", jobId);
    }
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
    .select("id, steam_id, status, next_attempt_at, attempt_count, max_attempts")
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

export async function cleanupStaleJobs(supabase: any) {
  const now = Date.now();
  const processingCutoff = new Date(
    now - PROCESSING_TIMEOUT_MINUTES * 60 * 1000
  ).toISOString();
  const queuedCutoff = new Date(
    now - QUEUE_TIMEOUT_MINUTES * 60 * 1000
  ).toISOString();

  await supabase
    .from("refresh_queue")
    .update({
      status: "failed",
      last_error: "Processing timeout.",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("started_at", processingCutoff);

  await supabase
    .from("refresh_queue")
    .update({
      status: "cancelled",
      last_error: "Queue timeout.",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "queued")
    .lt("created_at", queuedCutoff);
}
