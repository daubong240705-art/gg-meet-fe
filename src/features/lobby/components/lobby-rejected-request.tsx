"use client";

import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Homeheader from "@/components/layout/home.header";

type LobbyRejectedRequestProps = {
  onRequestAgain: () => void;
  onGoHome: () => void;
};

export function LobbyRejectedRequest({
  onRequestAgain,
  onGoHome,
}: LobbyRejectedRequestProps) {
  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-3xl items-center px-6 py-10">
        <Card className="w-full border border-border/70 bg-background/90 p-8 shadow-sm">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <XCircle className="h-7 w-7" />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Request Declined
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              The host didn&apos;t admit this request
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              You can go back to the lobby setup and send another request later, or return to the homepage now.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="h-12"
              onClick={onRequestAgain}
            >
              Request again
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12"
              onClick={onGoHome}
            >
              Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
