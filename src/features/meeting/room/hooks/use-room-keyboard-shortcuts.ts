"use client";

import { useEffect } from "react";

type UseRoomKeyboardShortcutsParams = {
  disabled?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleChatPanel: () => void;
  onToggleParticipantsPanel: () => void;
  onToggleHandRaise: () => void;
  onLeave: () => void;
  onOpenHelp: () => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return tagName === "input"
    || tagName === "textarea"
    || tagName === "select"
    || target.isContentEditable
    || Boolean(target.closest("[contenteditable='true']"));
}

export function useRoomKeyboardShortcuts({
  disabled = false,
  onToggleMic,
  onToggleCamera,
  onToggleChatPanel,
  onToggleParticipantsPanel,
  onToggleHandRaise,
  onLeave,
  onOpenHelp,
}: UseRoomKeyboardShortcutsParams) {
  useEffect(() => {
    if (disabled || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.isComposing
        || event.repeat
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || isEditableTarget(event.target)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const actionByKey: Record<string, (() => void) | undefined> = {
        "?": onOpenHelp,
        c: onToggleChatPanel,
        d: onLeave,
        e: onToggleCamera,
        h: onToggleHandRaise,
        m: onToggleMic,
        p: onToggleParticipantsPanel,
      };
      const action = actionByKey[key];

      if (!action) {
        return;
      }

      event.preventDefault();
      action();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    disabled,
    onLeave,
    onOpenHelp,
    onToggleCamera,
    onToggleChatPanel,
    onToggleHandRaise,
    onToggleMic,
    onToggleParticipantsPanel,
  ]);
}
