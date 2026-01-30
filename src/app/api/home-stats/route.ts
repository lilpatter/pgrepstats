import { readFile } from "fs/promises";
import { join } from "path";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const activeCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const [statsRow, profilesCount, activeUsersCount, reportsCount] = await Promise.all([
        supabase
          .from("home_stats")
          .select("reports_submitted, ai_auto_flagged")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("pgrep_profiles")
          .select("steam_id", { count: "exact", head: true }),
        supabase
          .from("pgrep_users")
          .select("steam_id", { count: "exact", head: true })
          .gte("last_seen_at", activeCutoff),
        supabase
          .from("overwatch_reports")
          .select("id", { count: "exact", head: true }),
      ]);

      const reportsSubmitted =
        reportsCount.count ?? statsRow.data?.reports_submitted ?? null;
      const aiAutoFlagged =
        statsRow.data?.ai_auto_flagged ?? null;

      if (
        !statsRow.error ||
        !profilesCount.error ||
        !activeUsersCount.error ||
        !reportsCount.error
      ) {
        return Response.json(
          {
            playersIndexed: profilesCount.count ?? 0,
            activeUsers: activeUsersCount.count ?? 0,
            reportsSubmitted,
            aiAutoFlagged,
          },
          { status: 200 }
        );
      }
    }

    const filePath = join(process.cwd(), "data", "home-stats.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, number | null>;
    return Response.json(data, { status: 200 });
  } catch {
    return Response.json(
      {
        playersIndexed: null,
        activeUsers: null,
        reportsSubmitted: null,
        aiAutoFlagged: null,
      },
      { status: 200 }
    );
  }
}
