// Desktop-only refresh-token storage. On the web the refresh token lives in an
// HTTP-only cookie that the frontend never reads, so both helpers are no-ops
// there. On desktop (Electron) the token is held by the main process,
// encrypted with the OS keychain via safeStorage, and reached over IPC.

export const isDesktop = () =>
    typeof window !== "undefined" && window.desktop?.isElectron === true;

export async function getDesktopRefreshToken(): Promise<string | null> {
    if (!isDesktop()) {
        return null;
    }

    try {
        return (await window.desktop?.auth?.getRefreshToken()) ?? null;
    } catch {
        return null;
    }
}

export async function setDesktopRefreshToken(token: string | null): Promise<void> {
    if (!isDesktop()) {
        return;
    }

    try {
        await window.desktop?.auth?.setRefreshToken(token ?? null);
    } catch {
        // Losing the persisted token only means the session will not survive a
        // restart — never break the auth flow over it.
    }
}
