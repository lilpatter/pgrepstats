import { cookies } from "next/headers";

const CSRF_COOKIE = "pgrep_csrf";

export function getCsrfTokenFromCookie() {
  return cookies().get(CSRF_COOKIE)?.value ?? null;
}

export function verifyCsrf(request: Request) {
  const header = request.headers.get("x-csrf-token");
  const cookie = getCsrfTokenFromCookie();
  if (!cookie || !header) return false;
  return cookie === header;
}
