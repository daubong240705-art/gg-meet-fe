"use client";

import { useMemo } from "react";

import { useAuthSession } from "@/lib/auth/auth-session";

import QuickAction from "../dashboard/quick-action";
import AuthenticatedHomeHero from "./authenticated-home-hero";
import AuthenticatedHomeScheduleBanner from "./authenticated-home-schedule-banner";
import AuthenticatedHomeUpcoming from "./authenticated-home-upcoming";

export default function AuthenticatedHome() {
  const { user } = useAuthSession();
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
      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">
        <AuthenticatedHomeHero greeting={greeting} firstName={firstName} todayLabel={todayLabel} />
        <QuickAction />
        {/* <AuthenticatedHomeStats /> */}
        <AuthenticatedHomeScheduleBanner />

        <section className="grid gap-8 mb-20 lg:grid-cols-1">
          <AuthenticatedHomeUpcoming />
          {/* <AuthenticatedHomeRecent /> */}
        </section>
      </div>
    </div>
  );
}
