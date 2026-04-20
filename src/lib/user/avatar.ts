const normalizeAvatarSource = (value?: string | null) => {
    if (!value) {
        return "";
    }

    return value
        .trim()
        .replace(/\s+/g, " ");
};

const getEmailInitials = (value: string) => {
    const [localPart = ""] = value.split("@");
    const normalizedLocalPart = localPart
        .trim()
        .replace(/[^a-zA-Z0-9._+-]+/g, "");

    if (!normalizedLocalPart) {
        return "";
    }

    const emailParts = normalizedLocalPart
        .split(/[._+-]+/)
        .filter(Boolean);

    if (emailParts.length >= 2) {
        return emailParts
            .slice(0, 2)
            .map((part) => part[0] || "")
            .join("")
            .toUpperCase();
    }

    return normalizedLocalPart.slice(0, 2).toUpperCase();
};

const getNameInitials = (value: string) => value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function getAvatarInitials(source?: string | null, fallback = "U") {
    const normalizedSource = normalizeAvatarSource(source);

    if (!normalizedSource) {
        return fallback;
    }

    const initials = normalizedSource.includes("@")
        ? getEmailInitials(normalizedSource)
        : getNameInitials(normalizedSource);

    return initials || fallback;
}
