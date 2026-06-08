"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { useCopyMeetingLink } from "@/features/meeting/room/hooks/use-copy-meeting-link";

type RoomFooterMeetingInfoProps = {
  meetingCode: string;
};

const MEETING_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(now: Date) {
  return MEETING_TIME_FORMATTER.format(now);
}

export function RoomFooterMeetingInfo({ meetingCode }: RoomFooterMeetingInfoProps) {
  const [now, setNow] = useState(() => new Date());
  const { copied, copyMeetingLink } = useCopyMeetingLink(meetingCode);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="pointer-events-auto order-2 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:order-1 lg:justify-start">
      <span className="font-semibold text-foreground">{formatTime(now)}</span>
      <span className="text-border">|</span>
      <div className="flex items-center gap-2">
        <span className="tracking-wide">{meetingCode}</span>
        <button
          type="button"
          aria-label="Copy meeting link"
          onClick={() => void copyMeetingLink()}
          className="flex size-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
