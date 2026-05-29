"use client";

import { Monitor } from "lucide-react";

import { FloatingMenuPanel } from "../shared/floating-menu-panel";

type RoomFooterScreenMenuProps = {
  isScreenSharing: boolean;
  isWaitingForApproval?: boolean;
  onToggleScreenShare: () => void;
  onPresentOtherContent: () => void;
  onClose: () => void;
};

export function RoomFooterScreenMenu({
  isScreenSharing,
  isWaitingForApproval = false,
  onToggleScreenShare,
  onPresentOtherContent,
  onClose,
}: RoomFooterScreenMenuProps) {
  return (
    <FloatingMenuPanel title="Present" widthClassName="w-80">
      <button
        type="button"
        disabled={isWaitingForApproval}
        onClick={() => {
          if (isScreenSharing) {
            onPresentOtherContent();
          } else {
            onToggleScreenShare();
          }
          onClose();
        }}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition motion-safe:duration-150 motion-safe:ease-out hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>
          {isWaitingForApproval
            ? "Waiting for approval…"
            : isScreenSharing ? "Present other content" : "Present now"}
        </span>
        <Monitor className="h-4 w-4 shrink-0 text-primary" />
      </button>

      {isScreenSharing ? (
        <button
          type="button"
          onClick={() => {
            onToggleScreenShare();
            onClose();
          }}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm text-destructive transition motion-safe:duration-150 motion-safe:ease-out hover:bg-destructive/10"
        >
          <span>Stop presenting</span>
          <Monitor className="h-4 w-4 shrink-0" />
        </button>
      ) : null}
    </FloatingMenuPanel>
  );
}
