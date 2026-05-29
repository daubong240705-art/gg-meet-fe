import { Monitor } from "lucide-react";

import type { Participant } from "../types";

type RoomHeaderPresentingTabsProps = {
  screenShareParticipants: Participant[];
  screenShareParticipant: Participant | null;
  onScreenShareParticipantChange: (participantId: string) => void;
};

function getScreenShareTabLabel(participant: Participant) {
  return participant.isLocal ? "You" : participant.name;
}

export function RoomHeaderPresentingTabs({
  screenShareParticipants,
  screenShareParticipant,
  onScreenShareParticipantChange,
}: RoomHeaderPresentingTabsProps) {
  return (
    <div className="col-span-2 row-start-2 flex min-w-0 justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
      <div className="flex min-w-0 max-w-[min(42rem,calc(100vw-2rem))] items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-slate-950/55 px-2 py-1 text-white shadow-[0_10px_28px_rgba(2,6,23,0.28)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-center gap-1.5 px-1.5 text-[11px] font-medium text-white/75">
          <Monitor className="h-3.5 w-3.5" />
          <span>Presenting</span>
        </div>

        {screenShareParticipants.map((participant) => {
          const isSelectedScreenShare =
            participant.id === screenShareParticipant?.id;

          return (
            <button
              key={participant.id}
              type="button"
              onClick={() => onScreenShareParticipantChange(participant.id)}
              aria-label={`View ${getScreenShareTabLabel(participant)} screen share`}
              className={
                "flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none "
                + (isSelectedScreenShare
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/10 bg-white/[0.08] text-white/75 hover:bg-white/[0.12] hover:text-white")
              }
            >
              <span className="max-w-28 truncate">
                {getScreenShareTabLabel(participant)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
