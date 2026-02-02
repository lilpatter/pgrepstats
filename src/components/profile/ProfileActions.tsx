"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProfileActions({
  initialRefreshedAt,
  steamId,
}: {
  initialRefreshedAt: number | null;
  steamId?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(
    initialRefreshedAt
  );
  const [relativeLabel, setRelativeLabel] = useState<string>(() =>
    initialRefreshedAt ? "Just now" : "Never refreshed"
  );
  const [refreshState, setRefreshState] = useState<
    "idle" | "refreshing" | "queued"
  >("idle");
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const router = useRouter();

  const triggerToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      triggerToast("Profile URL copied.");
    } catch {
      triggerToast("Unable to copy URL.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "PGREP Player Profile",
        url: window.location.href,
      });
      triggerToast("Share sheet opened.");
    } else {
      await handleCopy();
    }
  };

  const handleRefresh = async () => {
    if (!steamId) {
      triggerToast("Missing Steam ID.");
      return;
    }
    setRefreshState("refreshing");
    setCooldownSeconds(null);
    triggerToast("Refreshing stats...");
    try {
      const res = await fetch("/api/profile/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        if (res.status === 429) {
          const retryAfter = Number(payload?.retryAfterSec ?? 0);
          if (retryAfter > 0) setCooldownSeconds(retryAfter);
          setRefreshState("idle");
          triggerToast(payload?.error ?? "Refresh cooldown active.");
          return;
        }
        setRefreshState("idle");
        triggerToast(payload?.error ?? "Refresh failed.");
        return;
      }
      const payload = (await res.json().catch(() => null)) as
        | { refreshedAt?: string; status?: string }
        | null;
      if (payload?.status === "queued" || payload?.status === "processing") {
        setRefreshState("queued");
        triggerToast("Refresh queued. It will update shortly.");
        return;
      }
      if (payload?.refreshedAt) {
        const refreshedAt = new Date(payload.refreshedAt).getTime();
        setLastRefreshedAt(refreshedAt);
        setRelativeLabel("Just now");
        setRefreshState("idle");
        router.refresh();
        return;
      }
      setRefreshState("queued");
      triggerToast("Refresh queued. It will update shortly.");
    } catch {
      setRefreshState("idle");
      triggerToast("Refresh failed.");
    }
  };

  useEffect(() => {
    if (!lastRefreshedAt) {
      setRelativeLabel("Never refreshed");
      return;
    }
    const updateLabel = () => {
      const diffMs = Date.now() - lastRefreshedAt;
      if (diffMs < 60_000) {
        setRelativeLabel("Just now");
        return;
      }
      const minutes = Math.floor(diffMs / 60_000);
      if (minutes < 60) {
        setRelativeLabel(`${minutes} min ago`);
        return;
      }
      const hours = Math.floor(minutes / 60);
      setRelativeLabel(`${hours} hour${hours === 1 ? "" : "s"} ago`);
    };
    updateLabel();
    const interval = setInterval(updateLabel, 5000);
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  useEffect(() => {
    if (!cooldownSeconds || cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (!prev || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  return (
    <div className="relative flex w-full flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          Copy Profile
        </Button>
        <Button variant="secondary" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Share URL
        </Button>
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshState === "refreshing"}
        className="flex items-center gap-2 text-xs text-[rgba(233,228,255,0.7)] transition hover:text-white disabled:cursor-not-allowed disabled:text-[rgba(233,228,255,0.4)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {refreshState === "refreshing" ? "Refreshing..." : "Refresh stats"}
      </button>
      {refreshState === "queued" ? (
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#9b6cff]">
          Refresh queued
        </div>
      ) : null}
      {cooldownSeconds ? (
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#ff8c40]">
          Cooldown {cooldownSeconds}s
        </div>
      ) : null}
      <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
        Refreshed {relativeLabel}
      </div>
      {toast && (
        <div className="absolute -top-10 left-0 rounded-2xl border border-[rgba(155,108,255,0.4)] bg-[rgba(20,16,40,0.9)] px-4 py-2 text-xs text-white shadow-[0_0_24px_rgba(124,77,255,0.4)]">
          {toast}
        </div>
      )}
    </div>
  );
}
