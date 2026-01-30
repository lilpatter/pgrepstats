"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  className,
  children,
}: {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("space-y-6", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(20,16,40,0.55)] p-2",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  disabled,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("TabsTrigger must be used within Tabs");
  }
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          ctx.setValue(value);
        }
      }}
      disabled={disabled}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition",
        disabled
          ? "cursor-not-allowed text-[rgba(233,228,255,0.35)]"
          : isActive
          ? "bg-gradient-to-r from-[#7c4dff] to-[#9b6cff] text-white shadow-[0_0_20px_rgba(124,77,255,0.4)]"
          : "text-[rgba(233,228,255,0.7)] hover:text-white",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("TabsContent must be used within Tabs");
  }
  if (ctx.value !== value) {
    return null;
  }
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
