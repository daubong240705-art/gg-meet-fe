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

}
