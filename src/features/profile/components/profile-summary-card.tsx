"use client";

import { UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import type { AuthUser } from "@/lib/auth/auth-session";

type ProfileSummaryCardProps = {
  profile: AuthUser;
  normalizedFullName: string;
  selectedAvatarUrl: string;
  onChooseAvatar: () => void;
};

export function ProfileSummaryCard({
  profile,
  normalizedFullName,
  selectedAvatarUrl,
  onChooseAvatar,
}: ProfileSummaryCardProps) {
  return (
    <Card className="rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm backdrop-blur">
      <div className="my-5 flex flex-col items-center text-center">
        <button
          type="button"
          className="group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={onChooseAvatar}
        >
          <UserAvatar
            avatarUrl={selectedAvatarUrl}
            name={normalizedFullName || profile.fullName}
            email={profile.email}
            className="h-32 w-32 border-4 border-background text-4xl shadow-[0_24px_60px_rgba(2,6,23,0.28)] ring-1 ring-border/70 transition group-hover:ring-primary/45"
            initialsClassName="text-4xl"
            label="Current profile avatar"
          />
        </button>

        <h2 className="mt-6 text-2xl font-semibold">{normalizedFullName || profile.fullName}</h2>
        <p className="mt-1 max-w-xs truncate text-sm text-muted-foreground">{profile.email}</p>

        <div className="mt-6 flex w-full flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full"
            onClick={onChooseAvatar}
          >
            <UserRound className="h-4 w-4" />
            Choose Avatar
          </Button>
        </div>
      </div>
    </Card>
  );
}
