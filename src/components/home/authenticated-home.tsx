"use client";

import { useMemo } from "react";

import { useIsDesktopApp } from "@/hooks/desktop/use-is-desktop-app";
import { useAuthSession } from "@/lib/auth/auth-session";
import { cn } from "@/lib/utils";

import QuickAction from "../dashboard/quick-action";
import AuthenticatedHomeHero from "./authenticated-home-hero";
import AuthenticatedHomeScheduleBanner from "./authenticated-home-schedule-banner";
import AuthenticatedHomeUpcoming from "./authenticated-home-upcoming";

export default function AuthenticatedHome() {
  const { user } = useAuthSession();
  const isDesktop = useIsDesktopApp();
  const firstName = user?.fullName?.trim().split(/\s+/)[0] || "there";
  const greeting = useMemo(() => {
    const currentHour = new Date().getHours();

    if (currentHour < 12) {
      return "Good morning";
    }

    if (currentHour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }, []);
  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }, []);

  return (
    <div className="bg-background">
      <div
        className={cn(
          "mx-auto px-6 lg:px-8",
          isDesktop
            ? "flex min-h-[calc(100vh-73px)] w-full max-w-6xl flex-col justify-center py-8"
            : "max-w-[1400px] py-8",
        )}
      >
        <AuthenticatedHomeHero greeting={greeting} firstName={firstName} todayLabel={todayLabel} />
        <QuickAction />
        <AuthenticatedHomeScheduleBanner />

        <section className={cn("grid gap-8 lg:grid-cols-1", isDesktop ? "mb-0" : "mb-20")}>
          <AuthenticatedHomeUpcoming />
        </section>
      </div>
    </div>
  );
}
