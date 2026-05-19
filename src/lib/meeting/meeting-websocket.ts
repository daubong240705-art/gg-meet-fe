import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { getMeetingSocketHttpUrl } from "@/lib/config/api-url";

export type MeetingSocketAction =
    | "JOIN_REQUEST"
    | "ADMITTED"
    | "REJECTED"
    | "CANCEL_SUCCESS"
    | "ROOM_SETTINGS_CHANGED"
    | "SCREEN_SHARE_REQUESTED"
    | "SCREEN_SHARE_APPROVED"
    | "SCREEN_SHARE_REJECTED"
    | "SCREEN_SHARE_STOPPED"
    | (string & {});

export type MeetingSocketMessage = {
    meetingCode?: string | null;
    targetParticipantId?: number | null;
    targetName?: string | null;
    requesterId?: number | null;
    requesterName?: string | null;
    action?: MeetingSocketAction | null;
    isBan?: boolean | null;
    allowParticipantUnmute?: boolean | null;
    allowParticipantShareScreen?: boolean | null;
};

type DecodedMeetingToken = {
    participantId?: number | string;
    participantID?: number | string;
    participant_id?: number | string;
    meetingParticipantId?: number | string;
    meetingParticipantID?: number | string;
    meeting_participant_id?: number | string;
    sub?: number | string;
    role?: string;
    meetingCode?: string;
    exp?: number;
    iat?: number;
};

export type ConnectMeetingSocketParams = {
    meetingCode: string;
    meetingToken: string;
    subscribeToMeetingTopic?: boolean;
    subscribeToWaitingTopic?: boolean;
    subscribeToParticipantTopic?: boolean;
    onMeetingMessage?: (message: MeetingSocketMessage) => void;
    onWaitingMessage?: (message: MeetingSocketMessage) => void;
    onParticipantMessage?: (message: MeetingSocketMessage) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
};

export type MeetingSocketConnection = {
    disconnect: () => void;
    sendJoinRequest: (message: MeetingSocketMessage) => void;
    sendAccept: (message: MeetingSocketMessage) => void;
    sendReject: (message: MeetingSocketMessage) => void;
    sendCancel: (message: MeetingSocketMessage) => void;
    sendKickout: (message: MeetingSocketMessage) => void;
    isConnected: () => boolean;
};

function normalizeRole(role?: string | null) {
    const normalizedRole = role?.trim().toUpperCase();
    return normalizedRole || null;
}

function parseFiniteNumber(value: unknown) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string" && value.trim()) {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
}

function getFirstNumericField(
    data: Record<string, unknown>,
    fieldNames: string[],
) {
    for (const fieldName of fieldNames) {
        if (fieldName in data) {
            const parsedValue = parseFiniteNumber(data[fieldName]);

            if (parsedValue !== null) {
                return parsedValue;
            }
        }
    }

    return null;
}

function decodeJwtPayload<T extends Record<string, unknown>>(token?: string | null): T | null {
    if (!token) {
        return null;
    }

    const tokenParts = token.split(".");

    if (tokenParts.length < 2) {
        return null;
    }

    try {
        const payload = tokenParts[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, "=");
        const decodedPayload =
            typeof atob === "function"
                ? atob(payload)
                : Buffer.from(payload, "base64").toString("utf-8");

        return JSON.parse(decodedPayload) as T;
    } catch {
        return null;
    }
}

function parseMeetingSocketMessage(frame: IMessage): MeetingSocketMessage | null {
    try {
        const parsedBody = JSON.parse(frame.body) as MeetingSocketMessage;

        if (typeof parsedBody !== "object" || parsedBody === null) {
            return null;
        }

        const parsedRecord = parsedBody as Record<string, unknown>;
        const parsedParticipantId = getFirstNumericField(
            parsedRecord,
            [
                "targetParticipantId",
                "target_participant_id",
                "participantId",
                "participantID",
                "participant_id",
                "meetingParticipantId",
                "meetingParticipantID",
                "meeting_participant_id",
            ],
        );

        const requesterId = getFirstNumericField(
            parsedRecord,
            [
                "requesterId",
                "requesterID",
                "requester_id",
                "requesterParticipantId",
                "requesterParticipantID",
                "requester_participant_id",
                "screenShareRequesterId",
                "screenShareRequesterID",
                "screen_share_requester_id",
            ],
        );

        return {
            meetingCode: typeof parsedBody.meetingCode === "string" ? parsedBody.meetingCode : null,
            targetParticipantId: parsedParticipantId !== null ? parsedParticipantId : null,
            targetName: typeof parsedBody.targetName === "string" ? parsedBody.targetName : null,
            requesterId: requesterId !== null ? requesterId : null,
            requesterName:
                typeof parsedBody.requesterName === "string"
                    ? parsedBody.requesterName
                    : typeof parsedRecord.requester_name === "string"
                        ? parsedRecord.requester_name
                        : null,
            action: typeof parsedBody.action === "string" ? parsedBody.action : null,
            isBan: typeof parsedBody.isBan === "boolean" ? parsedBody.isBan : null,
            allowParticipantUnmute:
                typeof parsedBody.allowParticipantUnmute === "boolean" ? parsedBody.allowParticipantUnmute : null,
            allowParticipantShareScreen:
                typeof parsedBody.allowParticipantShareScreen === "boolean" ? parsedBody.allowParticipantShareScreen : null,
        };
    } catch {
        return null;
    }
}

