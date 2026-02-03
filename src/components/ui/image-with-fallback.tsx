"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageWithFallbackProps = ImageProps & {
  fallbackText?: string;
  fallbackClassName?: string;
};

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackText,
  fallbackClassName,
  ...props
}: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);
  const isFill = "fill" in props && Boolean(props.fill);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(155,108,255,0.25)] bg-[rgba(10,7,20,0.6)] text-[rgba(233,228,255,0.6)]",
          isFill ? "absolute inset-0" : "",
          fallbackClassName
        )}
      >
        <ImageOff className="h-4 w-4 text-[rgba(155,108,255,0.65)]" />
        {fallbackText ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
            {fallbackText}
          </span>
        ) : null}
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      onError={() => setErrored(true)}
    />
  );
}
