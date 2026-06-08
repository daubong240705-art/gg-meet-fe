"use client";

import { ChevronDown, ChevronUp, Keyboard, MessageSquare, Users } from "lucide-react";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { SidebarPanel } from "../types";

type RoomFooterPanelButtonsProps = {
  participantsCount: number;
  unreadChatCount: number;
  activePanel: SidebarPanel;
  isCompactControlsOpen: boolean;
  onToggleCompactControls: () => void;
  onTogglePanel: (panel: Exclude<SidebarPanel, null>) => void;
  onOpenShortcuts: () => void;
};

function PanelButtonTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function RoomFooterPanelButtons({
  participantsCount,
  unreadChatCount,
  activePanel,
  isCompactControlsOpen,
  onToggleCompactControls,
  onTogglePanel,
  onOpenShortcuts,
}: RoomFooterPanelButtonsProps) {
  return (
    <div className="pointer-events-auto order-3 flex items-center justify-center gap-2 lg:justify-end">
      <PanelButtonTooltip label={isCompactControlsOpen ? "Hide meeting controls" : "Open meeting controls"}>
        <button
          type="button"
          aria-label={isCompactControlsOpen ? "Hide meeting controls" : "Open meeting controls"}
          aria-expanded={isCompactControlsOpen}
          onClick={onToggleCompactControls}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground transition motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none lg:hidden",
            isCompactControlsOpen && "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isCompactControlsOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>
      </PanelButtonTooltip>

      <PanelButtonTooltip label="Keyboard shortcuts (?)">
        <button
          type="button"
          aria-label="Open keyboard shortcuts"
          onClick={onOpenShortcuts}
          className="relative flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground transition motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none"
        >
          <Keyboard className="h-5 w-5" />
        </button>
      </PanelButtonTooltip>

      <PanelButtonTooltip label="Open participants (P)">
        <button
          type="button"
          aria-label="Open participants"
          onClick={() => onTogglePanel("participants")}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground transition motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none",
            activePanel === "participants" && "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <Users className="h-5 w-5" />
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none",
              activePanel === "participants"
                ? "bg-background text-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {participantsCount}
          </span>
        </button>
      </PanelButtonTooltip>

      <PanelButtonTooltip label="Open chat (C)">
        <button
          type="button"
          aria-label="Open chat"
          onClick={() => onTogglePanel("chat")}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground transition motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none",
            activePanel === "chat" && "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadChatCount > 0 ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none",
                activePanel === "chat"
                  ? "bg-background text-foreground"
                  : "bg-destructive text-destructive-foreground",
              )}
            >
              {unreadChatCount > 99 ? "99+" : unreadChatCount}
            </span>
          ) : null}
        </button>
      </PanelButtonTooltip>
    </div>
  );
}
