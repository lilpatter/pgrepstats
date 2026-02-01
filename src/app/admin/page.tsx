import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { IndexedProfilesPager } from "@/components/admin/IndexedProfilesPager";
import { ReportsPager } from "@/components/admin/ReportsPager";

const ACTIVE_WINDOW_MINUTES = 5;

function formatTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}


export default async function AdminPage() {
  const { isAdmin } = await requireAdminSession();
  if (!isAdmin) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold text-white">Admin Dashboard</div>
        <div className="text-sm text-[rgba(233,228,255,0.6)]">
          Supabase is not configured.
        </div>
      </div>
    );
  }

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cutoff = new Date(
    Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const [activeUsers, indexedProfiles, reports] = await Promise.all([
    supabase
      .from("pgrep_users")
      .select("steam_id, persona_name, last_path, last_seen_at")
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("pgrep_profiles")
      .select("steam_id, persona_name, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("overwatch_reports")
      .select(
        "id, target_steam_id, target_persona_name, reporter_steam_id, reporter_persona_name, demo_url, cheat_type, occurred_at, created_at, status, resolved_at, resolved_by, match_url, match_preview"
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const activeList = activeUsers.data ?? [];
  const indexedList = indexedProfiles.data ?? [];
  const reportList = reports.data ?? [];
  const approvedList = reportList.filter((report) => report.status === "approved");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Admin Dashboard</div>
        <div className="text-sm text-[rgba(233,228,255,0.6)]">
          Active window: last {ACTIVE_WINDOW_MINUTES} minutes
        </div>
        {!hasServiceRole ? (
          <div className="mt-2 text-xs text-[#ff5a7a]">
            SUPABASE_SERVICE_ROLE_KEY is not set. Admin stats may be empty if RLS
            blocks anon access.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <CardTitle>Active Users</CardTitle>
          <CardDescription>Logged-in viewers recently active.</CardDescription>
          <div className="text-2xl font-semibold text-white">
            {activeList.length}
          </div>
        </Card>
        <Card className="space-y-2 p-4">
          <CardTitle>Profiles Indexed</CardTitle>
          <CardDescription>Profiles seen by the system.</CardDescription>
          <div className="text-2xl font-semibold text-white">
            {indexedList.length}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <CardTitle className="mb-2">Active Users</CardTitle>
          <CardDescription className="mb-3">
            Steam IDs active within the window.
          </CardDescription>
          {activeUsers.error ? (
            <div className="mb-3 text-xs text-[#ff5a7a]">
              Failed to load active users: {activeUsers.error.message}
            </div>
          ) : null}
          <div className="space-y-2 text-xs text-[rgba(233,228,255,0.75)]">
            {activeList.length ? (
              activeList.map((user) => (
                <div
                  key={user.steam_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-white">
                      {user.persona_name ?? "Unknown"}
                    </span>
                    <span className="font-mono text-[rgba(233,228,255,0.6)]">
                      {user.steam_id}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span>{formatTime(user.last_seen_at)}</span>
                    <span className="text-[rgba(233,228,255,0.6)]">
                      {user.last_path ?? "N/A"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[rgba(233,228,255,0.5)]">No active users.</div>
            )}
          </div>
        </Card>

        <div>
          {indexedProfiles.error ? (
            <div className="mb-3 text-xs text-[#ff5a7a]">
              Failed to load indexed profiles: {indexedProfiles.error.message}
            </div>
          ) : null}
          <IndexedProfilesPager profiles={indexedList} pageSize={10} />
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Overwatch Reports</CardTitle>
            <CardDescription>
              Moderate reports and update the review status.
            </CardDescription>
          </div>
          <div className="text-xs text-[rgba(233,228,255,0.6)]">
            Total: {reportList.length}
          </div>
        </div>
        {reports.error ? (
          <div className="mt-3 text-xs text-[#ff5a7a]">
            Failed to load reports: {reports.error.message}
          </div>
        ) : null}
        <ReportsPager
          reports={reportList}
          pageSize={5}
          showActions
          emptyMessage="No reports yet."
        />
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Approved Reports</CardTitle>
            <CardDescription>
              Active overwatch bans and approval metadata.
            </CardDescription>
          </div>
          <div className="text-xs text-[rgba(233,228,255,0.6)]">
            Total: {approvedList.length}
          </div>
        </div>
        <ReportsPager
          reports={approvedList}
          pageSize={5}
          showActions={false}
          emptyMessage="No approved reports yet."
        />
      </Card>
    </div>
  );
}

