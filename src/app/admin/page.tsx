import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

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

  const cutoff = new Date(
    Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const [activeUsers, indexedProfiles] = await Promise.all([
    supabase
      .from("pgrep_users")
      .select("steam_id, last_seen_at")
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false })
      .limit(200),
    supabase
      .from("pgrep_profiles")
      .select("steam_id, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(200),
  ]);

  const activeList = activeUsers.data ?? [];
  const indexedList = indexedProfiles.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold text-white">Admin Dashboard</div>
        <div className="text-sm text-[rgba(233,228,255,0.6)]">
          Active window: last {ACTIVE_WINDOW_MINUTES} minutes
        </div>
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
          <div className="space-y-2 text-xs text-[rgba(233,228,255,0.75)]">
            {activeList.length ? (
              activeList.map((user) => (
                <div
                  key={user.steam_id}
                  className="flex items-center justify-between"
                >
                  <span className="font-mono">{user.steam_id}</span>
                  <span>{formatTime(user.last_seen_at)}</span>
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
          <div className="space-y-2 text-xs text-[rgba(233,228,255,0.75)]">
            {indexedList.length ? (
              indexedList.map((profile) => (
                <div
                  key={profile.steam_id}
                  className="flex items-center justify-between"
                >
                  <span className="font-mono">{profile.steam_id}</span>
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
    </div>
  );
}

