import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  claimNextQueuedJob,
  cleanupExpiredCache,
  cleanupStaleJobs,
  runRefreshJob,
} from "@/lib/refresh-queue";

export async function POST(request: Request) {
  const workerKey = process.env.REFRESH_WORKER_KEY;
  const headerKey = request.headers.get("x-refresh-worker-key");
  if (!workerKey || headerKey !== workerKey) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 500 }
    );
  }

  await cleanupStaleJobs(supabase);
  await cleanupExpiredCache(supabase);

  const job = await claimNextQueuedJob(supabase);
  if (!job) {
    return NextResponse.json({ ok: true, message: "No queued jobs." });
  }

  try {
    const result = await runRefreshJob(
      supabase,
      job.id,
      job.steam_id,
      job.mode
    );
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
        error: "Refresh failed.",
      },
      { status: 500 }
    );
  }
}
