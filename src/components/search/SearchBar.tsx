"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  placeholder?: string;
  showButton?: boolean;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
};

export function SearchBar({
  placeholder = "Enter SteamID64, Vanity URL, FACEIT profile, or Leetify link...",
  showButton = false,
  className,
  inputClassName,
  iconClassName,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError("Enter a SteamID, vanity URL, or profile link.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/resolve?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok || !data?.steamId) {
        throw new Error(data?.error ?? "Unable to resolve profile.");
      }

      router.push(`/profile/${data.steamId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resolve player.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,7,20,0.6)] px-4 py-3 text-left text-sm text-[rgba(233,228,255,0.7)]">
          <Search className={cn("h-4 w-4 text-[#9b6cff]", iconClassName)} />
          <input
            aria-label="Search player"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className={cn(
              "w-full bg-transparent text-sm text-white placeholder:text-[rgba(233,228,255,0.55)] focus:outline-none",
              inputClassName
            )}
          />
        </div>
        {showButton ? (
          <Button type="submit" variant="primary" className="md:w-44">
            {loading ? "Scanning..." : "Scan Player"}
          </Button>
        ) : (
          <Button type="submit" variant="secondary" className="md:w-32">
            {loading ? "Searching..." : "Search"}
          </Button>
        )}
      </div>
      {error && (
        <div className="text-xs text-[#56d1ff]">{error}</div>
      )}
    </form>
  );
}

