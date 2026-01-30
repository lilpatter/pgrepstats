import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ReportModerationActions } from "@/components/admin/ReportModerationActions";

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
        "id, target_steam_id, target_persona_name, reporter_steam_id, reporter_persona_name, demo_url, cheat_type, occurred_at, created_at, status"
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const activeList = activeUsers.data ?? [];
  const indexedList = indexedProfiles.data ?? [];
  const reportList = reports.data ?? [];

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

        <Card className="p-4">
          <CardTitle className="mb-2">Indexed Profiles</CardTitle>
          <CardDescription className="mb-3">
            Most recently seen profiles.
          </CardDescription>
          {indexedProfiles.error ? (
            <div className="mb-3 text-xs text-[#ff5a7a]">
              Failed to load indexed profiles: {indexedProfiles.error.message}
            </div>
          ) : null}
          <div className="space-y-2 text-xs text-[rgba(233,228,255,0.75)]">
            {indexedList.length ? (
              indexedList.map((profile) => (
                <div
                  key={profile.steam_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <Link
                      href={`/profile/${profile.steam_id}`}
                      className="text-white hover:text-[#9b6cff]"
                    >
                      {profile.persona_name ?? "Unknown"}
                    </Link>
                    <span className="font-mono text-[rgba(233,228,255,0.6)]">
                      {profile.steam_id}
                    </span>
                  </div>
                  <span>{formatTime(profile.last_seen_at)}</span>
                </div>
              ))
            ) : (
              <div className="text-[rgba(233,228,255,0.5)]">
                No indexed profiles.
              </div>
            )}
          </div>
        </Card>
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
        <div className="mt-4 space-y-4 text-xs text-[rgba(233,228,255,0.75)]">
          {reportList.length ? (
            reportList.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-[rgba(155,108,255,0.2)] bg-[rgba(20,16,40,0.5)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[rgba(233,228,255,0.6)]">
                      Case #{report.id}
                    </div>
                    <div className="text-white">
                      {report.target_persona_name ?? "Unknown"} (
                      <Link
                        href={`/profile/${report.target_steam_id}`}
                        className="font-mono text-[rgba(233,228,255,0.7)] hover:text-[#9b6cff]"
                      >
                        {report.target_steam_id}
                      </Link>
                      )
                    </div>
                    <div className="text-[rgba(233,228,255,0.6)]">
                      Reported by {report.reporter_persona_name ?? "Unknown"} (
                      <span className="font-mono">{report.reporter_steam_id}</span>)
                    </div>
                    <div className="text-[rgba(233,228,255,0.6)]">
                      Cheat type: {report.cheat_type}
                    </div>
                    <div className="text-[rgba(233,228,255,0.6)]">
                      Incident date: {formatTime(report.occurred_at)}
                    </div>
                    <div className="text-[rgba(233,228,255,0.6)]">
                      Created: {formatTime(report.created_at)}
                    </div>
                    <a
                      href={report.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#9b6cff] hover:text-white"
                    >
                      View demo
                    </a>
                  </div>
                  <ReportModerationActions
                    reportId={report.id}
                    status={report.status ?? "pending"}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-[rgba(233,228,255,0.5)]">
              No reports yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

