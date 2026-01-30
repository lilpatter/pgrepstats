import { createHmac } from "crypto";
import { cookies } from "next/headers";

export type SteamSession = {
  steamId: string;
  personaName: string;
  avatar: string;
  profileUrl: string;
};

const COOKIE_NAME = "pgrep_steam_session";

function getSecret() {
  return process.env.STEAM_SESSION_SECRET ?? process.env.STEAM_WEB_API_KEY ?? "";
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function encodeSteamSession(session: SteamSession) {
  const secret = getSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify(session), "utf-8").toString("base64");
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function decodeSteamSession(raw?: string | null) {
  const secret = getSecret();
  if (!raw || !secret) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  if (expected !== signature) return null;
  try {
    const json = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(json) as SteamSession;
  } catch {
    return null;
  }
}

export async function getSteamSession() {
  const jar = await cookies();
  return decodeSteamSession(jar.get(COOKIE_NAME)?.value ?? null);
}

export function clearSteamSessionCookie(response: Response) {
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function setSteamSessionCookie(response: Response, value: string) {
  const maxAge = 60 * 60 * 24 * 30;
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

export function getSteamIdFromOpenId(identity?: string | null) {
  if (!identity) return null;
  const match = identity.match(/https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
  return match?.[1] ?? null;
}

export function buildOpenIdLoginUrl(origin: string) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/auth/steam/callback`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

export async function verifyOpenIdResponse(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  params.set("openid.mode", "check_authentication");
  const res = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  return text.includes("is_valid:true");
}

