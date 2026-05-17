"use client";

import { MessageSquare, Users, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { SidebarTab } from "./types";

type RoomSidebarShellProps = {
  isOpen: boolean;
  currentTab: SidebarTab;
  participantCount: number;
  onTabChange: (panel: SidebarTab) => void;
  onClose: () => void;
  children: ReactNode;
};

export function RoomSidebarShell({
  isOpen,
  currentTab,
  participantCount,
  onTabChange,
  onClose,
  children,
}: RoomSidebarShellProps) {
  return (
    <aside className="flex h-full w-full shrink-0 lg:w-96">
      <Card
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden border border-border/80 bg-card/95 px-0 py-0 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl",
          "motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">Meeting panel</p>
            <p className="text-xs text-muted-foreground">
              {currentTab === "participants" ? "Participants and waiting room" : "Chat in this meeting"}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b border-border/70 p-4">
          <Button
            type="button"
            variant={currentTab === "participants" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 rounded-full border border-transparent text-foreground",
              currentTab === "participants"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                : "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onTabChange("participants")}
          >
            <Users className="h-4 w-4" />
            Participants ({participantCount})
          </Button>
          <Button
            type="button"
            variant={currentTab === "chat" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 rounded-full border border-transparent text-foreground",
              currentTab === "chat"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                : "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => onTabChange("chat")}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Button>
        </div>

        {children}
      </Card>
    </aside>
  );
}
