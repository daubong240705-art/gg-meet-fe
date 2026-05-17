/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChevronDown, Loader2, Mic, Play, RotateCcw, Save, UserRound, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user/user-avatar";
import { useProfile, useUpdateProfile } from "@/hooks/auth/useProfile";
import {
    addMeetingAudioPreferencesChangeListener,
    getDefaultMeetingAudioPreferences,
    getMeetingAudioPreferences,
    MEETING_AUDIO_EVENTS,
    MEETING_AUDIO_SOUND_OPTIONS,
    playMeetingAudioPreview,
    setMeetingAudioPreference,
    type MeetingAudioKey,
    type MeetingAudioPreferences,
    type MeetingAudioSoundId,
} from "@/lib/meeting/lobby-audio";
import {
    addMeetingDevicePreferencesChangeListener,
    getDefaultMeetingDevicePreferences,
    getMeetingDevicePreferences,
    setMeetingDevicePreference,
    type MeetingDevicePreferenceKey,
    type MeetingDevicePreferences,
} from "@/lib/meeting/device-preferences";
import { SYSTEM_AVATARS } from "@/lib/user/system-avatars";
import { cn } from "@/lib/utils";

type ProfileDraft = {
    snapshot: string;
    fullName: string;
    avatarUrl: string;
};

type ProfileTab = "profile" | "settings";
type DeviceMenuKey = "camera" | "microphone" | null;

