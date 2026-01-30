"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 60_000;

async function sendHeartbeat(path: string) {
  try {
    await fetch("/api/track/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  } catch {
    // Ignore heartbeat failures.
  }
}

export function PresenceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    sendHeartbeat(pathname);

    const timer = window.setInterval(() => {
      sendHeartbeat(pathname);
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [pathname]);

  return null;
}

