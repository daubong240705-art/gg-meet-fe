"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthSubmitSectionProps = {
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  disabled?: boolean;
};

export function AuthSubmitSection({
  submitLabel,
  pendingLabel,
  isPending,
  disabled = false,
}: AuthSubmitSectionProps) {
  return (
    <Button type="submit" className="w-full" size="lg" disabled={disabled || isPending}>
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        submitLabel
      )}
    </Button>
  );
}
