import { getSteamSession } from "@/lib/steam-auth";
import { isAdminSteamId } from "@/lib/admin";
import { SidebarClient } from "@/components/layout/SidebarClient";

export async function Sidebar() {
  const session = await getSteamSession();
  const isAdmin = isAdminSteamId(session?.steamId ?? null);
  return (
    <SidebarClient initialSession={session} initialIsAdmin={isAdmin} />
  );
}

