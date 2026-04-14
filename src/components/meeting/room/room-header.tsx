"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type RoomHeaderProps = {
  meetingCode: string;
};

export default function RoomHeader({ meetingCode }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [deferredReady, setDeferredReady] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const shareUrl =
    deferredReady && typeof window !== "undefined"
      ? `${window.location.origin}/${meetingCode}`
      : "";

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setDeferredReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const handleCopyMeetingLink = async () => {
    if (!shareUrl || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header className="px-3 pt-3 sm:px-4 lg:px-6 lg:pt-5">
      <div className="mx-auto flex max-w-420 items-center justify-between gap-3 rounded-full border border-white/10 bg-[#202124]/88 px-3 py-2 text-white shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
            Meet
          </span>
          <p className="truncate text-sm font-medium tracking-wide">
            {meetingCode}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyMeetingLink}
          disabled={!shareUrl}
          className="flex shrink-0 items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-300" />
          ) : (
            <Copy className="h-4 w-4 text-white/75" />
          )}
          <span className="hidden sm:inline">Copy link</span>
        </button>
      </div>
    </header>
  );
}
