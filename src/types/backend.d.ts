/* eslint-disable @typescript-eslint/no-explicit-any */
export { };
// https://bobbyhadz.com/blog/typescript-make-types-global#declare-global-types-in-typescript

declare global {
    interface IRequest {
        url: string;
        method: string;
        body?: { [key: string]: any } | FormData | null;
        queryParams?: any;
        useCredentials?: boolean;
        headers?: any;
        nextOption?: any;
        auth?: boolean;
        accessToken?: string | null;
        cookieHeader?: string;
        redirectOnAuthFail?: string | false;
    }

    interface IBackendRes<T> {
        errors?: string | string[] | Record<string, string>;
        message: string;
        status: number | string;
        data?: T;
    }

    interface IModelPaginate<T> {
        meta: {
            current: number;
            pageSize: number;
            pages: number;
            total: number;
        },
        result: T[]
    }

}
