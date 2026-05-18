"use client";

import { type FormEvent, useMemo, useState } from "react";

import {
  AvatarPickerDialog,
  MeetingAudioSettings,
  MeetingDeviceSettings,
  ProfileDetailsCard,
  ProfileFormCard,
  ProfilePageShell,
  ProfileSummaryCard,
} from "@/features/profile/components";
import {
  useMeetingAudioPreferences,
  useMeetingDevicePreferences,
  useProfileDraft,
} from "@/features/profile/hooks";
import type { ProfileTab } from "@/features/profile/types";
import { useProfile, useUpdateProfile } from "@/hooks/auth/useProfile";
import { SYSTEM_AVATARS } from "@/lib/user/system-avatars";

export default function ProfilePage() {
  const profileQuery = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const profile = profileQuery.data;
  const {
    fullName,
    normalizedFullName,
    selectedAvatarUrl,
    hasProfileChanged,
    updateDraft,
    resetDraft,
  } = useProfileDraft(profile);
  const {
    audioPreferences,
    activeAudioMenuKey,
    setActiveAudioMenuKey,
    updateAudioPreference,
    previewAudioPreference,
  } = useMeetingAudioPreferences();
  const {
    devicePreferences,
    cameraDevices,
    microphoneDevices,
    activeDeviceMenuKey,
    setActiveDeviceMenuKey,
    updateDevicePreference,
    selectMeetingDevice,
  } = useMeetingDevicePreferences();
  const avatarOptions = useMemo(() => (
    Array.from(new Set<string>(SYSTEM_AVATARS)).map((avatar, index) => ({
      id: `system-avatar-${index + 1}`,
      label: `Avatar ${index + 1}`,
      url: avatar,
    }))
  ), []);
  const quickAvatarOptions = avatarOptions.slice(0, 4);
  const isSaving = updateProfileMutation.isPending;
  const isSaveDisabled =
    profileQuery.isPending || isSaving || !normalizedFullName || !hasProfileChanged;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaveDisabled) {
      return;
    }

    updateProfileMutation.mutate({
      fullName: normalizedFullName,
      avatarUrl: selectedAvatarUrl || null,
    });
  };

  return (
    <ProfilePageShell
      isLoading={profileQuery.isPending}
      isError={profileQuery.isError}
      onRetry={() => {
        void profileQuery.refetch();
      }}
    >
      {profile ? (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <ProfileSummaryCard
              profile={profile}
              normalizedFullName={normalizedFullName}
              selectedAvatarUrl={selectedAvatarUrl}
              onChooseAvatar={() => setIsAvatarDialogOpen(true)}
            />

            <ProfileDetailsCard
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              profileContent={(
                <ProfileFormCard
                  profile={profile}
                  fullName={fullName}
                  normalizedFullName={normalizedFullName}
                  selectedAvatarUrl={selectedAvatarUrl}
                  quickAvatarOptions={quickAvatarOptions}
                  hasProfileChanged={hasProfileChanged}
                  isSaving={isSaving}
                  isSaveDisabled={isSaveDisabled}
                  onFullNameChange={(value) => updateDraft({ fullName: value })}
                  onAvatarSelect={(avatarUrl) => updateDraft({ avatarUrl })}
                  onOpenAvatarDialog={() => setIsAvatarDialogOpen(true)}
                  onReset={resetDraft}
                />
              )}
              settingsContent={(
                <div>
                  <MeetingDeviceSettings
                    devicePreferences={devicePreferences}
                    cameraDevices={cameraDevices}
                    microphoneDevices={microphoneDevices}
                    activeDeviceMenuKey={activeDeviceMenuKey}
                    onActiveDeviceMenuChange={setActiveDeviceMenuKey}
                    onPreferenceChange={updateDevicePreference}
                    onDeviceSelect={selectMeetingDevice}
                  />
                  <MeetingAudioSettings
                    audioPreferences={audioPreferences}
                    activeAudioMenuKey={activeAudioMenuKey}
                    onActiveAudioMenuChange={setActiveAudioMenuKey}
                    onPreferenceChange={updateAudioPreference}
                    onPreview={previewAudioPreference}
                  />
                </div>
              )}
            />
          </div>

          <AvatarPickerDialog
            open={isAvatarDialogOpen}
            profile={profile}
            avatarOptions={avatarOptions}
            normalizedFullName={normalizedFullName}
            selectedAvatarUrl={selectedAvatarUrl}
            onOpenChange={setIsAvatarDialogOpen}
            onSelect={(avatarUrl) => updateDraft({ avatarUrl })}
          />
        </form>
      ) : null}
    </ProfilePageShell>
  );
}
