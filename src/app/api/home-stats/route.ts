import { readFile } from "fs/promises";
import { join } from "path";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("home_stats")
        .select(
          "players_indexed, active_users, reports_submitted, ai_auto_flagged"
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return Response.json(
          {
            playersIndexed: data.players_indexed ?? null,
            activeUsers: data.active_users ?? null,
            reportsSubmitted: data.reports_submitted ?? null,
            aiAutoFlagged: data.ai_auto_flagged ?? null,
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
