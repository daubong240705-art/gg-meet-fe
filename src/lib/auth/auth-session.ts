"use client";

import { useSyncExternalStore } from "react";

import type { LoginResponseData } from "@/service/auth.service";

const AUTH_USER_STORAGE_KEY = "auth-user";
const AUTH_USER_CHANGED_EVENT = "auth-user-changed";

export type AuthUser = User;

type JwtAuthPayload = {
    sub?: string;
    roles?: string;
    user?: Partial<User> & { name?: string };
};

const isBrowser = typeof window !== "undefined";
let authUserSnapshot: AuthUser | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const toStringValue = (value: unknown) =>
    typeof value === "string" ? value : "";

const toNumberValue = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
};

const decodeBase64Url = (value: string) => {
    const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
    const paddedValue = normalizedValue.padEnd(
        normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
        "=",
    );

    try {
        const binaryValue = atob(paddedValue);
        const bytes = Uint8Array.from(binaryValue, (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch {
        return null;
    }
};

const notifyAuthUserChanged = () => {
    if (!isBrowser) {
        return;
    }

    window.dispatchEvent(new Event(AUTH_USER_CHANGED_EVENT));
};

const formatDisplayName = (email: string) => {
    const localPart = email.split("@")[0] ?? "";

    return (
        localPart
            .split(/[._-]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ") || email
    );
};

const normalizeAuthUser = (source: JwtAuthPayload["user"], fallbackEmail?: string, fallbackRole?: string): AuthUser | null => {
    const record = isRecord(source) ? source : {};
    const email = toStringValue(record.email) || fallbackEmail || "";

    if (!email) {
        return null;
    }

    return {
        id: toNumberValue(record.id) ?? 0,
        email,
        fullName: toStringValue(record.fullName) || toStringValue(record.name) || formatDisplayName(email),
        avatarUrl: toStringValue(record.avatarUrl),
        role: record.role === "ADMIN" || fallbackRole === "ADMIN" ? "ADMIN" : "USER",
        createdAt: toStringValue(record.createdAt),
    };
};

export function getUserInitials(name: string) {
    return (
        name
            .split(/\s+/)
            .map((part) => part[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U"
    );
}

function readStoredAuthUserFromStorage() {
    if (!isBrowser) {
        return null;
    }

    try {
        const rawValue = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

        if (!rawValue) {
            return null;
        }

        const parsedValue = JSON.parse(rawValue);
        return normalizeAuthUser(parsedValue);
    } catch {
        return null;
    }
}

export function readStoredAuthUser() {
    if (authUserSnapshot !== undefined) {
        return authUserSnapshot;
    }

    authUserSnapshot = readStoredAuthUserFromStorage();
    return authUserSnapshot;
}

export function persistAuthUser(user: AuthUser) {
    if (!isBrowser) {
        return;
    }

    authUserSnapshot = user;
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    notifyAuthUserChanged();
}

export function clearStoredAuthUser() {
    if (!isBrowser) {
        return;
    }

    authUserSnapshot = null;
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    notifyAuthUserChanged();
}

export function getAccessToken(response: IBackendRes<LoginResponseData>) {
    if (!isRecord(response.data)) {
        return null;
    }

    return toStringValue(response.data.access_token) || toStringValue(response.data.accessToken) || null;
}

export function extractAuthUserFromToken(token: string) {
    const payloadPart = token.split(".")[1];

    if (!payloadPart) {
        return null;
    }

    const payloadText = decodeBase64Url(payloadPart);

    if (!payloadText) {
        return null;
    }

    try {
        const payload = JSON.parse(payloadText) as JwtAuthPayload;

        if (!isRecord(payload)) {
            return null;
        }

        return normalizeAuthUser(
            payload.user,
            toStringValue(payload.sub),
            toStringValue(payload.roles),
        );
    } catch {
        return null;
    }
}

export function syncAuthUserFromLogin(response: IBackendRes<LoginResponseData>) {
    const accessToken = getAccessToken(response);

    if (!accessToken) {
        return null;
    }

    const user = extractAuthUserFromToken(accessToken);

    if (user) {
        persistAuthUser(user);
    }

    return user;
}

export function subscribeToAuthUserChanges(callback: () => void) {
    if (!isBrowser) {
        return () => undefined;
    }

    const handleChange = () => {
        authUserSnapshot = readStoredAuthUserFromStorage();
        callback();
    };

    window.addEventListener("storage", handleChange);
    window.addEventListener(AUTH_USER_CHANGED_EVENT, handleChange);

    return () => {
        window.removeEventListener("storage", handleChange);
        window.removeEventListener(AUTH_USER_CHANGED_EVENT, handleChange);
    };
}

export function useAuthSession() {
    const user = useSyncExternalStore(subscribeToAuthUserChanges, readStoredAuthUser, () => null);

    return {
        user,
        isAuthenticated: Boolean(user),
        setUser: persistAuthUser,
        clearUser: clearStoredAuthUser,
    };
}
