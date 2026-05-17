"use client";

import { useCallback, useMemo, useState } from "react";

import type { AuthUser } from "@/lib/auth/auth-session";

type ProfileDraft = {
  snapshot: string;
  fullName: string;
  avatarUrl: string;
};

export function useProfileDraft(profile?: AuthUser | null) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);

  const profileSnapshot = useMemo(() => {
    if (!profile) {
      return "";
    }

    return `${profile.id}:${profile.fullName}:${profile.avatarUrl}`;
  }, [profile]);

  const isDraftForCurrentProfile = draft?.snapshot === profileSnapshot;
  const fullName = isDraftForCurrentProfile ? draft.fullName : profile?.fullName ?? "";
  const avatarUrl = isDraftForCurrentProfile ? draft.avatarUrl : profile?.avatarUrl ?? "";
  const normalizedFullName = fullName.trim();
  const selectedAvatarUrl = avatarUrl.trim();
  const hasProfileChanged = profile
    ? (
      normalizedFullName !== profile.fullName.trim()
      || selectedAvatarUrl !== (profile.avatarUrl?.trim() || "")
    )
    : false;

  const updateDraft = useCallback((nextValues: Partial<Omit<ProfileDraft, "snapshot">>) => {
    if (!profile) {
      return;
    }

    setDraft({
      snapshot: profileSnapshot,
      fullName,
      avatarUrl,
      ...nextValues,
    });
  }, [avatarUrl, fullName, profile, profileSnapshot]);

  const resetDraft = useCallback(() => {
    if (!profile) {
      return;
    }

    setDraft(null);
  }, [profile]);

  return {
    fullName,
    avatarUrl,
    normalizedFullName,
    selectedAvatarUrl,
    hasProfileChanged,
    updateDraft,
    resetDraft,
  };
}
