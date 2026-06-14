"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
  adminApi,
  type AdminUserRole,
} from "@/shared/services/admin.service";

type UserActionVariables = {
  userId: number;
  label?: string;
};

type UpdateUserRoleVariables = UserActionVariables & {
  role: AdminUserRole;
};

type ForceEndMeetingVariables = {
  meetingId: number;
  label?: string;
};

const getActionErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const apiError = error as Partial<IBackendRes<unknown>>;

  if (typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message;
  }

  if (typeof apiError.error === "string" && apiError.error.trim()) {
    return apiError.error;
  }

  if (typeof apiError.errors === "string" && apiError.errors.trim()) {
    return apiError.errors;
  }

  return "Please try again in a moment.";
};

export function useAdminActions() {
  const queryClient = useQueryClient();

  const invalidateAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "meetings"] }),
    ]);
  };

  const banUser = useMutation({
    mutationFn: async ({ userId }: UserActionVariables) => {
      const response = assertApiSuccess(await adminApi.banUser(userId));
      return response.data;
    },
    onSuccess: async (_user, variables) => {
      toast.success("User banned", {
        description: variables.label
          ? `${variables.label} can no longer access the app.`
          : "The account can no longer access the app.",
      });
      await invalidateAdminData();
    },
    onError: (error) => {
      toast.error("Unable to ban user", {
        description: getActionErrorMessage(error),
      });
    },
  });

  const unbanUser = useMutation({
    mutationFn: async ({ userId }: UserActionVariables) => {
      const response = assertApiSuccess(await adminApi.unbanUser(userId));
      return response.data;
    },
    onSuccess: async (_user, variables) => {
      toast.success("User unbanned", {
        description: variables.label
          ? `${variables.label} can sign in again.`
          : "The account can sign in again.",
      });
      await invalidateAdminData();
    },
    onError: (error) => {
      toast.error("Unable to unban user", {
        description: getActionErrorMessage(error),
      });
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: UpdateUserRoleVariables) => {
      const response = assertApiSuccess(await adminApi.updateUserRole(userId, role));
      return response.data;
    },
    onSuccess: async (_user, variables) => {
      toast.success("User role updated", {
        description: variables.label
          ? `${variables.label} is now ${variables.role === "ADMIN" ? "an admin" : "a user"}.`
          : "The account role has been updated.",
      });
      await invalidateAdminData();
    },
    onError: (error) => {
      toast.error("Unable to update role", {
        description: getActionErrorMessage(error),
      });
    },
  });

  const forceEndMeeting = useMutation({
    mutationFn: async ({ meetingId }: ForceEndMeetingVariables) => {
      assertApiSuccess(await adminApi.forceEndMeeting(meetingId));
    },
    onSuccess: async (_result, variables) => {
      toast.success("Meeting ended", {
        description: variables.label
          ? `${variables.label} has been force-ended.`
          : "The active meeting has been force-ended.",
      });
      await invalidateAdminData();
    },
    onError: (error) => {
      toast.error("Unable to end meeting", {
        description: getActionErrorMessage(error),
      });
    },
  });

  return {
    banUser,
    unbanUser,
    updateUserRole,
    forceEndMeeting,
  };
}
