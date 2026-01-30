import { NextResponse } from "next/server";
import { buildOpenIdLoginUrl } from "@/lib/steam-auth";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(buildOpenIdLoginUrl(origin));
}

