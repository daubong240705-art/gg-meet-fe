"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COPIED_RESET_DELAY_MS = 2000;

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

    if (
      !normalizedMeetingCode
      || typeof window === "undefined"
      || !navigator.clipboard?.writeText
    ) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${normalizedMeetingCode}`);
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
