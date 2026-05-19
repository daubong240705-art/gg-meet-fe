"use client";

import { MonitorUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ScreenShareRequestDialogProps = {
  open: boolean;
  isRequesting: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ScreenShareRequestDialog({
  open,
  isRequesting,
  onConfirm,
  onClose,
}: ScreenShareRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MonitorUp className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Request to present</DialogTitle>
          <DialogDescription className="text-center">
            Screen sharing is restricted by the host. Send a request and wait for approval.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRequesting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isRequesting}
            className="flex-1"
          >
            {isRequesting ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
