import { NextResponse } from "next/server";
import { getSteamSession } from "@/lib/steam-auth";
import { isAdminSteamId } from "@/lib/admin";

export async function GET() {
  const session = await getSteamSession();
  return NextResponse.json({
    session: session ?? null,
    isAdmin: isAdminSteamId(session?.steamId ?? null),
  });
}
