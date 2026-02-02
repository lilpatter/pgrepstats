import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { claimNextQueuedJob, runRefreshJob } from "@/lib/refresh-queue";

export async function POST(request: Request) {
  const workerKey = process.env.REFRESH_WORKER_KEY;
  const headerKey = request.headers.get("x-refresh-worker-key");
  if (!workerKey || headerKey !== workerKey) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const job = await claimNextQueuedJob(supabase);
  if (!job) {
    return NextResponse.json({ ok: true, message: "No queued jobs." });
  }

  try {
    const result = await runRefreshJob(supabase, job.id, job.steam_id);
    return NextResponse.json({
      ok: true,
      jobId: job.id,
      steamId: job.steam_id,
      refreshedAt: result.refreshedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        jobId: job.id,
        steamId: job.steam_id,
        error: error instanceof Error ? error.message : "Refresh failed.",
      },
      { status: 500 }
    );
  }
}
