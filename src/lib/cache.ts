import { createHash } from "crypto";
import { NextResponse } from "next/server";

export function jsonWithCache(
  request: Request,
  data: unknown,
  {
    maxAgeSeconds = 60,
    staleWhileRevalidateSeconds = 120,
  }: {
    maxAgeSeconds?: number;
    staleWhileRevalidateSeconds?: number;
  } = {}
) {
  const body = JSON.stringify(data);
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": `s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
      },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": `s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
    },
  });
}
