/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */

import queryString from "query-string";

import { clearStoredAccessToken, persistAccessToken, readStoredAccessToken } from "../auth/auth-token";
import { getBackendBaseUrl } from "../config/api-url";

const isBrowser = typeof window !== "undefined";

let refreshPromise: Promise<string | null> | null = null;

type RefreshProps = {
    cookieHeader?: string;
};

const refreshToken = async (props?: RefreshProps): Promise<string | null> => {
    const backendBaseUrl = getBackendBaseUrl();

    const res = await fetch(`${backendBaseUrl}/auth/refresh`, {
        method: "GET",
        headers: props?.cookieHeader ? { cookie: props.cookieHeader } : undefined,
        credentials: "include",
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Refresh token failed");
    }

    const data = await res.json();

    return data?.data?.accessToken ?? data?.data?.access_token ?? null;
};

const getFreshToken = async (props?: RefreshProps) => {
    if (!refreshPromise) {
        refreshPromise = refreshToken(props).finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
};

const getJsonResponse = async (res: Response): Promise<any> => {
    const text = await res.text().catch(() => null);
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

export const sendRequest = async <T>(props: IRequest): Promise<T> => {
    let {
        url,
        method = "GET",
        body,
        queryParams,
        headers = {},
        useCredentials = false,
        auth = false,
        cookieHeader,
        nextOption = {},
        redirectOnAuthFail = "/sign-in",
    } = props;

    if (queryParams) {
        url = `${url}?${queryString.stringify(queryParams)}`;
    }

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    const finalHeaders: any = {
        ...(!isFormData ? { "content-type": "application/json" } : {}),
        ...headers,
    };

    if (auth) {
        const bearerToken = props.accessToken ?? (isBrowser ? readStoredAccessToken() : null);

        if (bearerToken) {
            finalHeaders.Authorization = `Bearer ${bearerToken}`;
        }
    }

    if (!isBrowser && useCredentials && cookieHeader) {
        finalHeaders.cookie = cookieHeader;
    }

    const options: RequestInit = {
        method,
        headers: new Headers(finalHeaders),
        body: body
            ? isFormData
                ? body
                : JSON.stringify(body)
            : null,
        cache: "no-store",
        ...nextOption,
    };

    if (useCredentials) {
        options.credentials = "include";
    }

    // Guard: keepalive requests have a 64 KB body limit — remove keepalive if exceeded
    if (options.keepalive && typeof options.body === "string" && new TextEncoder().encode(options.body).length > 60 * 1024) {
        delete (options as any).keepalive;
    }

    let res: Response;
    try {
        res = await fetch(url, options);
    } catch (networkError) {
        return {
            status: 0,
            statusCode: 0,
            message: networkError instanceof Error ? networkError.message : "Network request failed",
            error: "NetworkError",
        } as T;
    }

    if (res.ok) {
        return (await getJsonResponse(res)) ?? ({} as T);
    }

    if (res.status === 401 && auth) {
        let newToken: string | null = null;

        try {
            newToken = await getFreshToken({ cookieHeader });
        } catch {
            // refresh request itself failed (network or server error)
        }

        if (!newToken) {
            if (isBrowser) clearStoredAccessToken();
            if (isBrowser && redirectOnAuthFail) {
                window.location.href = redirectOnAuthFail;
            }
            return {
                status: 401,
                statusCode: 401,
                message: "Session expired",
                error: "Unauthorized",
            } as T;
        }

        finalHeaders.Authorization = `Bearer ${newToken}`;
        if (isBrowser) persistAccessToken(newToken);

        const retryOptions: RequestInit = {
            ...options,
            headers: new Headers(finalHeaders),
        };

        let retryRes: Response;
        try {
            retryRes = await fetch(url, retryOptions);
        } catch (networkError) {
            return {
                status: 0,
                statusCode: 0,
                message: networkError instanceof Error ? networkError.message : "Network request failed",
                error: "NetworkError",
            } as T;
        }

        if (retryRes.ok) {
            return (await getJsonResponse(retryRes)) ?? ({} as T);
        }

        const retryJson: any = (await getJsonResponse(retryRes)) ?? {};
        return {
            ...retryJson,
            status: retryJson?.status ?? retryRes.status,
            statusCode: retryJson?.statusCode ?? retryRes.status,
            message: retryJson?.message ?? "Request failed",
            error: retryJson?.error ?? null,
            errors: retryJson?.errors,
        } as T;
    }

    const json: any = (await getJsonResponse(res)) ?? {};

    return {
        ...json,
        status: json?.status ?? res.status,
        statusCode: json?.statusCode ?? res.status,
        message: json?.message ?? "Request failed",
        error: json?.error ?? null,
        errors: json?.errors,
    } as T;
};
