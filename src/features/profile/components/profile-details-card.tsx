"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ProfileTab } from "../types";

type ProfileDetailsCardProps = {
  activeTab: ProfileTab;
  onActiveTabChange: (tab: ProfileTab) => void;
  profileContent: ReactNode;
  settingsContent: ReactNode;
};

export function ProfileDetailsCard({
  activeTab,
  onActiveTabChange,
  profileContent,
  settingsContent,
}: ProfileDetailsCardProps) {
  return (
    <Card className="relative z-50 overflow-visible rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm backdrop-blur">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {activeTab === "profile" ? "Profile Information" : "Settings"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeTab === "profile"
              ? "Your name and avatar are used across meetings and account surfaces."
              : "Meeting preferences for this browser."}
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-border/70 bg-background/45 p-1">
          <button
            type="button"
            onClick={() => onActiveTabChange("profile")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "profile"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => onActiveTabChange("settings")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === "settings"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === "profile" ? profileContent : settingsContent}
    </Card>
  );
}
