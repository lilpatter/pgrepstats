"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type HorizontalScrollProps = {
  className?: string;
  children: React.ReactNode;
};

export function HorizontalScroll({ className, children }: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        container.scrollLeft += event.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div
      ref={ref}
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
