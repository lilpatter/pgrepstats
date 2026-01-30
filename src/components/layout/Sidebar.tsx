import Link from "next/link";
import {
  BookOpen,
  Flag,
  Home,
  LayoutDashboard,
  Megaphone,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSteamSession } from "@/lib/steam-auth";
import { isAdminSteamId } from "@/lib/admin";

const navItems = [
  { label: "Home", href: "/", icon: Home, available: true },
  { label: "Profile", href: "/profile", icon: User, available: true },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, available: false },
  { label: "AI Flags", href: "/ai-flags", icon: Sparkles, available: true },
  { label: "Reported Players", href: "/reported-players", icon: Flag, available: true },
  { label: "Docs / API", href: "/docs", icon: BookOpen, available: false },
  { label: "Feature Requests", href: "/feature-requests", icon: Megaphone, available: false },
];

export async function Sidebar() {
  const session = await getSteamSession();
  const profileHref = session ? `/profile/${session.steamId}` : "/profile";
  const isAdmin = isAdminSteamId(session?.steamId ?? null);
  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-[rgba(155,108,255,0.2)] bg-[rgba(8,6,20,0.95)] p-6 md:flex">
      <div className="flex items-center gap-2 text-xl font-semibold text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c4dff] to-[#9b6cff] shadow-[0_0_25px_rgba(124,77,255,0.6)]">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        PGREP
      </div>

      <div className="mt-10 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
        General
      </div>
      <nav className="mt-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = item.label === "Profile" ? profileHref : item.href;
          if (!item.available) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[rgba(233,228,255,0.35)]"
                title="In the works"
              >
                {/* TODO: WIP — build sections for dashboard, AI flags, reports, docs. */}
                <Icon className="h-4 w-4 text-[rgba(155,108,255,0.35)]" />
                {item.label}
                <span className="ml-auto rounded-full border border-[rgba(155,108,255,0.2)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.35)]">
                  WIP
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[rgba(233,228,255,0.7)] transition hover:bg-[rgba(124,77,255,0.15)] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 text-[#9b6cff]" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[rgba(233,228,255,0.7)] transition hover:bg-[rgba(124,77,255,0.15)] hover:text-white"
            )}
          >
            <ShieldAlert className="h-4 w-4 text-[#9b6cff]" />
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="mt-10 text-xs uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
        Support
      </div>
      <nav className="mt-4 space-y-2">
        <div
          className="flex cursor-not-allowed items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[rgba(233,228,255,0.35)]"
          title="In the works"
        >
          {/* TODO: WIP — add support center with tickets + FAQ search. */}
          <Sparkles className="h-4 w-4 text-[rgba(86,209,255,0.35)]" />
          Support Center
          <span className="ml-auto rounded-full border border-[rgba(155,108,255,0.2)] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.35)]">
            WIP
          </span>
        </div>
      </nav>

      <div className="mt-auto rounded-3xl border border-[rgba(155,108,255,0.3)] bg-[rgba(20,16,40,0.6)] p-4 text-sm text-[rgba(233,228,255,0.7)]">
        Upgrade to PGREP Pro for deeper insights and AI-powered reports.
        {/* TODO: WIP — add pricing page and checkout flow for Pro. */}
        <div className="mt-4 flex cursor-not-allowed items-center justify-center rounded-2xl border border-[rgba(155,108,255,0.2)] py-2 text-sm font-semibold text-[rgba(233,228,255,0.35)]">
          Get Pro (WIP)
        </div>
      </div>
    </aside>
  );
}

