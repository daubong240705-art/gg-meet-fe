export { };

declare global {
    type Role = 'ADMIN' | 'USER';

    interface User {
        id: number;
        email: string;
        fullName: string;
        avatarUrl: string;
        role: Role;
        createdAt: string;
    }

    type DesktopScreenShareSource = {
        id: string;
        name: string;
        thumbnail: string;
        appIcon: string | null;
        displayId: string;
        type: 'screen' | 'window';
    };

    interface Window {
        desktop?: {
            isElectron: boolean;
            config?: {
                backendUrl?: string;
                websocketUrl?: string;
                meetingSocketUrl?: string;
            };
            auth?: {
                getRefreshToken: () => Promise<string | null>;
                setRefreshToken: (token: string | null) => Promise<void>;
            };
            clipboard?: {
                writeText: (text: string) => Promise<boolean>;
            };
            screen?: {
                getSources: () => Promise<DesktopScreenShareSource[]>;
                setPreferredSource: (sourceId: string | null) => Promise<void>;
                onPickRequest: (callback: () => void) => () => void;
                pickResponse: (sourceId: string | null) => void;
            };
        };
    }

}
