"use client";

import { syncAuthUserFromLogin, useAuthSession } from "@/lib/auth/auth-session";
import { zodResolver } from "@/lib/form/zod-resolver";
import { authApi, LoginResponseData } from "@/service/auth.service";
import { LoginForm, loginSchema, SignupForm, signupSchema } from "@/types/form.type";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FieldValues, Path, useForm, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

import { assertApiSuccess, handleFormError } from "../shared/mutation.utils";

const AUTH_ERROR_MESSAGES = {
    EMAIL_ALREADY_EXIST: {
        field: "email",
        message: "Email is already in use",
    },
    INVALID_TOKEN: {
        field: "verifyCode",
        message: "Verification code is invalid or has expired",
    },
    EXPIRED_TOKEN: {
        field: "verifyCode",
        message: "Verification code has expired",
    },
    BAD_CREDENTIALS: {
        field: "root",
        message: "Account was created, but automatic sign-in failed. Please sign in manually.",
    },
    DATA_NOT_ENOUGH: {
        field: "root",
        message: "Please complete all required fields and try again.",
    },
    USER_DISABLED: {
        field: "root",
        message: "This account is disabled. Please contact support.",
    },
    USER_LOCKED: {
        field: "root",
        message: "This account is locked. Please contact support.",
    },
    UNAUTHORIZED: {
        field: "root",
        message: "You are not authorized to perform this action.",
    },
    ACCESS_DENIED: {
        field: "root",
        message: "Access denied. Please try again or contact support.",
    },
} as const;

type KnownAuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

const isKnownAuthErrorCode = (value: string): value is KnownAuthErrorCode =>
    value in AUTH_ERROR_MESSAGES;

const getApiErrorCode = (err: IBackendRes<unknown>) => {
    const candidates = [err.errors, err.error, err.message];

    for (const candidate of candidates) {
        if (typeof candidate !== "string") {
            continue;
        }

        const normalizedCandidate = candidate.trim().toUpperCase();

        if (isKnownAuthErrorCode(normalizedCandidate)) {
            return normalizedCandidate;
        }
    }

    return null;
};

const setRootError = <T extends FieldValues>(setError: UseFormSetError<T>, message: string) => {
    setError("root" as Path<T>, {
        type: "server",
        message,
    });
};

const handleAuthApiError = <T extends FieldValues>(
    err: IBackendRes<unknown>,
    setError: UseFormSetError<T>,
) => {
    if (err.errors && typeof err.errors === "object" && !Array.isArray(err.errors)) {
        handleFormError(err, setError);
        return;
    }

    const errorCode = getApiErrorCode(err);

    if (errorCode) {
        const mappedError = AUTH_ERROR_MESSAGES[errorCode];
        const displayMessage =
            typeof err.message === "string" && err.message.trim()
                ? err.message.trim()
                : mappedError.message;

        if (mappedError.field === "root") {
            setRootError(setError, displayMessage);
        } else {
            setError(mappedError.field as Path<T>, {
                type: "server",
                message: displayMessage,
            });
        }
        return;
    }

    handleFormError(err, setError);
};

export function useLoginForm() {
    return useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });
}

export function useLoginMutation(form: ReturnType<typeof useLoginForm>) {
    const router = useRouter();

    return useMutation<IBackendRes<LoginResponseData>, IBackendRes<unknown>, LoginForm>({
        mutationFn: async (data: LoginForm) => {
            const response = await authApi.login(data);
            return assertApiSuccess(response);
        },
        onSuccess: (response) => {
            syncAuthUserFromLogin(response);
            toast.success("Welcome back", {
                description: "You have signed in successfully.",
            });
            router.replace("/");
            router.refresh();
        },
        onError: (err) => {
            handleAuthApiError(err, form.setError);
        },
    });
}

export function useSignupForm() {
    return useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
            verifyCode: "",
        },
    });
}

export function useSignupMutation(form: ReturnType<typeof useSignupForm>) {
    const router = useRouter();

    return useMutation<IBackendRes<LoginResponseData>, IBackendRes<unknown>, SignupForm>({
        mutationFn: async (data: SignupForm) => {
            const { confirmPassword, ...payload } = data;
            void confirmPassword;

            const signupResponse = await authApi.signup(payload);
            assertApiSuccess(signupResponse);

            const loginResponse = await authApi.login({
                email: data.email,
                password: data.password,
            });

            return assertApiSuccess(loginResponse);
        },
        onSuccess: (response) => {
            syncAuthUserFromLogin(response);
            toast.success("Account created", {
                description: "Your account is ready and you are now signed in.",
            });
            router.replace("/");
            router.refresh();
        },
        onError: (err) => {
            handleAuthApiError(err, form.setError);
        },
    });
}

export function useSendVerifyCodeMutation(form: ReturnType<typeof useSignupForm>) {
    return useMutation<IBackendRes<unknown>, IBackendRes<unknown>, string>({
        mutationFn: async (email: string) => {
            const response = await authApi.sendVerifyCode(email);
            return assertApiSuccess(response);
        },
        onSuccess: () => {
            form.clearErrors("verifyCode");
            toast.success("Verification code sent", {
                description: "Verification code has been sent to your email.",
            });
        },
        onError: (err) => {
            handleAuthApiError(err, form.setError);
        },
    });
}

export function useLogoutMutation() {
    const router = useRouter();
    const { clearUser } = useAuthSession();

    return useMutation<IBackendRes<null>, unknown, void>({
        mutationFn: async () => {
            const response = await authApi.logout();
            return assertApiSuccess(response);
        },
        onSuccess: () => {
            clearUser();
            // toast.success("Signed out", {
            //     description: "You have been signed out successfully.",
            // });
            router.replace("/");
            router.refresh();
        },
        onError: () => {
            clearUser();
            toast.warning("Signed out locally", {
                description: "Your session on this device has been cleared.",
            });
            router.replace("/");
            router.refresh();
        },
    });
}
