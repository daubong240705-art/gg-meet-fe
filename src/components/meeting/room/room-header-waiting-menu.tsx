import { useEffect } from "react";
import { ChevronRight, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHoverDisclosure } from "@/features/meeting/room/hooks";

import type { SidebarPanel, WaitingParticipant } from "./types";
import { getInitials } from "./utils";

type RoomHeaderWaitingMenuProps = {
  canManageWaitingRoom: boolean;
  waitingParticipants: WaitingParticipant[];
  onPanelChange: (panel: SidebarPanel) => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
};

export function RoomHeaderWaitingMenu({
  canManageWaitingRoom,
  waitingParticipants,
  onPanelChange,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
}: RoomHeaderWaitingMenuProps) {
  const {
    ref: waitingMenuRef,
    isOpen: isWaitingMenuOpen,
    setIsOpen: setIsWaitingMenuOpen,
    open: openWaitingMenu,
    scheduleClose: scheduleWaitingMenuClose,
    clearCloseTimeout: clearWaitingMenuCloseTimeout,
  } = useHoverDisclosure<HTMLDivElement>();

  useEffect(() => {
    if (!canManageWaitingRoom) {
      setIsWaitingMenuOpen(false);
    }
  }, [canManageWaitingRoom, setIsWaitingMenuOpen]);

  if (!canManageWaitingRoom || waitingParticipants.length === 0) {
    return null;
  }

  return (
    <div
      ref={waitingMenuRef}
      className="relative after:absolute after:inset-x-0 after:top-full after:h-3 after:content-['']"
      onMouseEnter={openWaitingMenu}
      onMouseLeave={scheduleWaitingMenuClose}
    >
      <button
        type="button"
        aria-label="Open waiting room requests"
        aria-expanded={isWaitingMenuOpen}
        onClick={() => {
          clearWaitingMenuCloseTimeout();
          setIsWaitingMenuOpen((currentValue) => !currentValue);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-3"
      >
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">
          {waitingParticipants.length === 1
            ? "Allow 1 guest in"
            : `Allow ${waitingParticipants.length} guests in`}
        </span>
        <span className="sm:hidden">{waitingParticipants.length}</span>
      </button>

      {isWaitingMenuOpen ? (
        <Card className="absolute right-0 top-full z-30 mt-3 w-[min(26rem,calc(100vw-2rem))] border border-border/80 bg-card/95 p-4 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Waiting to join
              </p>
              <p className="text-xs text-muted-foreground">
                {waitingParticipants.length} request{waitingParticipants.length > 1 ? "s" : ""} pending
              </p>
            </div>

            {waitingParticipants.length > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full border border-primary/25 bg-primary/10 px-3 text-primary hover:bg-primary/20"
                onClick={onApproveAllWaitingParticipants}
              >
                Admit all
              </Button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {waitingParticipants.slice(0, 3).map((participant) => (
              <div
                key={participant.participantId}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 p-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary-foreground">
                  {getInitials(participant.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {participant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Waiting for host approval
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                    onClick={() => onApproveWaitingParticipant(participant)}
                  >
                    Admit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onRejectWaitingParticipant(participant)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setIsWaitingMenuOpen(false);
                onPanelChange("participants");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              View all ({waitingParticipants.length})
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
