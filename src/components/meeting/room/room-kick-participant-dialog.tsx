"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Participant } from "./types";

type RoomKickParticipantDialogProps = {
  participant: Participant | null;
  isBanChecked: boolean;
  onBanCheckedChange: (checked: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function RoomKickParticipantDialog({
  participant,
  isBanChecked,
  onBanCheckedChange,
  onClose,
  onConfirm,
}: RoomKickParticipantDialogProps) {
  return (
    <Dialog
      open={participant !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove from meeting</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">{participant?.name}</span>{" "}
            from this meeting?
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/35 px-4 py-3 hover:bg-background/50">
          <input
            type="checkbox"
            checked={isBanChecked}
            onChange={(event) => onBanCheckedChange(event.target.checked)}
            className="h-4 w-4 accent-destructive"
          />
          <span className="text-sm text-foreground">Ban from rejoining this meeting</span>
        </label>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            onClick={onConfirm}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
