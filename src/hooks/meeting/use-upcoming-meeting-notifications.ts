"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import type { UpcomingMeetingResponseData } from "@/shared/services/meeting.service";
import { getUpcomingMeetingTiming } from "@/lib/meeting/upcoming";
import { meetingHref } from "@/lib/meeting/meeting-path";

const NOTIFICATION_STORAGE_PREFIX = "gg-meet:upcoming-started";

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
    return (
      window.sessionStorage.getItem(`${NOTIFICATION_STORAGE_PREFIX}:${key}`) === "1"
    );
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

export function useUpcomingMeetingNotifications(
  meetings: UpcomingMeetingResponseData[],
  nowMs: number,
) {
  const router = useRouter();
  const pathname = usePathname();
  const notifiedMeetingsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentMeetingCode = getCurrentMeetingCodeFromPath(pathname);

    meetings.forEach((meeting) => {
      const meetingCode = getMeetingCode(meeting);
      const notificationKey = getNotificationKey(meeting);

      if (
        !meetingCode ||
        !notificationKey ||
        currentMeetingCode === meetingCode.toLowerCase()
      ) {
        return;
      }

      if (
        notifiedMeetingsRef.current.has(notificationKey) ||
        readNotificationMarker(notificationKey)
      ) {
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
          onClick: () => router.push(meetingHref(meetingCode)),
        },
      });
    });
  }, [meetings, nowMs, pathname, router]);
}
