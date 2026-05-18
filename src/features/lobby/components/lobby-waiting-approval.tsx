"use client";

import Image from "next/image";
import { Loader2, WifiOff } from "lucide-react";

type LobbyWaitingApprovalProps = {
  imageSrc?: string | null;
  isConnected: boolean;
  errorMessage?: string;
};

export function LobbyWaitingApproval({
  imageSrc,
  isConnected,
  errorMessage,
}: LobbyWaitingApprovalProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-card/35 to-transparent" />

      <div className="relative flex w-full max-w-3xl flex-col items-center justify-center text-center">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt="Waiting for host approval"
            width={640}
            height={480}
            priority
            className="h-auto w-full max-w-md object-contain"
          />
        ) : (
          <div className="flex h-72 w-full max-w-md items-center justify-center rounded-4xl border border-dashed border-border/70 bg-card/20 px-6 text-sm text-muted-foreground">
            Set your waiting-room image here
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 text-base text-foreground sm:text-lg">
          {isConnected ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span>Please wait until the meeting host admits you into the call.</span>
        </div>

        {errorMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
