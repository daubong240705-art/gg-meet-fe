const AUTH_ACCESS_TOKEN_STORAGE_KEY = "auth-access-token";

const isBrowser = typeof window !== "undefined";

let accessTokenSnapshot: string | null | undefined;

const readStoredAccessTokenFromStorage = () => {
    if (!isBrowser) {
        return null;
    }

    try {
        const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
        return accessToken?.trim() || null;
    } catch {
        return null;
    }
};

export const readStoredAccessToken = () => {
    if (accessTokenSnapshot !== undefined) {
        return accessTokenSnapshot;
    }

    accessTokenSnapshot = readStoredAccessTokenFromStorage();
    return accessTokenSnapshot;
};

export const persistAccessToken = (accessToken: string) => {
    if (!isBrowser) {
        return;
    }

    const normalizedToken = accessToken.trim();

    accessTokenSnapshot = normalizedToken || null;

    if (!normalizedToken) {
        window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
};

export const clearStoredAccessToken = () => {
    if (!isBrowser) {
        return;
    }

    accessTokenSnapshot = null;
    window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
};
