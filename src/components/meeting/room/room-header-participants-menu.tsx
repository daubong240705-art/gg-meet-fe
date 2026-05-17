import { ChevronRight, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { useHoverDisclosure } from "@/features/meeting/room/hooks";

import type { Participant, SidebarPanel } from "./types";

type RoomHeaderParticipantsMenuProps = {
  participants: Participant[];
  onPanelChange: (panel: SidebarPanel) => void;
};

export function RoomHeaderParticipantsMenu({
  participants,
  onPanelChange,
}: RoomHeaderParticipantsMenuProps) {
  const {
    ref: participantsMenuRef,
    isOpen: isParticipantsMenuOpen,
    setIsOpen: setIsParticipantsMenuOpen,
    open: openParticipantsMenu,
    scheduleClose: scheduleParticipantsMenuClose,
    clearCloseTimeout: clearParticipantsMenuCloseTimeout,
  } = useHoverDisclosure<HTMLDivElement>();

  return (
    <div
      ref={participantsMenuRef}
      className="relative after:absolute after:inset-x-0 after:top-full after:h-3 after:content-['']"
      onMouseEnter={openParticipantsMenu}
      onMouseLeave={scheduleParticipantsMenuClose}
    >
      <button
        type="button"
        aria-label="Open participants overview"
        aria-expanded={isParticipantsMenuOpen}
        onClick={() => {
          clearParticipantsMenuCloseTimeout();
          setIsParticipantsMenuOpen((currentValue) => !currentValue);
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-[0_10px_24px_rgba(2,6,23,0.22)] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Users className="h-4 w-4" />
        </div>
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
          {participants.length}
        </span>
      </button>

      {isParticipantsMenuOpen ? (
        <Card className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] border border-border/80 bg-card/95 p-4 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Participants
              </p>
              <p className="text-xs text-muted-foreground">
                {participants.length} in the call
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {participants.slice(0, 6).map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 px-3 py-2.5"
              >
                <UserAvatar
                  avatarUrl={participant.avatarUrl}
                  name={participant.name}
                  email={participant.avatarSource}
                  className="h-10 w-10 bg-primary/20 text-sm"
                  initialsClassName="text-sm"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {participant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participant.isLocal ? "You" : participant.status}
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                setIsParticipantsMenuOpen(false);
                onPanelChange("participants");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              View all participants
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
