import Link from "next/link";
import { Clock, Users } from "lucide-react";

import type { UpcomingMeetingResponseData } from "@/shared/services/meeting.service";
import {
  formatUpcomingMeetingStart,
  getUpcomingMeetingStatusLabel,
  getUpcomingMeetingTiming,
} from "@/lib/meeting/upcoming";
import { cn } from "@/lib/utils";

import AuthenticatedMeetingCodeButton from "./authenticated-meeting-code-button";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const getMeetingTitle = (meeting: UpcomingMeetingResponseData) =>
  meeting.title?.trim() || "Untitled meeting";

const getMeetingCode = (meeting: UpcomingMeetingResponseData) =>
  meeting.meetingCode?.trim() || "";

export function UpcomingMeetingCard({
  meeting,
  nowMs,
}: {
  meeting: UpcomingMeetingResponseData;
  nowMs: number;
}) {
  const timing = getUpcomingMeetingTiming(meeting, nowMs);
  const meetingCode = getMeetingCode(meeting);
  const title = getMeetingTitle(meeting);
  const hostName = meeting.hostName?.trim() || "Unknown host";
  const statusLabel = getUpcomingMeetingStatusLabel(timing);
  const shouldHighlightJoinButton = timing.isJoinable;

  return (
    <Card
      className={cn(
        "rounded-[1.75rem] border-border/70 p-6 shadow-sm transition-all duration-300",
        timing.isJoinable &&
          "border-primary/45 bg-primary/5 shadow-lg shadow-primary/15",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{title}</h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  timing.isJoinable
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {statusLabel}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p className="flex flex-wrap items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatUpcomingMeetingStart(timing.startDate, nowMs)}</span>
                <span className="font-medium text-primary">
                  - {timing.countdownLabel}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Host: {hostName}</span>
              </p>
            </div>
          </div>
          {meetingCode ? (
            <AuthenticatedMeetingCodeButton code={meetingCode} />
          ) : (
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              No meeting code
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-h-9" />

          {meetingCode ? (
            <Button
              asChild
              variant={shouldHighlightJoinButton ? "default" : "outline"}
              className={cn(
                "h-10 min-w-28 px-4",
                shouldHighlightJoinButton &&
                  "ring-2 ring-primary/40 shadow-lg shadow-primary/25",
              )}
            >
              <Link href={`/${encodeURIComponent(meetingCode)}`}>
                {shouldHighlightJoinButton ? "Join now" : "Join"}
              </Link>
            </Button>
          ) : (
            <Button className="h-10 min-w-28 px-4" disabled>
              Join
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
