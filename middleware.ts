import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? "120");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSRF_COOKIE = "pgrep_csrf";

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");

  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value ?? null;
  const needsCsrf = !csrfCookie && !isApi;

  if (!isApi) {
    if (!needsCsrf) return NextResponse.next();
    const response = NextResponse.next();
    const token = crypto.randomUUID();
    response.cookies.set(CSRF_COOKIE, token, {
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
    return response;
  }

  if (pathname.startsWith("/api/refresh/worker")) {
    return NextResponse.next();
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.next();
  }

  const key = getClientKey(request);
  const url = `${SUPABASE_URL}/rest/v1/rpc/pgrep_rate_limit_check`;

  return fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_key: key,
      p_window_ms: WINDOW_MS,
      p_max: MAX_REQUESTS,
    }),
  })
    .then(async (res) => {
      if (!res.ok) return NextResponse.next();
      const data = (await res.json().catch(() => null)) as
        | Array<{ allowed: boolean; retry_after: number }>
        | null;
      const row = data?.[0];
      if (!row || row.allowed) return NextResponse.next();
      const retryAfter = Math.max(1, Math.ceil(row.retry_after ?? 1));
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded. Try again later.",
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    })
    .catch(() => NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next|favicon.ico|.*\\..*).*)"],
};