function publishMeetingAction(
    client: Client,
    destination: string,
    message: MeetingSocketMessage,
) {
    if (!client.connected) {
        throw new Error("Meeting socket is not connected.");
    }

    client.publish({
        destination,
        body: JSON.stringify({
            meetingCode: message.meetingCode ?? null,
            targetParticipantId: message.targetParticipantId ?? null,
            targetName: message.targetName ?? null,
            action: message.action ?? null,
            isBan: message.isBan ?? null,
        }),
    });
}

export function decodeMeetingToken(meetingToken?: string | null) {
    const payload = decodeJwtPayload<DecodedMeetingToken>(meetingToken);
    const nextParticipantId = payload
        ? getFirstNumericField(payload, [
            "participantId",
            "participantID",
            "participant_id",
            "meetingParticipantId",
            "meetingParticipantID",
            "meeting_participant_id",
            "sub",
        ])
        : null;

    return {
        participantId: nextParticipantId,
        role: normalizeRole(payload?.role),
        meetingCode: payload?.meetingCode?.trim() || null,
        payload,
    };
}

export function connectMeetingSocket({
    meetingCode,
    meetingToken,
    subscribeToMeetingTopic = false,
    subscribeToWaitingTopic = false,
    subscribeToParticipantTopic = false,
    onMeetingMessage,
    onWaitingMessage,
    onParticipantMessage,
    onConnect,
    onDisconnect,
    onError,
}: ConnectMeetingSocketParams): MeetingSocketConnection {
    const meetingSocketUrl = getMeetingSocketHttpUrl();
    const decodedMeetingToken = decodeMeetingToken(meetingToken);
    const participantId = decodedMeetingToken.participantId;
    const subscriptions: StompSubscription[] = [];
    let isClosed = false;

    const client = new Client({
        webSocketFactory: () => new SockJS(meetingSocketUrl),
        connectHeaders: {
            "Meeting-Token": meetingToken,
        },
        reconnectDelay: 3000,
        debug: () => undefined,
        onConnect: () => {
            if (subscribeToMeetingTopic) {
                subscriptions.push(
                    client.subscribe(`/topic/meeting/${meetingCode}`, (frame) => {
                        const message = parseMeetingSocketMessage(frame);

                        if (message) {
                            onMeetingMessage?.(message);
                        }
                    }),
                );
            }

            if (subscribeToWaitingTopic) {
                subscriptions.push(
                    client.subscribe(`/topic/meeting/${meetingCode}/waiting`, (frame) => {
                        const message = parseMeetingSocketMessage(frame);

                        if (message) {
                            onWaitingMessage?.(message);
                        }
                    }),
                );
            }

            if (subscribeToParticipantTopic && participantId !== null) {
                subscriptions.push(
                    client.subscribe(
                        `/topic/meeting/${meetingCode}/participant/${participantId}`,
                        (frame) => {
                            const message = parseMeetingSocketMessage(frame);

                            if (message) {
                                onParticipantMessage?.(message);
                            }
                        },
                    ),
                );
            }

            onConnect?.();
        },
        onStompError: (frame) => {
            const errorMessage =
                frame.headers.message
                || frame.body
                || "Meeting socket reported an error.";

            onError?.(new Error(errorMessage));
        },
        onWebSocketError: () => {
            onError?.(new Error("Unable to connect to the meeting socket."));
        },
        onWebSocketClose: () => {
            subscriptions.splice(0).forEach((subscription) => {
                subscription.unsubscribe();
            });

            if (!isClosed) {
                onDisconnect?.();
            }
        },
    });

    client.activate();

    return {
        disconnect: () => {
            isClosed = true;
            subscriptions.splice(0).forEach((subscription) => {
                subscription.unsubscribe();
            });
            void client.deactivate();
        },
        sendJoinRequest: (message) => {
            publishMeetingAction(client, "/api/meeting/join", message);
        },
        sendAccept: (message) => {
            publishMeetingAction(client, "/api/meeting/accept", message);
        },
        sendReject: (message) => {
            publishMeetingAction(client, "/api/meeting/reject", message);
        },
        sendCancel: (message) => {
            publishMeetingAction(client, "/api/meeting/cancel-join", message);
        },
        sendKickout: (message) => {
            publishMeetingAction(client, "/api/meeting/kickout", message);
        },
        isConnected: () => client.connected,
    };
}
