"use client";

import { useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type Path, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuthSession } from "@/lib/auth/auth-session";
import { zodResolver } from "@/lib/form/zod-resolver";
import {
    buildScheduleMeetingPayload,
    DEFAULT_SCHEDULE_MEETING_FORM_VALUES,
    mergeParticipantEmails,
    scheduleMeetingSchema,
    type ScheduleMeetingFormValues,
} from "@/lib/meeting/schedule";
import {
    getMeetingApiFieldErrors,
    getMeetingApiErrorDescription,
    meetingApi,
    type ScheduleMeetingResponseData,
} from "@/service/meeting.service";

import { assertApiSuccess } from "../shared/mutation.utils";

const SCHEDULE_FIELD_NAME_MAP = {
    title: "title",
    meetingDate: "date",
    date: "date",
    meetingTime: "time",
    time: "time",
    description: "description",
    emailList: "emailList",
    participantEmail: "participantEmail",
    participants: "participantEmail",
} as const satisfies Record<string, keyof ScheduleMeetingFormValues>;

const resolveScheduleFieldName = (fieldName: string) => {
    const normalizedFieldName = fieldName.trim();

    if (!normalizedFieldName) {
        return null;
    }

    const rootFieldName = normalizedFieldName
        .replace(/\[\d+\]/g, "")
        .split(".")[0];

    if (!(rootFieldName in SCHEDULE_FIELD_NAME_MAP)) {
        return null;
    }

    return SCHEDULE_FIELD_NAME_MAP[rootFieldName as keyof typeof SCHEDULE_FIELD_NAME_MAP];
};

const setRootError = (
    setError: ReturnType<typeof useForm<ScheduleMeetingFormValues>>["setError"],
    message: string,
) => {
    setError("root" as Path<ScheduleMeetingFormValues>, {
        type: "server",
        message,
    });
};

const handleScheduleApiError = (
    error: IBackendRes<unknown>,
    setError: ReturnType<typeof useForm<ScheduleMeetingFormValues>>["setError"],
) => {
    const serverFieldErrors = getMeetingApiFieldErrors(error);
    let hasMappedFieldError = false;

    serverFieldErrors.forEach(({ field, message }) => {
        const mappedFieldName = resolveScheduleFieldName(field);

        if (!mappedFieldName) {
            return;
        }

        setError(mappedFieldName as Path<ScheduleMeetingFormValues>, {
            type: "server",
            message,
        });
        hasMappedFieldError = true;
    });

    if (hasMappedFieldError) {
        toast.error("Please review your input", {
            description: "Some fields need attention before scheduling the meeting.",
        });
        return;
    }

    const errorDescription =
        getMeetingApiErrorDescription(error) || "Please try again in a moment.";

    setRootError(setError, errorDescription);
    toast.error("Unable to schedule meeting", {
        description: errorDescription,
    });
};

export function useScheduleMeetingForm() {
    const router = useRouter();
    const { user } = useAuthSession();
    const hostEmail = user?.email?.trim() || "";
    const form = useForm<ScheduleMeetingFormValues>({
        resolver: zodResolver(scheduleMeetingSchema),
        defaultValues: DEFAULT_SCHEDULE_MEETING_FORM_VALUES,
        mode: "onChange",
    });

    const getMergedEmailList = useCallback(
        (emailList: string[], participantEmail?: string) =>
            mergeParticipantEmails(hostEmail ? [hostEmail, ...emailList] : emailList, participantEmail),
        [hostEmail],
    );

    useEffect(() => {
        if (!hostEmail) {
            return;
        }

        const currentEmailList = form.getValues("emailList");
        const nextEmailList = getMergedEmailList(currentEmailList);

        if (
            nextEmailList.length === currentEmailList.length
            && currentEmailList.some((email) => email.toLowerCase() === hostEmail.toLowerCase())
        ) {
            return;
        }

        form.setValue("emailList", nextEmailList);
    }, [form, getMergedEmailList, hostEmail]);

    const scheduleMeetingMutation = useMutation<
        IBackendRes<ScheduleMeetingResponseData>,
        IBackendRes<unknown>,
        ScheduleMeetingFormValues
    >({
        mutationFn: async (values) => {
            const response = await meetingApi.scheduleMeeting(buildScheduleMeetingPayload(values));
            return assertApiSuccess(response);
        },
        onSuccess: (response) => {
            toast.success("Meeting scheduled", {
                description: response.message?.trim() || "Your meeting has been scheduled successfully.",
            });

            form.reset({
                ...DEFAULT_SCHEDULE_MEETING_FORM_VALUES,
                emailList: hostEmail ? [hostEmail] : [],
            });
            router.replace("/");
            router.refresh();
        },
        onError: (error) => {
            handleScheduleApiError(error, form.setError);
        },
    });

    const handleAddParticipant = async () => {
        form.clearErrors("root");

        const participantEmail = form.getValues("participantEmail").trim();

        if (!participantEmail) {
            return;
        }

        const isParticipantEmailValid = await form.trigger("participantEmail");

        if (!isParticipantEmailValid) {
            return;
        }

        const currentEmailList = form.getValues("emailList");
        const nextEmailList = getMergedEmailList(currentEmailList, participantEmail);

        if (nextEmailList.length === currentEmailList.length) {
            form.setError("participantEmail", {
                type: "manual",
                message: "This participant email is already added.",
            });
            return;
        }

        form.clearErrors(["participantEmail", "emailList"]);
        form.setValue("emailList", nextEmailList, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
        form.setValue("participantEmail", "", {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
    };

    const removeParticipant = (email: string) => {
        if (hostEmail && email.toLowerCase() === hostEmail.toLowerCase()) {
            return;
        }

        const nextEmailList = form
            .getValues("emailList")
            .filter((existingEmail) => existingEmail.toLowerCase() !== email.toLowerCase());

        form.clearErrors("emailList");
        form.setValue("emailList", getMergedEmailList(nextEmailList), {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });
    };

    const onSubmit = form.handleSubmit((values) => {
        form.clearErrors("root");

        const nextEmailList = getMergedEmailList(values.emailList, values.participantEmail);
        const nextValues: ScheduleMeetingFormValues = {
            ...values,
            participantEmail: "",
            emailList: nextEmailList,
        };

        if (values.participantEmail.trim()) {
            form.setValue("emailList", nextEmailList, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
            });
            form.setValue("participantEmail", "", {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
            });
        }

        scheduleMeetingMutation.mutate(nextValues);
    });

    return {
        form,
        onSubmit,
        scheduleMeetingMutation,
        hostEmail,
        handleAddParticipant,
        removeParticipant,
    };
}
