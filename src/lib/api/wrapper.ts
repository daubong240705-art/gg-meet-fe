/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */


import queryString from "query-string"
import { getBackendBaseUrl } from "../config/api-url"

const isBrowser = typeof window !== "undefined"

let refreshPromise: Promise<string | null> | null = null

type RefreshProps = {
    cookieHeader?: string
}

const refreshToken = async (props?: RefreshProps): Promise<string | null> => {
    const backendBaseUrl = getBackendBaseUrl()

    const res = await fetch(`${backendBaseUrl}/auth/refresh`, {
        method: "GET",
        headers: props?.cookieHeader ? { cookie: props.cookieHeader } : undefined,
        credentials: "include",
        cache: "no-store"
    })

    if (!res.ok) {
        throw new Error("Refresh token failed")
    }

    const data = await res.json()

    return data?.data?.accessToken ?? null
}

const getFreshToken = async (props?: RefreshProps) => {

    if (!refreshPromise) {
        refreshPromise = refreshToken(props).finally(() => {
            refreshPromise = null
        })
    }

    return refreshPromise
}

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
        redirectOnAuthFail = "/auth"
    } = props

    if (queryParams) {
        url = `${url}?${queryString.stringify(queryParams)}`
    }

    const isFormData = typeof FormData !== "undefined" && body instanceof FormData

    const finalHeaders: any = {
        ...(!isFormData ? { "content-type": "application/json" } : {}),
        ...headers
    }

    if (!isBrowser && useCredentials && cookieHeader) {
        finalHeaders.cookie = cookieHeader
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
        ...nextOption
    }

    if (useCredentials) {
        options.credentials = "include"
    }

    let res = await fetch(url, options)

    if (res.ok) {
        return res.json()
    }

    if (res.status === 401 && auth) {

        try {

            const newToken = await getFreshToken({ cookieHeader })

            if (!newToken && !isBrowser) {
                throw new Error("Refresh failed")
            }

            if (!isBrowser && newToken) {
                finalHeaders.Authorization = `Bearer ${newToken}`
            }

            const retryOptions: RequestInit = {
                ...options,
                headers: new Headers(finalHeaders)
            }

            res = await fetch(url, retryOptions)

            if (res.ok) {
                return res.json()
            }

        } catch (error) {

            if (isBrowser && redirectOnAuthFail) {
                window.location.href = redirectOnAuthFail
            }

            throw error
        }
    }

    let json: any = {}

    try {
        json = await res.json()
    } catch { }

    return {
        statusCode: res.status,
        message: json?.message ?? "Request failed",
        error: json?.error ?? ""
    } as T
}
