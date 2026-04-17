import { sendRequest } from "@/lib/api/wrapper";
import { getBackendBaseUrl } from "@/lib/config/api-url";
import { LoginForm, SignupForm } from "@/types/form.type";

const API_URL = getBackendBaseUrl();

export type SignupPayload = Omit<SignupForm, "confirmPassword">;
export type LoginResponseData = {
    access_token?: string;
    accessToken?: string;
};

const getResponseStatus = (response: IBackendRes<unknown>) => {
    const status = Number(response.statusCode ?? response.status);
    return Number.isFinite(status) ? status : null;
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

    async signup(data: SignupPayload) {
        const response = await sendRequest<IBackendRes<unknown>>({
            url: `${API_URL}/auth/register`,
            method: "POST",
            body: data,
            useCredentials: true,
        });

        if (getResponseStatus(response) === 404) {
            return sendRequest<IBackendRes<unknown>>({
                url: `${API_URL}/register`,
                method: "POST",
                body: data,
                useCredentials: true,
            });
        }

        return response;
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
};
