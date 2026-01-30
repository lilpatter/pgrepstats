"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#7c4dff] via-[#9b6cff] to-[#6d39ff] text-white shadow-[0_0_30px_rgba(124,77,255,0.45)] hover:shadow-[0_0_45px_rgba(124,77,255,0.6)]",
  secondary:
    "border border-[rgba(155,108,255,0.45)] bg-[rgba(20,16,40,0.5)] text-white hover:bg-[rgba(31,24,60,0.7)]",
  ghost:
    "bg-transparent text-[rgba(233,228,255,0.8)] hover:text-white hover:bg-[rgba(124,77,255,0.12)]",
};

export function Button({
  className,
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition duration-300",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

