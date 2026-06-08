"use client";

import { ChevronUp, type LucideIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SplitControlButtonProps = {
  label: string;
  icon: LucideIcon;
  mainAriaLabel: string;
  menuAriaLabel: string;
  isActive?: boolean;
  isDestructive?: boolean;
  isMenuOpen?: boolean;
  isMainDisabled?: boolean;
  level?: number;
  showLevel?: boolean;
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
  isMainDisabled = false,
  level = 0,
  showLevel = false,
  onMainClick,
  onMenuClick,
}: SplitControlButtonProps) {
  const normalizedLevel = Math.min(1, Math.max(0, level));
  const levelOpacity = showLevel && !isMainDisabled && normalizedLevel > 0.02
    ? Math.min(0.85, 0.18 + normalizedLevel * 0.8)
    : 0;
  const levelScale = 1 + normalizedLevel * 0.55;
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={mainAriaLabel}
              disabled={isMainDisabled}
              onClick={onMainClick}
              className={cn(
                "relative flex size-10 items-center justify-center overflow-visible rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                "motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:transform-none",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
                toneClassName,
                !isMainDisabled && hoverToneClassName,
              )}
            >
              {showLevel ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full border border-emerald-300/60 bg-emerald-300/10 shadow-[0_0_0_1px_rgba(110,231,183,0.18)] transition-[opacity,transform] motion-safe:duration-75 motion-reduce:hidden"
                  style={{
                    opacity: levelOpacity,
                    transform: `scale(${levelScale})`,
                  }}
                />
              ) : null}
              <Icon className="relative z-10 h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>{menuAriaLabel}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
