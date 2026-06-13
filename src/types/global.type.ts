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

    type DesktopMeetingWindowState = {
        title: string;
        participantCount: number;
        isMicEnabled: boolean;
        isCameraEnabled: boolean;
        isScreenSharing: boolean;
    };

    type DesktopMeetingControl = 'toggle-mic' | 'toggle-camera' | 'leave';

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
            meeting?: {
                setActive: (active: boolean) => Promise<void>;
                updateState: (state: DesktopMeetingWindowState) => Promise<void>;
                getState: () => Promise<DesktopMeetingWindowState>;
                onStateChange: (callback: (state: DesktopMeetingWindowState) => void) => () => void;
                onCloseRequest: (callback: () => void) => () => void;
                onControl: (callback: (control: DesktopMeetingControl) => void) => () => void;
                sendControl: (control: DesktopMeetingControl) => void;
                restoreMainWindow: () => void;
                confirmClose: () => void;
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
