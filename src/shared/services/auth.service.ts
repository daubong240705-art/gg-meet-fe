import { sendRequest } from "@/lib/api/wrapper";
import { getBackendBaseUrl } from "@/lib/config/api-url";
import { LoginForm, SignupForm } from "@/types/form.type";

const API_URL = getBackendBaseUrl();

export type SignupPayload = Omit<SignupForm, "confirmPassword">;
export type AuthUserResponseData = {
    id?: number | string | null;
    email?: string | null;
    fullName?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
    role?: Role | string | null;
    createdAt?: string | null;
};
export type LoginResponseData = {
    access_token?: string;
    accessToken?: string;
    // Returned by the backend only for non-browser clients (X-Client header);
    // the web keeps the refresh token in an HTTP-only cookie.
    refresh_token?: string;
    refreshToken?: string;
    user?: AuthUserResponseData | null;
};
export type UpdateAccountRequestData = {
    fullName: string;
    avatarUrl?: string | null;
};

export const authApi = {
    login(data: LoginForm) {
        return sendRequest<IBackendRes<LoginResponseData>>({
            url: `${API_URL}/auth/login`,
            method: "POST",
            body: data,
            useCredentials: true,
        });
    },

    signup(data: SignupPayload) {
        return sendRequest<IBackendRes<unknown>>({
            url: `${API_URL}/auth/register`,
            method: "POST",
            body: data,
            useCredentials: true,
        });
    },

    sendVerifyCode(email: string) {
        return sendRequest<IBackendRes<unknown>>({
            url: `${API_URL}/auth/send-verify-code`,
            method: "POST",
            queryParams: { email },
            useCredentials: true,
        });
    },

    logout() {
        return sendRequest<IBackendRes<null>>({
            url: `${API_URL}/auth/logout`,
            method: "POST",
            useCredentials: true,
            auth: true,
            redirectOnAuthFail: false,
        });
    },

    getAccount() {
        return sendRequest<AuthUserResponseData & Partial<IBackendRes<unknown>>>({
            url: `${API_URL}/auth/account`,
            method: "GET",
            useCredentials: true,
            auth: true,
        });
    },

    updateAccount(data: UpdateAccountRequestData) {
        const avatarUrl = data.avatarUrl?.trim();

        return sendRequest<IBackendRes<AuthUserResponseData>>({
            url: `${API_URL}/auth/account`,
            method: "PUT",
            body: {
                fullName: data.fullName.trim(),
                avatar: avatarUrl || null,
            },
            useCredentials: true,
            auth: true,
        });
    },
};
