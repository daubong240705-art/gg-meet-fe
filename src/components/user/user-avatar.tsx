import type { CSSProperties } from "react";

import { getAvatarInitials } from "@/lib/user/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
    avatarUrl?: string | null;
    name?: string | null;
    email?: string | null;
    className?: string;
    initialsClassName?: string;
    label?: string;
};

const getSafeBackgroundImage = (avatarUrl?: string | null) => {
    const normalizedAvatarUrl = avatarUrl?.trim();

    if (!normalizedAvatarUrl) {
        return undefined;
    }

    return `url(${JSON.stringify(normalizedAvatarUrl)})`;
};

export function UserAvatar({
    avatarUrl,
    name,
    email,
    className,
    initialsClassName,
    label,
}: UserAvatarProps) {
    const backgroundImage = getSafeBackgroundImage(avatarUrl);
    const fallbackText = name?.trim() || email?.trim() || "User";
    const initials = getAvatarInitials(fallbackText, "U");
    const style = backgroundImage
        ? ({
            backgroundImage,
        } satisfies CSSProperties)
        : undefined;

    return (
        <div
            aria-label={label || fallbackText}
            className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-full text-primary-foreground",
                backgroundImage ? "bg-transparent bg-cover bg-center bg-no-repeat" : "bg-primary",
                className,
            )}
            role="img"
            style={style}
        >
            {backgroundImage ? (
                <span className="sr-only">{label || fallbackText}</span>
            ) : (
                <span className={cn("font-semibold", initialsClassName)}>{initials}</span>
            )}
        </div>
    );
}
