"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ProgressRing = dynamic(
  () => import("@/components/charts/ProgressRing").then((mod) => mod.ProgressRing),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[120px] w-[120px] items-center justify-center">
        <Skeleton className="h-20 w-20 rounded-full" />
      </div>
    ),
  }
);

const FaceitStats = dynamic(
  () => import("@/components/profile/FaceitStats").then((mod) => mod.FaceitStats),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[rgba(155,108,255,0.2)] bg-[rgba(12,9,26,0.7)] p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-32 w-full" />
      </div>
    ),
  }
);

export function ClientProgressRing({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return <ProgressRing value={value} label={label} />;
}

export function ClientFaceitStats(props: {
  faceitProfile: Record<string, unknown> | null;
  statsCs2: Record<string, unknown> | null;
  statsCsgo: Record<string, unknown> | null;
  historyCs2: Record<string, unknown> | null;
  historyCsgo: Record<string, unknown> | null;
  hubs: Record<string, unknown> | null;
  teams: Record<string, unknown> | null;
  tournaments: Record<string, unknown> | null;
}) {
  return <FaceitStats {...props} />;
}
