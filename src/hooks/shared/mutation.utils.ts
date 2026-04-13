/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

export type ApiFailure = {
    status?: number | string;
    statusCode?: number | string;
    error?: unknown;
    errors?: unknown;
    message?: string;
};

const getStatusCode = (value?: number | string) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const hasApiErrors = (errors: unknown) => {
    if (Array.isArray(errors)) {
        return errors.length > 0;
    }

    if (errors && typeof errors === "object") {
        return Object.keys(errors).length > 0;
    }

    return Boolean(errors);
};

export const assertApiSuccess = <T>(response: T): T => {
    const apiError = response as ApiFailure;
    const statusCode = getStatusCode(apiError?.statusCode ?? apiError?.status);

    if ((statusCode !== null && statusCode >= 400) || apiError?.error || hasApiErrors(apiError?.errors)) {
        throw response;
    }

    return response;
};

export const handleFormError = <T extends FieldValues>(
    err: IBackendRes<any>,
    setError: UseFormSetError<T>,
) => {
    const serverErrors = err.errors;

    if (serverErrors && typeof serverErrors === "object" && !Array.isArray(serverErrors)) {
        Object.keys(serverErrors).forEach((field) => {
            setError(field as Path<T>, {
                type: "server",
                message: String(serverErrors[field]),
            });
        });

        toast.error("Please review your input", {
            description: "Some fields need attention before you can continue.",
        });
        return;
    }

    const errorMessage = Array.isArray(serverErrors)
        ? serverErrors[0]
        : typeof serverErrors === "string"
            ? serverErrors
            : typeof err.error === "string"
                ? err.error
                : err.message;

    toast.error("Something went wrong", {
        description: errorMessage || "Please try again in a moment.",
    });
};
