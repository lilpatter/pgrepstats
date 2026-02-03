import Link from "next/link";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { getSteamSession } from "@/lib/steam-auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

function formatTime(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export async function TopBar() {
  const session = await getSteamSession();
  const supabase = createSupabaseServerClient();
  const notifications =
    session && supabase
      ? await supabase
          .from("pgrep_notifications")
          .select("id, message, created_at")
          .eq("recipient_steam_id", session.steamId)
          .order("created_at", { ascending: false })
          .limit(5)
      : null;
  const updates = [
    {
      date: "2026-02-05",
      message: "Faceit matches, hubs, and tournaments now load live data.",
    },
    {
      date: "2026-02-02",
      message: "Reputation tab adds trust rating breakdown and anomalies.",
    },
    {
      date: "2026-01-29",
      message: "Steam sign-in, profile dropdown, and Faceit tabs are live.",
    },
    {
      date: "2026-01-27",
      message: "Steam tab refreshed with friends, recent games, and status.",
    },
  ].sort((a, b) => b.date.localeCompare(a.date));
  const notificationCount = notifications?.data?.length ?? 0;
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[rgba(155,108,255,0.2)] bg-[rgba(8,6,20,0.7)] px-6 py-4 backdrop-blur">
      <div className="hidden w-[520px] lg:block">
        <SearchBar
          placeholder="Find players: Steam | Leetify | FACEIT"
          className="space-y-0"
          inputClassName="text-xs"
          iconClassName="h-3 w-3"
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* TODO: WIP badge — replace with live release/status indicator. */}
        <span className="hidden rounded-full border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.6)] md:inline-flex">
          Work in progress
        </span>
        <details className="group relative">
          <summary className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] text-[#9b6cff] transition-all hover:-translate-y-0.5 hover:text-white">
            <Bell className={`h-4 w-4 ${notificationCount ? "animate-bell" : ""}`} />
            {notificationCount ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[rgba(255,90,122,0.6)] bg-[rgba(255,90,122,0.85)] px-1 text-[10px] font-semibold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            ) : null}
          </summary>
          <div className="dropdown-panel absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.95)] p-4 text-sm text-[rgba(233,228,255,0.8)] shadow-xl">
            {session ? (
              <>
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                  Notifications
                </div>
                <div className="space-y-3 text-xs">
                  {notifications?.data?.length ? (
                    notifications.data.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[rgba(155,108,255,0.2)] bg-[rgba(20,16,40,0.6)] p-3"
                      >
                        <div className="text-[rgba(233,228,255,0.6)]">
                          {formatTime(item.created_at)}
                        </div>
                        <div className="mt-1 text-white">{item.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-[rgba(155,108,255,0.2)] bg-[rgba(20,16,40,0.6)] p-3 text-[rgba(233,228,255,0.6)]">
                      No notifications yet.
                    </div>
                  )}
                </div>
                <div className="my-4 h-px bg-[rgba(155,108,255,0.2)]" />
              </>
            ) : null}
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
              Updates
            </div>
            <div className="space-y-3 text-xs">
              {updates.map((update) => (
                <div
                  key={`${update.date}-${update.message}`}
                  className="rounded-xl border border-[rgba(155,108,255,0.2)] bg-[rgba(20,16,40,0.6)] p-3"
                >
                  <div className="text-[rgba(233,228,255,0.6)]">
                    {update.date}
                  </div>
                  <div className="mt-1 text-white">{update.message}</div>
                </div>
              ))}
            </div>
          </div>
        </details>
        {session ? (
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-[rgba(155,108,255,0.35)]">
                <ImageWithFallback
                  src={session.avatar ?? ""}
                  alt={session.personaName}
                  fill
                  sizes="32px"
                  fallbackText="PG"
                  fallbackClassName="bg-gradient-to-br from-[#7c4dff] to-[#56d1ff] text-[10px] font-bold text-white"
                />
              </div>
              <span>{session.personaName}</span>
            </summary>
            <div className="dropdown-panel absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.95)] p-3 text-sm text-[rgba(233,228,255,0.8)] shadow-xl">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                My Account
              </div>
              <Link
                href={`/profile/${session.steamId}`}
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-[rgba(233,228,255,0.9)] transition hover:bg-[rgba(155,108,255,0.15)]"
              >
                <User className="h-4 w-4 text-[#9b6cff]" />
                View Profile
              </Link>
              {/* TODO: WIP — implement account settings (email, privacy, API keys). */}
              <button
                type="button"
                className="mt-1 flex w-full cursor-not-allowed items-center gap-2 rounded-xl px-2 py-2 text-left text-[rgba(233,228,255,0.4)]"
                title="In the works"
              >
                <Settings className="h-4 w-4 text-[rgba(233,228,255,0.4)]" />
                Account Settings
                <span className="ml-auto rounded-full border border-[rgba(155,108,255,0.2)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.4)]">
                  WIP
                </span>
              </button>
              <div className="my-2 h-px bg-[rgba(155,108,255,0.2)]" />
              <Link
                href="/api/auth/logout"
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-[#ff5a7a] transition hover:bg-[rgba(255,90,122,0.15)]"
              >
                <LogOut className="h-4 w-4 text-[#ff5a7a]" />
                Sign out
              </Link>
            </div>
          </details>
        ) : (
          <a
            href="/api/auth/steam/login"
            className="flex items-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-3 py-2 text-sm font-semibold text-white transition hover:border-[rgba(155,108,255,0.6)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(155,108,255,0.35)] bg-[rgba(12,9,26,0.9)]">
              <svg
                fill="#FFFFFF"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 50 50"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M 25 3 C 13.59 3 4.209375 11.680781 3.109375 22.800781 L 14.300781 28.529297 C 15.430781 27.579297 16.9 27 18.5 27 L 18.550781 27 C 18.940781 26.4 19.389375 25.649141 19.859375 24.869141 C 20.839375 23.259141 21.939531 21.439062 23.019531 20.039062 C 23.259531 15.569063 26.97 12 31.5 12 C 36.19 12 40 15.81 40 20.5 C 40 25.03 36.430937 28.740469 31.960938 28.980469 C 30.560938 30.060469 28.750859 31.160859 27.130859 32.130859 C 26.350859 32.610859 25.6 33.059219 25 33.449219 L 25 33.5 C 25 37.09 22.09 40 18.5 40 C 14.91 40 12 37.09 12 33.5 C 12 33.33 12.009531 33.17 12.019531 33 L 3.2792969 28.519531 C 4.9692969 38.999531 14.05 47 25 47 C 37.15 47 47 37.15 47 25 C 47 12.85 37.15 3 25 3 z M 31.5 14 C 27.92 14 25 16.92 25 20.5 C 25 24.08 27.92 27 31.5 27 C 35.08 27 38 24.08 38 20.5 C 38 16.92 35.08 14 31.5 14 z M 31.5 16 C 33.99 16 36 18.01 36 20.5 C 36 22.99 33.99 25 31.5 25 C 29.01 25 27 22.99 27 20.5 C 27 18.01 29.01 16 31.5 16 z M 18.5 29 C 17.71 29 16.960313 29.200312 16.320312 29.570312 L 19.640625 31.269531 C 20.870625 31.899531 21.350469 33.410625 20.730469 34.640625 C 20.280469 35.500625 19.41 36 18.5 36 C 18.11 36 17.729375 35.910469 17.359375 35.730469 L 14.029297 34.019531 C 14.289297 36.259531 16.19 38 18.5 38 C 20.99 38 23 35.99 23 33.5 C 23 31.01 20.99 29 18.5 29 z"></path>
              </svg>
            </span>
            Sign in with Steam
          </a>
        )}
      </div>
    </header>
  );
}

