const DEFAULT_PUBLIC_BACKEND_URL = "/api";
const DEFAULT_INTERNAL_BACKEND_URL = "http://backend:8080/api";
const DEFAULT_LIVEKIT_WS_URL = "ws://192.168.10.207:7880";

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
