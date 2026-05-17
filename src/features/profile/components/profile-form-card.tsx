"use client";

import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user/user-avatar";
import type { AuthUser } from "@/lib/auth/auth-session";
import { cn } from "@/lib/utils";

import type { ProfileAvatarOption } from "../types";

type ProfileFormCardProps = {
  profile: AuthUser;
  fullName: string;
  normalizedFullName: string;
  selectedAvatarUrl: string;
  quickAvatarOptions: ProfileAvatarOption[];
  hasProfileChanged: boolean;
  isSaving: boolean;
  isSaveDisabled: boolean;
  onFullNameChange: (value: string) => void;
  onAvatarSelect: (avatarUrl: string) => void;
  onOpenAvatarDialog: () => void;
  onReset: () => void;
};

export function ProfileFormCard({
  profile,
  fullName,
  normalizedFullName,
  selectedAvatarUrl,
  quickAvatarOptions,
  hasProfileChanged,
  isSaving,
  isSaveDisabled,
  onFullNameChange,
  onAvatarSelect,
  onOpenAvatarDialog,
  onReset,
}: ProfileFormCardProps) {
  return (
    <>
      <div className="space-y-5">
        <div>
          <label htmlFor="profile-full-name" className="mb-2 block text-sm font-medium">
            Full name
          </label>
          <Input
            id="profile-full-name"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            placeholder="Enter your full name"
            disabled={isSaving}
            aria-invalid={!normalizedFullName}
            className="h-12"
            maxLength={255}
          />
          {!normalizedFullName ? (
            <p className="mt-2 text-sm text-destructive">Full name is required.</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="profile-email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <Input
            id="profile-email"
            type="email"
            value={profile.email}
            readOnly
            disabled
            className="h-12 cursor-not-allowed opacity-80"
          />
        </div>

        <div>
          <p className="mb-3 text-sm font-medium">Selected avatar</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onAvatarSelect("")}
              className={cn(
                "rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                !selectedAvatarUrl ? "bg-muted ring-2 ring-primary/50" : "hover:bg-muted",
              )}
              aria-label="Use initials avatar"
            >
              <UserAvatar
                name={normalizedFullName || profile.fullName}
                email={profile.email}
                className="h-14 w-14"
              />
            </button>
            {quickAvatarOptions.map((avatarOption) => {
              const isSelected = selectedAvatarUrl === avatarOption.url;

              return (
                <button
                  key={`quick-${avatarOption.id}`}
                  type="button"
                  onClick={() => onAvatarSelect(avatarOption.url)}
                  className={cn(
                    "rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    isSelected ? "bg-muted ring-2 ring-primary/50" : "hover:bg-muted",
                  )}
                  aria-label={`Select ${avatarOption.label}`}
                >
                  <UserAvatar
                    avatarUrl={avatarOption.url}
                    name={profile.fullName}
                    email={profile.email}
                    className="h-14 w-14"
                  />
                </button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="h-16 rounded-full px-5"
              onClick={onOpenAvatarDialog}
            >
              View all
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-11"
          onClick={onReset}
          disabled={!hasProfileChanged || isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" size="lg" className="h-11 min-w-36" disabled={isSaveDisabled}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </>
  );
}
