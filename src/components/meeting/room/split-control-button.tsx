"use client";

import { ChevronUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SplitControlButtonProps = {
  label: string;
  icon: LucideIcon;
  mainAriaLabel: string;
  menuAriaLabel: string;
  isActive?: boolean;
  isDestructive?: boolean;
  isMenuOpen?: boolean;
  onMainClick: () => void;
  onMenuClick: () => void;
};

export function SplitControlButton({
  label,
  icon: Icon,
  mainAriaLabel,
  menuAriaLabel,
  isActive = false,
  isDestructive = false,
  isMenuOpen = false,
  onMainClick,
  onMenuClick,
}: SplitControlButtonProps) {
  const toneClassName = isActive
    ? "bg-primary text-primary-foreground"
    : isDestructive
      ? "bg-destructive text-destructive-foreground"
      : "bg-secondary text-secondary-foreground";

  const hoverToneClassName = isActive
    ? "hover:bg-primary/90"
    : isDestructive
      ? "hover:bg-destructive/90"
      : "hover:bg-secondary/85";

  return (
    <div className="relative">
      <div className="flex items-center rounded-full bg-background/75 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <button
          type="button"
          aria-label={mainAriaLabel}
          title={label}
          onClick={onMainClick}
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            "motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:transform-none",
            toneClassName,
            hoverToneClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label={menuAriaLabel}
          aria-expanded={isMenuOpen}
          onClick={onMenuClick}
          className={cn(
            "flex h-10 w-7 items-center justify-center rounded-full text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            "motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:transform-none",
            isMenuOpen ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground",
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
