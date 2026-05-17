"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FloatingMenuPanelProps = {
  title: string;
  widthClassName?: string;
  children: ReactNode;
};

export function FloatingMenuPanel({
  title,
  widthClassName = "w-72",
  children,
}: FloatingMenuPanelProps) {
  return (
    <div
      className={cn(
        "absolute bottom-full left-1/2 z-30 mb-3 -translate-x-1/2 rounded-[28px] border border-border/80 bg-card/95 p-3 text-card-foreground shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none",
        widthClassName,
      )}
    >
      <p className="px-2 pb-2 text-sm font-semibold text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
