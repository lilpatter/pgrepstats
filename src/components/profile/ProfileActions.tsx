"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProfileActions({
  initialRefreshedAt,
  steamId,
}: {
  initialRefreshedAt: number;
  steamId?: string;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(initialRefreshedAt);
  const [minutesAgo, setMinutesAgo] = useState(0);
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
    setLastRefreshedAt(Date.now());
    setMinutesAgo(0);
    triggerToast("Refreshing stats...");
    router.refresh();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const minutes = Math.floor((Date.now() - lastRefreshedAt) / 60000);
      setMinutesAgo(minutes);
    }, 10000);
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

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
        className="flex items-center gap-2 text-xs text-[rgba(233,228,255,0.7)] transition hover:text-white"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh stats
      </button>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[rgba(233,228,255,0.5)]">
        Refreshed {minutesAgo} min ago
      </div>
      {toast && (
        <div className="absolute -top-10 left-0 rounded-2xl border border-[rgba(155,108,255,0.4)] bg-[rgba(20,16,40,0.9)] px-4 py-2 text-xs text-white shadow-[0_0_24px_rgba(124,77,255,0.4)]">
          {toast}
        </div>
      )}
    </div>
  );
}

