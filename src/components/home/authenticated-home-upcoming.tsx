"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Clock, Loader2, RefreshCw, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useUpcomingMeetings } from "@/hooks/meeting/useUpcomingMeetings";
import {
  formatUpcomingMeetingStart,
  getUpcomingMeetingStatusLabel,
  getUpcomingMeetingTiming,
} from "@/lib/meeting/upcoming";
import { cn } from "@/lib/utils";
import {
  getMeetingApiErrorDescription,
  type UpcomingMeetingResponseData,
} from "@/service/meeting.service";

import AuthenticatedMeetingCodeButton from "./authenticated-meeting-code-button";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

const UPCOMING_MEETINGS_PAGE_SIZE = 3;
const NOTIFICATION_STORAGE_PREFIX = "gg-meet:upcoming-started";
const EMPTY_UPCOMING_MEETINGS: UpcomingMeetingResponseData[] = [];

const useCurrentTime = () => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return nowMs;
};

const getMeetingTitle = (meeting: UpcomingMeetingResponseData) =>
  meeting.title?.trim() || "Untitled meeting";

const getMeetingCode = (meeting: UpcomingMeetingResponseData) =>
  meeting.meetingCode?.trim() || "";

const getCurrentMeetingCodeFromPath = (pathname: string | null) => {
  const firstPathSegment = pathname?.split("/").filter(Boolean)[0] || "";

  if (!firstPathSegment) {
    return "";
  }

  try {
    return decodeURIComponent(firstPathSegment).trim().toLowerCase();
  } catch {
    return firstPathSegment.trim().toLowerCase();
  }
};

const getNotificationKey = (meeting: UpcomingMeetingResponseData) => {
  const meetingCode = getMeetingCode(meeting);

  if (!meetingCode) {
    return null;
  }

  return `${meetingCode}:${meeting.startTime?.trim() || "unknown"}`;
};

const readNotificationMarker = (key: string) => {
  try {
    return window.sessionStorage.getItem(`${NOTIFICATION_STORAGE_PREFIX}:${key}`) === "1";
  } catch {
    return false;
  }
};

const writeNotificationMarker = (key: string) => {
  try {
    window.sessionStorage.setItem(`${NOTIFICATION_STORAGE_PREFIX}:${key}`, "1");
  } catch {
    // Session storage can be blocked. The in-memory set still prevents repeated toasts.
  }
};

function UpcomingMeetingSkeleton() {
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

function UpcomingMeetingsEmptyState() {
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

function UpcomingMeetingsErrorState({
  error,
  isFetching,
  onRetry,
}: {
  error: IBackendRes<unknown> | null;
  isFetching: boolean;
  onRetry: () => void;
}) {
  const description =
    (error ? getMeetingApiErrorDescription(error) : null)
    || "We could not load your upcoming meetings right now.";

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
        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Retry
        </Button>
      </div>
    </Card>
  );
}

function UpcomingMeetingCard({
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
        timing.isJoinable && "border-primary/45 bg-primary/5 shadow-lg shadow-primary/15",
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
                shouldHighlightJoinButton && "ring-2 ring-primary/40 shadow-lg shadow-primary/25",
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

export default function AuthenticatedHomeUpcoming() {
  const router = useRouter();
  const pathname = usePathname();
  const nowMs = useCurrentTime();
  const notifiedMeetingsRef = useRef<Set<string>>(new Set());
  const upcomingMeetingsQuery = useUpcomingMeetings({ page: 0, size: UPCOMING_MEETINGS_PAGE_SIZE });
  const meetings = upcomingMeetingsQuery.data ?? EMPTY_UPCOMING_MEETINGS;

  useEffect(() => {
    const currentMeetingCode = getCurrentMeetingCodeFromPath(pathname);

    meetings.forEach((meeting) => {
      const meetingCode = getMeetingCode(meeting);
      const notificationKey = getNotificationKey(meeting);

      if (!meetingCode || !notificationKey || currentMeetingCode === meetingCode.toLowerCase()) {
        return;
      }

      if (notifiedMeetingsRef.current.has(notificationKey) || readNotificationMarker(notificationKey)) {
        notifiedMeetingsRef.current.add(notificationKey);
        return;
      }

      const timing = getUpcomingMeetingTiming(meeting, nowMs);

      if (timing.state !== "starting-now") {
        return;
      }

      notifiedMeetingsRef.current.add(notificationKey);
      writeNotificationMarker(notificationKey);

      toast.info(`Meeting "${getMeetingTitle(meeting)}" is starting now`, {
        description: "Use Join now when you are ready.",
        action: {
          label: "Join now",
          onClick: () => router.push(`/${encodeURIComponent(meetingCode)}`),
        },
      });
    });
  }, [meetings, nowMs, pathname, router]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Upcoming meetings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your next conversations and shared links.</p>
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
          Array.from({ length: UPCOMING_MEETINGS_PAGE_SIZE }, (_, index) => (
            <UpcomingMeetingSkeleton key={`upcoming-skeleton-${index}`} />
          ))
        ) : upcomingMeetingsQuery.isError && meetings.length === 0 ? (
          <UpcomingMeetingsErrorState
            error={upcomingMeetingsQuery.error ?? null}
            isFetching={upcomingMeetingsQuery.isFetching}
            onRetry={() => {
              void upcomingMeetingsQuery.refetch();
            }}
          />
        ) : meetings.length > 0 ? (
          meetings.map((meeting, index) => (
            <UpcomingMeetingCard
              key={getMeetingCode(meeting) || `${meeting.startTime ?? "meeting"}-${index}`}
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
