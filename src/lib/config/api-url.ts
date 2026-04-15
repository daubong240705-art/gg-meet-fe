const DEFAULT_PUBLIC_BACKEND_URL = "/api";
const DEFAULT_INTERNAL_BACKEND_URL = "http://backend:8080/api";
const DEFAULT_LIVEKIT_WS_URL = "ws://192.168.10.207:7880";
const DEFAULT_MEETING_SOCKET_URL = "http://backend:8080/server";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const stripApiPath = (pathname: string) => {
    const normalizedPathname = pathname || "/";

    if (/\/api\/?$/i.test(normalizedPathname)) {
        return normalizedPathname.replace(/\/api\/?$/i, "") || "/";
    }

    return normalizedPathname;
};

export const getBackendBaseUrl = () => {
    if (typeof window === "undefined") {
        return (
            process.env.BACKEND_INTERNAL_URL ??
            process.env.NEXT_PUBLIC_BACKEND_URL ??
            DEFAULT_INTERNAL_BACKEND_URL
        );
    }

    return process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_PUBLIC_BACKEND_URL;
};

export const getLiveKitWebsocketUrl = () =>
    process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? DEFAULT_LIVEKIT_WS_URL;

export const getMeetingSocketHttpUrl = () => {
    const explicitSocketUrl = process.env.NEXT_PUBLIC_MEETING_SOCKET_URL;

    if (explicitSocketUrl?.trim()) {
        return trimTrailingSlash(explicitSocketUrl.trim());
    }

    const backendBaseUrl = getBackendBaseUrl();

    try {
        const resolvedBaseUrl =
            typeof window === "undefined"
                ? new URL(backendBaseUrl)
                : new URL(backendBaseUrl, window.location.origin);

        resolvedBaseUrl.pathname = `${trimTrailingSlash(stripApiPath(resolvedBaseUrl.pathname))}/server`;
        resolvedBaseUrl.search = "";
        resolvedBaseUrl.hash = "";

        return trimTrailingSlash(resolvedBaseUrl.toString());
    } catch {
        return DEFAULT_MEETING_SOCKET_URL;
    }
};
