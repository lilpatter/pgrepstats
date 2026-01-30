import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[rgba(155,108,255,0.4)] bg-[rgba(124,77,255,0.18)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white",
        className
      )}
      {...props}
    />
  );
}

