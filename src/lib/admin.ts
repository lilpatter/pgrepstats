import { getSteamSession } from "@/lib/steam-auth";

function parseAdminIds() {
  const raw = process.env.ADMIN_STEAM_IDS ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdminSteamId(steamId?: string | null) {
  if (!steamId) return false;
  const adminIds = parseAdminIds();
  return adminIds.includes(steamId);
}

export async function requireAdminSession() {
  const session = await getSteamSession();
  const isAdmin = isAdminSteamId(session?.steamId ?? null);
  return { session, isAdmin };
}

