"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RoomShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SHORTCUTS = [
  { key: "M", label: "Toggle microphone" },
  { key: "E", label: "Toggle camera" },
  { key: "C", label: "Open chat" },
  { key: "P", label: "Open participants" },
  { key: "H", label: "Raise or lower hand" },
  { key: "D", label: "Leave meeting" },
  { key: "?", label: "Open shortcuts" },
];

export function RoomShortcutsDialog({
  open,
  onOpenChange,
}: RoomShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-5 rounded-2xl border border-border/80 bg-card/95 p-5 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Shortcuts work when focus is outside text fields.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background/70 px-3 py-2"
            >
              <span className="text-sm text-foreground">{shortcut.label}</span>
              <kbd className="flex h-7 min-w-7 items-center justify-center rounded-md border border-border bg-muted px-2 text-xs font-semibold text-muted-foreground shadow-sm">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
