"use client";

import { useEffect } from "react";

type RoomLeaveDialogProps = {
  open: boolean;
  isEndingMeeting: boolean;
  onClose: () => void;
  onLeave: () => void;
  onEndMeeting?: () => void;
};

export function RoomLeaveDialog({
  open,
  isEndingMeeting,
  onClose,
  onLeave,
  onEndMeeting,
}: RoomLeaveDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close leave meeting dialog"
        className="pointer-events-auto fixed inset-0 z-40 bg-background/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 motion-reduce:animate-none"
        onClick={onClose}
      />
      <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[2rem] border border-border/80 bg-card/95 p-6 text-center text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-3 motion-safe:duration-200 motion-safe:ease-out motion-reduce:animate-none">
          <div className="space-y-2">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              Leave meeting?
            </h2>
            <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground">
              Leave now to keep the meeting open, or end it for everyone.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLeave();
              }}
              className="flex h-12 items-center justify-center rounded-full border border-border/80 bg-background/80 px-4 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Leave meeting
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEndMeeting?.();
              }}
              disabled={isEndingMeeting}
              className="flex h-12 items-center justify-center rounded-full bg-destructive px-4 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEndingMeeting ? "Ending..." : "End for everyone"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
