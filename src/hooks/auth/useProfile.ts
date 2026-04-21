"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import {
    normalizeAuthUser,
    useAuthSession,
    type AuthUser,
} from "@/lib/auth/auth-session";
import { authApi, type AuthUserResponseData, type UpdateAccountRequestData } from "@/service/auth.service";

import { assertApiSuccess, type ApiFailure } from "../shared/mutation.utils";

export const PROFILE_QUERY_KEY = ["auth", "account"] as const;

const getProfileErrorMessage = (error: unknown) => {
    const apiError = error as ApiFailure;

    if (Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        return String(apiError.errors[0]);
    }

    if (typeof apiError.errors === "string" && apiError.errors.trim()) {
        return apiError.errors.trim();
    }

    if (typeof apiError.error === "string" && apiError.error.trim()) {
        return apiError.error.trim();
    }

    if (typeof apiError.message === "string" && apiError.message.trim()) {
        return apiError.message.trim();
    }

    return "Please try again in a moment.";
};

const normalizeProfileUser = (data?: AuthUserResponseData | null) => {
    const user = normalizeAuthUser(data);

    if (!user) {
        throw new Error("The server did not return a valid profile.");
    }

    return user;
};

export function useProfile() {
    const { setUser } = useAuthSession();
    const profileQuery = useQuery<AuthUserResponseData & Partial<IBackendRes<unknown>>, IBackendRes<unknown> | Error, AuthUser>({
        queryKey: PROFILE_QUERY_KEY,
        queryFn: async () => {
            const response = await authApi.getAccount();
            return assertApiSuccess(response);
        },
        select: normalizeProfileUser,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (!profileQuery.data) {
            return;
        }

        setUser(profileQuery.data);
    }, [profileQuery.data, setUser]);

    return profileQuery;
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { setUser } = useAuthSession();

    return useMutation<IBackendRes<AuthUserResponseData>, IBackendRes<unknown> | Error, UpdateAccountRequestData>({
        mutationFn: async (data) => {
            const response = await authApi.updateAccount(data);
            return assertApiSuccess(response);
        },
        onSuccess: (response) => {
            const updatedUser = normalizeProfileUser(response.data);

            setUser(updatedUser);
            queryClient.setQueryData(PROFILE_QUERY_KEY, response.data);

            toast.success("Profile updated", {
                description: response.message?.trim() || "Your profile has been saved.",
            });
        },
        onError: (error) => {
            toast.error("Unable to update profile", {
                description: getProfileErrorMessage(error),
            });
        },
    });
}
