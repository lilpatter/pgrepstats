import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { getSteamSession } from "@/lib/steam-auth";

export async function TopBar() {
  const session = await getSteamSession();
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
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] text-[#9b6cff] transition hover:text-white">
            <Bell className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.95)] p-4 text-sm text-[rgba(233,228,255,0.8)] shadow-xl">
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
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-3 py-2 text-sm font-semibold text-white">
              <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-[rgba(155,108,255,0.35)]">
                {session.avatar ? (
                  <Image
                    src={session.avatar}
                    alt={session.personaName}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7c4dff] to-[#56d1ff] text-[10px] font-bold text-white">
                    PG
                  </div>
                )}
              </div>
              <span>{session.personaName}</span>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.95)] p-3 text-sm text-[rgba(233,228,255,0.8)] shadow-xl">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
                My Account
              </div>
              <Link
                href={`/profile/${session.steamId}`}
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-[rgba(233,228,255,0.9)] transition hover:bg-[rgba(155,108,255,0.15)]"
              >
                <span className="text-base">👤</span>
                View Profile
              </Link>
              {/* TODO: WIP — implement account settings (email, privacy, API keys). */}
              <button
                type="button"
                className="mt-1 flex w-full cursor-not-allowed items-center gap-2 rounded-xl px-2 py-2 text-left text-[rgba(233,228,255,0.4)]"
                title="In the works"
              >
                <span className="text-base">⚙️</span>
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
                <span className="text-base">⤴️</span>
                Sign out
              </Link>
            </div>
          </details>
        ) : (
          <Link
            href="/api/auth/steam/login"
            className="flex items-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.6)] px-3 py-2 text-sm font-semibold text-white transition hover:border-[rgba(155,108,255,0.6)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c4dff] to-[#56d1ff] text-xs font-bold text-white">
              PG
            </span>
            Sign in with Steam
          </Link>
        )}
      </div>
    </header>
  );
}

