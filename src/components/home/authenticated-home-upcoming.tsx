"use client";

import { Loader2 } from "lucide-react";

import { useUpcomingMeetings } from "@/hooks/meeting/useUpcomingMeetings";
import { useCurrentTime } from "@/hooks/shared/use-current-time";
import { useUpcomingMeetingNotifications } from "@/hooks/meeting/use-upcoming-meeting-notifications";
import type { UpcomingMeetingResponseData } from "@/shared/services/meeting.service";

import { UpcomingMeetingCard } from "./upcoming-meeting-card";
import {
  UpcomingMeetingsEmptyState,
  UpcomingMeetingsErrorState,
  UpcomingMeetingsSkeletonList,
} from "./upcoming-meetings-state";

const UPCOMING_MEETINGS_PAGE_SIZE = 3;
const EMPTY_UPCOMING_MEETINGS: UpcomingMeetingResponseData[] = [];

export default function AuthenticatedHomeUpcoming() {
  const nowMs = useCurrentTime();
  const upcomingMeetingsQuery = useUpcomingMeetings({
    page: 0,
    size: UPCOMING_MEETINGS_PAGE_SIZE,
  });
  const meetings = upcomingMeetingsQuery.data ?? EMPTY_UPCOMING_MEETINGS;

  useUpcomingMeetingNotifications(meetings, nowMs);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Upcoming meetings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your next conversations and shared links.
          </p>
        </div>
        {upcomingMeetingsQuery.isFetching && !upcomingMeetingsQuery.isPending ? (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating
          </span>
        ) : null}
      </div>

      <div className="space-y-4">
        {upcomingMeetingsQuery.isPending ? (
          <UpcomingMeetingsSkeletonList />
        ) : upcomingMeetingsQuery.isError && meetings.length === 0 ? (
          <UpcomingMeetingsErrorState
            error={upcomingMeetingsQuery.error ?? null}
            isFetching={upcomingMeetingsQuery.isFetching}
            onRetry={() => { void upcomingMeetingsQuery.refetch(); }}
          />
        ) : meetings.length > 0 ? (
          meetings.map((meeting, index) => (
            <UpcomingMeetingCard
              key={
                meeting.meetingCode?.trim() ||
                `${meeting.startTime ?? "meeting"}-${index}`
              }
              meeting={meeting}
              nowMs={nowMs}
            />
          ))
        ) : (
          <UpcomingMeetingsEmptyState />
        )}
      </div>
    </div>
  );
}
