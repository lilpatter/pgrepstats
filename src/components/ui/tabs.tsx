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
        "flex w-full flex-wrap items-center gap-2 rounded-2xl border border-[rgba(155,108,255,0.35)] bg-[rgba(10,8,22,0.75)] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
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
        "flex-1 rounded-xl px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
        disabled
          ? "cursor-not-allowed text-[rgba(233,228,255,0.35)]"
          : isActive
          ? "bg-[rgba(124,77,255,0.4)] text-white shadow-[0_0_20px_rgba(124,77,255,0.35)]"
          : "text-[rgba(233,228,255,0.65)] hover:text-white hover:bg-[rgba(124,77,255,0.15)]",
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
