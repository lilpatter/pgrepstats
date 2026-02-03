"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export function MapPreviewImage({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(10,7,20,0.6)] text-[rgba(233,228,255,0.55)]">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

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
