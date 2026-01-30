"use client";

import { useState } from "react";

export function MapPreviewImage({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover blur-[1px] opacity-80"
      loading="lazy"
      onError={() => setHidden(true)}
    />
  );
}

