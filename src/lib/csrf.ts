import { cookies } from "next/headers";

const CSRF_COOKIE = "pgrep_csrf";

export async function getCsrfTokenFromCookie() {
  const jar = await cookies();
  return jar.get(CSRF_COOKIE)?.value ?? null;
}

export async function verifyCsrf(request: Request) {
  const header = request.headers.get("x-csrf-token");
  const cookie = await getCsrfTokenFromCookie();
  if (!cookie || !header) return false;
  return cookie === header;
}