export default function ProfilePage() {
    const profileQuery = useProfile();
    const updateProfileMutation = useUpdateProfile();
    const [draft, setDraft] = useState<ProfileDraft | null>(null);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
    const [activeAudioMenuKey, setActiveAudioMenuKey] = useState<MeetingAudioKey | null>(null);
    const [activeDeviceMenuKey, setActiveDeviceMenuKey] = useState<DeviceMenuKey>(null);
    const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
    const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioPreferences, setAudioPreferences] = useState<MeetingAudioPreferences>(
        () => getDefaultMeetingAudioPreferences(),
    );
    const [devicePreferences, setDevicePreferences] = useState<MeetingDevicePreferences>(
        () => getDefaultMeetingDevicePreferences(),
    );
    const avatarOptions = useMemo(() => (
        Array.from(new Set<string>(SYSTEM_AVATARS)).map((avatar, index) => ({
            id: `system-avatar-${index + 1}`,
            label: `Avatar ${index + 1}`,
            url: avatar,
        }))
    ), []);
    const quickAvatarOptions = avatarOptions.slice(0, 4);

    const profile = profileQuery.data;
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
    const isSaving = updateProfileMutation.isPending;
    const isSaveDisabled = profileQuery.isPending || isSaving || !normalizedFullName || !hasProfileChanged;

    useEffect(() => {
        setAudioPreferences(getMeetingAudioPreferences());

        return addMeetingAudioPreferencesChangeListener(() => {
            setAudioPreferences(getMeetingAudioPreferences());
        });
    }, []);

    useEffect(() => {
        setDevicePreferences(getMeetingDevicePreferences());

        return addMeetingDevicePreferencesChangeListener(() => {
            setDevicePreferences(getMeetingDevicePreferences());
        });
    }, []);

    useEffect(() => {
        let isDisposed = false;

        async function loadMeetingDevices() {
            if (!navigator.mediaDevices?.enumerateDevices) {
                return;
            }

            try {
                const devices = await navigator.mediaDevices.enumerateDevices();

                if (isDisposed) {
                    return;
                }

                setCameraDevices(devices.filter((device) => device.kind === "videoinput"));
                setMicrophoneDevices(devices.filter((device) => device.kind === "audioinput"));
            } catch {
                if (!isDisposed) {
                    setCameraDevices([]);
                    setMicrophoneDevices([]);
                }
            }
        }

        void loadMeetingDevices();

        return () => {
            isDisposed = true;
        };
    }, []);

    const updateDraft = (nextValues: Partial<Omit<ProfileDraft, "snapshot">>) => {
        if (!profile) {
            return;
        }

        setDraft({
            snapshot: profileSnapshot,
            fullName,
            avatarUrl,
            ...nextValues,
        });
    };

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

    const handleReset = () => {
        if (!profile) {
            return;
        }

        setDraft(null);
    };

    const handleMeetingAudioPreferenceChange = (
        audioKey: MeetingAudioKey,
        soundId: MeetingAudioSoundId,
    ) => {
        setAudioPreferences((currentPreferences) => ({
            ...currentPreferences,
            [audioKey]: soundId,
        }));
        setMeetingAudioPreference(audioKey, soundId);
        setActiveAudioMenuKey(null);
    };

    const handlePreviewMeetingAudio = (audioKey: MeetingAudioKey, soundId: MeetingAudioSoundId) => {
        playMeetingAudioPreview(audioKey, soundId);
    };

    const handleMeetingDevicePreferenceChange = <K extends MeetingDevicePreferenceKey>(
        key: K,
        value: MeetingDevicePreferences[K],
    ) => {
        setDevicePreferences((currentPreferences) => ({
            ...currentPreferences,
            [key]: value,
        }));
        setMeetingDevicePreference(key, value);
    };

    const handleMeetingDeviceSelect = (
        key: "defaultCameraDeviceId" | "defaultMicrophoneDeviceId",
        deviceId: string,
    ) => {
        handleMeetingDevicePreferenceChange(key, deviceId);
        setActiveDeviceMenuKey(null);
    };

    const getDeviceLabel = (
        devices: MediaDeviceInfo[],
        selectedDeviceId: string,
        fallbackPrefix: string,
    ) => {
        if (!selectedDeviceId) {
            return "System default";
        }

        const selectedDeviceIndex = devices.findIndex((device) => device.deviceId === selectedDeviceId);
        const selectedDevice = selectedDeviceIndex >= 0 ? devices[selectedDeviceIndex] : null;

        return selectedDevice?.label || `${fallbackPrefix} ${selectedDeviceIndex >= 0 ? selectedDeviceIndex + 1 : ""}`.trim();
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,var(--background),var(--background))]">
            <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-12">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            Profile
                        </h1>
                    </div>
                </div>

                {profileQuery.isPending ? (
                    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                        <Card className="min-h-80 animate-pulse rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm" />
                        <Card className="min-h-80 animate-pulse rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm" />
                    </div>
                ) : profileQuery.isError ? (
                    <Card className="rounded-3xl border-destructive/25 bg-destructive/5 p-7 shadow-sm">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">Unable to load profile</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Please refresh your account information and try again.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    void profileQuery.refetch();
                                }}
                            >
                                <RotateCcw className="h-4 w-4" />
                                Retry
                            </Button>
                        </div>
                    </Card>
                ) : profile ? (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                            <Card className="rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm backdrop-blur">
                                <div className="flex my-5 flex-col items-center text-center">
                                    <button
                                        type="button"
                                        className="group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                        onClick={() => setIsAvatarDialogOpen(true)}
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
                                            onClick={() => setIsAvatarDialogOpen(true)}
                                        >
                                            <UserRound className="h-4 w-4" />
                                            Choose Avatar
                                        </Button>
                                    </div>
                                </div>


                            </Card>

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
                                            onClick={() => setActiveTab("profile")}
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
                                            onClick={() => setActiveTab("settings")}
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

                                {activeTab === "profile" ? (
                                    <>
                                        <div className="space-y-5">
                                            <div>
                                                <label htmlFor="profile-full-name" className="mb-2 block text-sm font-medium">
                                                    Full name
                                                </label>
                                                <Input
                                                    id="profile-full-name"
                                                    value={fullName}
                                                    onChange={(event) => updateDraft({ fullName: event.target.value })}
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
                                                        onClick={() => updateDraft({ avatarUrl: "" })}
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
                                                                onClick={() => updateDraft({ avatarUrl: avatarOption.url })}
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
                                                        onClick={() => setIsAvatarDialogOpen(true)}
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
                                                onClick={handleReset}
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
                                ) : (
                                    <div>
                                        <div className="mb-8 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Video className="h-4 w-4 text-primary" />
                                                <h3 className="text-base font-semibold">Meeting defaults</h3>
                                            </div>

                                            <div className="grid gap-4">
                                                {[
                                                    {
                                                        key: "cameraEnabledOnJoin" as const,
                                                        label: "Camera on when joining",
                                                        checked: devicePreferences.cameraEnabledOnJoin,
                                                    },
                                                    {
                                                        key: "microphoneEnabledOnJoin" as const,
                                                        label: "Microphone on when joining",
                                                        checked: devicePreferences.microphoneEnabledOnJoin,
                                                    },
                                                    {
                                                        key: "rememberLastUsedDevices" as const,
                                                        label: "Remember last used devices",
                                                        checked: devicePreferences.rememberLastUsedDevices,
                                                    },
                                                ].map((setting) => (
                                                    <div
                                                        key={setting.key}
                                                        className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 p-4"
                                                    >
                                                        <p className="text-sm font-medium">{setting.label}</p>
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={setting.checked}
                                                            onClick={() => {
                                                                handleMeetingDevicePreferenceChange(setting.key, !setting.checked);
                                                            }}
                                                            className={cn(
                                                                "relative h-7 w-12 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                                                                setting.checked
                                                                    ? "border-primary bg-primary"
                                                                    : "border-border bg-muted",
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition",
                                                                    setting.checked ? "left-6" : "left-1",
                                                                )}
                                                            />
                                                        </button>
                                                    </div>
                                                ))}

                                                {[
                                                    {
                                                        menuKey: "microphone" as const,
                                                        preferenceKey: "defaultMicrophoneDeviceId" as const,
                                                        label: "Default microphone",
                                                        icon: <Mic className="h-4 w-4 text-primary" />,
                                                        devices: microphoneDevices,
                                                        selectedDeviceId: devicePreferences.defaultMicrophoneDeviceId,
                                                        fallbackPrefix: "Microphone",
                                                    },
                                                    {
                                                        menuKey: "camera" as const,
                                                        preferenceKey: "defaultCameraDeviceId" as const,
                                                        label: "Default camera",
                                                        icon: <Video className="h-4 w-4 text-primary" />,
                                                        devices: cameraDevices,
                                                        selectedDeviceId: devicePreferences.defaultCameraDeviceId,
                                                        fallbackPrefix: "Camera",
                                                    },
                                                ].map((setting) => {
                                                    const isDeviceMenuOpen = activeDeviceMenuKey === setting.menuKey;
                                                    const selectedDeviceLabel = getDeviceLabel(
                                                        setting.devices,
                                                        setting.selectedDeviceId,
                                                        setting.fallbackPrefix,
                                                    );

                                                    return (
                                                        <div
                                                            key={setting.menuKey}
                                                            className="grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] sm:items-center"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                {setting.icon}
                                                                <p className="text-sm font-medium">{setting.label}</p>
                                                            </div>

                                                            <div
                                                                className="relative"
                                                                onBlur={(event) => {
                                                                    if (!event.currentTarget.contains(event.relatedTarget)) {
                                                                        setActiveDeviceMenuKey(null);
                                                                    }
                                                                }}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === "Escape") {
                                                                        setActiveDeviceMenuKey(null);
                                                                    }
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveDeviceMenuKey(
                                                                            isDeviceMenuOpen ? null : setting.menuKey,
                                                                        );
                                                                    }}
                                                                    className={cn(
                                                                        "flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 text-left text-sm shadow-xs outline-none transition",
                                                                        "border-border/80 hover:border-primary/45 hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                                                                        isDeviceMenuOpen && "border-primary/60 bg-background",
                                                                    )}
                                                                    aria-label={setting.label}
                                                                >
                                                                    <span className="min-w-0 truncate font-medium">
                                                                        {selectedDeviceLabel}
                                                                    </span>
                                                                    <ChevronDown
                                                                        className={cn(
                                                                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                                                            isDeviceMenuOpen && "rotate-180",
                                                                        )}
                                                                    />
                                                                </button>

                                                                {isDeviceMenuOpen ? (
                                                                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-[0_18px_48px_rgba(2,6,23,0.38)]">
                                                                        {[
                                                                            { deviceId: "", label: "System default" },
                                                                            ...setting.devices.map((device, index) => ({
                                                                                deviceId: device.deviceId,
                                                                                label: device.label || `${setting.fallbackPrefix} ${index + 1}`,
                                                                            })),
                                                                        ].map((deviceOption) => {
                                                                            const isSelected =
                                                                                setting.selectedDeviceId === deviceOption.deviceId;

                                                                            return (
                                                                                <button
                                                                                    key={deviceOption.deviceId || "system-default"}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handleMeetingDeviceSelect(
                                                                                            setting.preferenceKey,
                                                                                            deviceOption.deviceId,
                                                                                        );
                                                                                    }}
                                                                                    className={cn(
                                                                                        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                                                                                        isSelected
                                                                                            ? "bg-primary/15 text-foreground"
                                                                                            : "hover:bg-muted/70",
                                                                                    )}
                                                                                >
                                                                                    <span
                                                                                        className={cn(
                                                                                            "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                                                                            isSelected
                                                                                                ? "border-primary bg-primary text-primary-foreground"
                                                                                                : "border-muted-foreground/45",
                                                                                        )}
                                                                                    >
                                                                                        {isSelected ? <Check className="h-3 w-3" /> : null}
                                                                                    </span>
                                                                                    <span className="min-w-0 truncate font-medium">
                                                                                        {deviceOption.label}
                                                                                    </span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mb-4 flex items-center gap-2">
                                            <BellRing className="h-4 w-4 text-primary" />
                                            <h3 className="text-base font-semibold">Meeting sounds</h3>
                                        </div>

                                        <div className="space-y-4">
                                            {MEETING_AUDIO_EVENTS.map((audioEvent) => {
                                                const selectedSoundId = audioPreferences[audioEvent.key];
                                                const selectedSoundOption =
                                                    MEETING_AUDIO_SOUND_OPTIONS.find((option) => option.id === selectedSoundId)
                                                    ?? MEETING_AUDIO_SOUND_OPTIONS[0];
                                                const isAudioMenuOpen = activeAudioMenuKey === audioEvent.key;

                                                return (
                                                    <div
                                                        key={audioEvent.key}
                                                        className="grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)_auto] sm:items-center"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium">{audioEvent.label}</p>
                                                        </div>

                                                        <div
                                                            className="relative"
                                                            onBlur={(event) => {
                                                                if (!event.currentTarget.contains(event.relatedTarget)) {
                                                                    setActiveAudioMenuKey(null);
                                                                }
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Escape") {
                                                                    setActiveAudioMenuKey(null);
                                                                }
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveAudioMenuKey(isAudioMenuOpen ? null : audioEvent.key);
                                                                }}
                                                                className={cn(
                                                                    "flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-background/70 px-4 text-left text-sm shadow-xs outline-none transition",
                                                                    "border-border/80 hover:border-primary/45 hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                                                                    isAudioMenuOpen && "border-primary/60 bg-background",
                                                                )}
                                                                aria-label={`${audioEvent.label} sound`}
                                                            >
                                                                <span className="min-w-0 truncate font-medium">
                                                                    {selectedSoundOption.label}
                                                                </span>
                                                                <ChevronDown
                                                                    className={cn(
                                                                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                                                        isAudioMenuOpen && "rotate-180",
                                                                    )}
                                                                />
                                                            </button>

                                                            {isAudioMenuOpen ? (
                                                                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 text-popover-foreground shadow-[0_18px_48px_rgba(2,6,23,0.38)]">
                                                                    {MEETING_AUDIO_SOUND_OPTIONS.map((soundOption) => {
                                                                        const isSelected = selectedSoundId === soundOption.id;

                                                                        return (
                                                                            <button
                                                                                key={soundOption.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    handleMeetingAudioPreferenceChange(
                                                                                        audioEvent.key,
                                                                                        soundOption.id,
                                                                                    );
                                                                                }}
                                                                                className={cn(
                                                                                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                                                                                    isSelected
                                                                                        ? "bg-primary/15 text-foreground"
                                                                                        : "hover:bg-muted/70",
                                                                                )}
                                                                            >
                                                                                <span
                                                                                    className={cn(
                                                                                        "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                                                                        isSelected
                                                                                            ? "border-primary bg-primary text-primary-foreground"
                                                                                            : "border-muted-foreground/45",
                                                                                    )}
                                                                                >
                                                                                    {isSelected ? <Check className="h-3 w-3" /> : null}
                                                                                </span>
                                                                                <span className="min-w-0">
                                                                                    <span className="block font-medium">
                                                                                        {soundOption.label}
                                                                                    </span>
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="h-11 sm:w-11 sm:px-0"
                                                            onClick={() => handlePreviewMeetingAudio(audioEvent.key, selectedSoundId)}
                                                            disabled={selectedSoundId === "none"}
                                                            aria-label={`Preview ${audioEvent.label} sound`}
                                                        >
                                                            <Play className="h-4 w-4" />
                                                            <span className="sm:hidden">Preview</span>
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>

                        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
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
                                            updateDraft({ avatarUrl: "" });
                                            setIsAvatarDialogOpen(false);
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
                                                    updateDraft({ avatarUrl: avatarOption.url });
                                                    setIsAvatarDialogOpen(false);
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
                    </form>
                ) : null}
            </div>
        </div>
    );
}
