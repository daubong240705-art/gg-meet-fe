"use client";

import { Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user/user-avatar";
import type { AuthUser } from "@/lib/auth/auth-session";
import { cn } from "@/lib/utils";

import type { ProfileAvatarOption } from "../types";

type AvatarPickerDialogProps = {
  open: boolean;
  profile: AuthUser;
  avatarOptions: ProfileAvatarOption[];
  normalizedFullName: string;
  selectedAvatarUrl: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (avatarUrl: string) => void;
};

export function AvatarPickerDialog({
  open,
  profile,
  avatarOptions,
  normalizedFullName,
  selectedAvatarUrl,
  onOpenChange,
  onSelect,
}: AvatarPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(38rem,calc(100vw-2rem))] rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Choose Avatar</DialogTitle>
          <DialogDescription>
            Select one of the system avatars for your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              onSelect("");
              onOpenChange(false);
            }}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-3xl border border-border/70 bg-background/45 p-4 transition hover:border-primary/50 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              !selectedAvatarUrl && "border-primary/60 bg-muted/55",
            )}
          >
            <UserAvatar
              name={normalizedFullName || profile.fullName}
              email={profile.email}
              className="h-24 w-24 text-2xl"
              initialsClassName="text-2xl"
            />
            <span className="text-sm font-medium">Initials</span>
            {!selectedAvatarUrl ? (
              <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </span>
            ) : null}
          </button>
          {avatarOptions.map((avatarOption) => {
            const isSelected = selectedAvatarUrl === avatarOption.url;

            return (
              <button
                key={avatarOption.id}
                type="button"
                onClick={() => {
                  onSelect(avatarOption.url);
                  onOpenChange(false);
                }}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-3xl border border-border/70 bg-background/45 p-4 transition hover:border-primary/50 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  isSelected && "border-primary/60 bg-muted/55",
                )}
              >
                <UserAvatar
                  avatarUrl={avatarOption.url}
                  name={profile.fullName}
                  email={profile.email}
                  className="h-24 w-24"
                />
                <span className="text-sm font-medium">{avatarOption.label}</span>
                {isSelected ? (
                  <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
