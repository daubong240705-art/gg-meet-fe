import { CalendarClock, Loader2, RefreshCw } from "lucide-react";

import { getMeetingApiErrorDescription } from "@/shared/services/meeting.service";

import { Button } from "../ui/button";
import { Card } from "../ui/card";

const UPCOMING_MEETINGS_SKELETON_COUNT = 3;

export function UpcomingMeetingSkeleton() {
  return (
    <Card className="rounded-[1.75rem] border-border/70 p-6 shadow-sm">
      <div className="animate-pulse space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-2/3 rounded-full bg-muted" />
            <div className="h-4 w-1/2 rounded-full bg-muted" />
            <div className="h-4 w-1/3 rounded-full bg-muted" />
          </div>
          <div className="h-8 w-28 rounded-full bg-muted" />
        </div>
        <div className="flex justify-end">
          <div className="h-8 w-20 rounded-lg bg-muted" />
        </div>
      </div>
    </Card>
  );
}

export function UpcomingMeetingsSkeletonList() {
  return (
    <>
      {Array.from({ length: UPCOMING_MEETINGS_SKELETON_COUNT }, (_, index) => (
        <UpcomingMeetingSkeleton key={`upcoming-skeleton-${index}`} />
      ))}
    </>
  );
}

export function UpcomingMeetingsEmptyState() {
  return (
    <Card className="rounded-[1.75rem] border-dashed border-border/70 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">No upcoming meetings</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            When a meeting is scheduled for you, it will show up here.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function UpcomingMeetingsErrorState({
  error,
  isFetching,
  onRetry,
}: {
  error: IBackendRes<unknown> | null;
  isFetching: boolean;
  onRetry: () => void;
}) {
  const description =
    (error ? getMeetingApiErrorDescription(error) : null) ||
    "We could not load your upcoming meetings right now.";

  return (
    <Card className="rounded-[1.75rem] border-destructive/25 bg-destructive/5 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Unable to load upcoming meetings</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isFetching}
        >
          {isFetching
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          Retry
        </Button>
      </div>
    </Card>
  );
}
