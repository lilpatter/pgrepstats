import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[rgba(155,108,255,0.15)]",
        className
      )}
    />
  );
}
