"use client";

const CSRF_COOKIE = "pgrep_csrf";

export function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "");
}
