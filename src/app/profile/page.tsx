"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Save, UserRound } from "lucide-react";

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
import { SYSTEM_AVATARS } from "@/lib/user/system-avatars";
import { cn } from "@/lib/utils";

type ProfileDraft = {
    snapshot: string;
    fullName: string;
    avatarUrl: string;
};

export default function ProfilePage() {
    const profileQuery = useProfile();
    const updateProfileMutation = useUpdateProfile();
    const [draft, setDraft] = useState<ProfileDraft | null>(null);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
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

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,var(--background),var(--background))]">
            <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8 lg:py-12">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Account</p>
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
                        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
                            <Card className="rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm backdrop-blur">
                                <div className="flex mt-20 flex-col items-center text-center">
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

                            <Card className="rounded-3xl border-border/70 bg-card/80 p-7 shadow-sm backdrop-blur">
                                <div className="mb-7">
                                    <h2 className="text-2xl font-semibold tracking-tight">Profile Information</h2>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Your name and avatar are used across meetings and account surfaces.
                                    </p>
                                </div>

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
