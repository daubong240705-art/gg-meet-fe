"use client";

import { Check, Copy, Grid3x3, Maximize2, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ViewMode } from "./types";
import { formatDuration } from "./utils";

type RoomHeaderProps = {
  meetingCode: string;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
};

export default function RoomHeader({
  meetingCode,
  viewMode,
  onViewModeChange,
}: RoomHeaderProps) {
  const [meetingDuration, setMeetingDuration] = useState(0);
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

  useEffect(() => {
    if (!deferredReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMeetingDuration((currentValue) => currentValue + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deferredReady]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
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
    <header className="border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
              deferredReady
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            )}
          >
            <span
              className={cn(
                "mr-2 h-2 w-2 rounded-full",
                deferredReady ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            {deferredReady ? "Room live" : "Preparing room"}
          </span>

          <div>
            <p className="text-sm text-muted-foreground">Meeting code</p>
            <p className="font-semibold tracking-wide">{meetingCode.toUpperCase()}</p>
          </div>

          <div className="h-10 w-px bg-border/70" />

          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-semibold tabular-nums">
              {formatDuration(meetingDuration)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-1">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              className="rounded-full"
              onClick={() => onViewModeChange("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "speaker" ? "secondary" : "ghost"}
              size="icon-sm"
              className="rounded-full"
              onClick={() => onViewModeChange("speaker")}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <button
            type="button"
            onClick={handleCopyMeetingLink}
            disabled={!shareUrl}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-2 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Share link
              </p>
              <p className="max-w-56 truncate text-sm font-medium">
                {shareUrl || "Loading meeting link..."}
              </p>
            </div>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
