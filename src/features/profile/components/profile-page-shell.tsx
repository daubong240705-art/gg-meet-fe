"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ProfilePageShellProps = {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export function ProfilePageShell({
  isLoading,
  isError,
  onRetry,
  children,
}: ProfilePageShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,var(--background),var(--background))]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Profile
            </h1>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <Card className="min-h-80 animate-pulse rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm" />
            <Card className="min-h-80 animate-pulse rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm" />
          </div>
        ) : isError ? (
          <Card className="rounded-3xl border-destructive/25 bg-destructive/5 p-7 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Unable to load profile</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please refresh your account information and try again.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </Card>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
