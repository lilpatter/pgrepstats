import { NextResponse } from "next/server";
import { clearSteamSessionCookie } from "@/lib/steam-auth";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(origin);
  clearSteamSessionCookie(response);
  return response;
}
