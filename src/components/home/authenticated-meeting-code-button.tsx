"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

import { useCopyMeetingLink } from "@/features/meeting/room/hooks/use-copy-meeting-link";

export default function AuthenticatedMeetingCodeButton({ code }: { code: string }) {
  const { copied, copyMeetingLink } = useCopyMeetingLink(code);

  const handleCopy = async () => {
    const didCopy = await copyMeetingLink();

    if (didCopy) {
      toast.success("Meeting link copied", {
        description: `Share ${code.toUpperCase()} with your participants.`,
      });
      return;
    }

    toast.error("Unable to copy link", {
      description: "Please try again in a moment.",
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
    >
      <code>{code}</code>
      {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
