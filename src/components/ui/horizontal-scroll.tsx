"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type HorizontalScrollProps = {
  className?: string;
  children: React.ReactNode;
};

export function HorizontalScroll({ className, children }: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onWheel={(event) => {
        if (!ref.current) return;
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault();
          ref.current.scrollLeft += event.deltaY;
        }
      }}
      className={cn("overflow-x-scroll pb-4", className)}
      style={{ scrollbarGutter: "stable both-edges" }}
      onMouseEnter={() => {
        if (ref.current) {
          ref.current.style.scrollBehavior = "smooth";
          ref.current.style.overscrollBehavior = "contain";
        }
      }}
      onMouseLeave={() => {
        if (ref.current) {
          ref.current.style.overscrollBehavior = "";
        }
      }}
    >
      {children}
    </div>
  );
}

