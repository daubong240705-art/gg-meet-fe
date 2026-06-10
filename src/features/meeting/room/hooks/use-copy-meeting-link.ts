"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSiteUrl } from "@/lib/seo/site";

const COPIED_RESET_DELAY_MS = 2000;

function getMeetingInviteUrl(meetingCode: string) {
  const encodedMeetingCode = encodeURIComponent(meetingCode);

  if (typeof window !== "undefined" && window.desktop?.isElectron) {
    return new URL(encodedMeetingCode, `${getSiteUrl()}/`).toString();
  }

  if (typeof window !== "undefined") {
    return new URL(encodedMeetingCode, `${window.location.origin}/`).toString();
  }

  return new URL(encodedMeetingCode, `${getSiteUrl()}/`).toString();
}

async function writeClipboardText(text: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Electron can still write through the main process when browser clipboard
    // permissions are unavailable for the custom app:// origin.
  }

  return (await window.desktop?.clipboard?.writeText(text)) ?? false;
}

export function useCopyMeetingLink(meetingCode: string) {
  const copyTimeoutRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const copyMeetingLink = useCallback(async () => {
    const normalizedMeetingCode = meetingCode.trim();

    if (!normalizedMeetingCode || typeof window === "undefined") {
      return false;
    }

    try {
      const copiedToClipboard = await writeClipboardText(getMeetingInviteUrl(normalizedMeetingCode));

      if (!copiedToClipboard) {
        setCopied(false);
        return false;
      }

      setCopied(true);

      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, COPIED_RESET_DELAY_MS);

      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }, [meetingCode]);

  return {
    copied,
    copyMeetingLink,
  };
}
