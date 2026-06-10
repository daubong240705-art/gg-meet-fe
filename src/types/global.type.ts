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
        };
    }

}
