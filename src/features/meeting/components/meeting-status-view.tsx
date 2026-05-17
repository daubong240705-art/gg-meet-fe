"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";

import Homeheader from "@/components/layout/home.header";
import { Button } from "@/components/ui/button";
import { MEETING_IMAGES } from "@/lib/meeting/assets";

export function MeetingStatusView({
  title,
  description,
  imageSrc = MEETING_IMAGES.loading,
  imageAlt = "",
  actions,
}: {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  actions: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-full space-y-4">
          <h1 className="text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>

          <Image
            src={imageSrc}
            alt={imageAlt}
            width={520}
            height={390}
            priority
            className="mx-auto mb-8 block h-auto w-full max-w-sm object-contain sm:max-w-md"
          />

          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {actions}
        </div>
      </div>
    </div>
  );
}

export function LeftMeetingView({
  reason,
  onRejoin,
  onGoHome,
}: {
  reason: "left" | "ended" | "kicked" | "banned";
  onRejoin: () => void;
  onGoHome: () => void;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  useEffect(() => {
    const deadline = Date.now() + 60_000;

    const intervalId = window.setInterval(() => {
      const nextSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsRemaining(nextSeconds);

      if (nextSeconds <= 0) {
        window.clearInterval(intervalId);
        onGoHome();
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [onGoHome]);

  const title =
    reason === "banned"
      ? "You've been banned from this meeting"
      : reason === "kicked"
        ? "You were removed from this meeting"
        : reason === "ended"
          ? "This meeting has ended"
          : "You left the meeting";

  const description =
    reason === "banned"
      ? "The host has banned you from rejoining this meeting."
      : reason === "kicked"
        ? `You were removed by the host. Returning to the homepage in ${secondsRemaining}s.`
        : reason === "ended"
          ? `The host ended this meeting. Returning to the homepage in ${secondsRemaining}s.`
          : `Returning to the homepage in ${secondsRemaining}s.`;

  return (
    <MeetingStatusView
      title={title}
      description={description}
      imageSrc={MEETING_IMAGES.bye}
      imageAlt={title}
      actions={(
        <>
          {reason === "left" ? (
            <Button type="button" size="lg" className="min-w-44" onClick={onRejoin}>
              Rejoin
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="lg" className="min-w-44" onClick={onGoHome}>
            Go to homepage
          </Button>
        </>
      )}
    />
  );
}
