"use client";

import { syncAuthUserFromLogin, useAuthSession } from "@/lib/auth/auth-session";
import { zodResolver } from "@/lib/form/zod-resolver";
import { authApi, LoginResponseData } from "@/service/auth.service";
import { LoginForm, loginSchema, SignupForm, signupSchema } from "@/types/form.type";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { assertApiSuccess, handleFormError } from "../shared/mutation.utils";

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
            handleFormError(err, form.setError);
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
        },
    });
}

export function useSignupMutation(form: ReturnType<typeof useSignupForm>) {
    const router = useRouter();

    return useMutation<IBackendRes<unknown>, IBackendRes<unknown>, SignupForm>({
        mutationFn: async (data: SignupForm) => {
            const { confirmPassword, ...payload } = data;
            void confirmPassword;

            const response = await authApi.signup(payload);
            return assertApiSuccess(response);
        },
        onSuccess: () => {
            toast.success("Account created", {
                description: "Your account is ready. Please sign in to continue.",
            });
            router.replace("/sign-in");
            router.refresh();
        },
        onError: (err) => {
            handleFormError(err, form.setError);
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
