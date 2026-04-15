import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { getMeetingSocketHttpUrl } from "@/lib/config/api-url";

export type MeetingSocketAction =
    | "JOIN_REQUEST"
    | "ADMITTED"
    | "REJECTED"
    | (string & {});

export type MeetingSocketMessage = {
    meetingCode?: string | null;
    targetParticipantId?: number | null;
    targetName?: string | null;
    action?: MeetingSocketAction | null;
};

type DecodedMeetingToken = {
    participantId?: number | string;
    sub?: number | string;
    role?: string;
    meetingCode?: string;
    exp?: number;
    iat?: number;
};

type ConnectMeetingSocketParams = {
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

type MeetingSocketConnection = {
    disconnect: () => void;
    sendJoinRequest: (message: MeetingSocketMessage) => void;
    sendAccept: (message: MeetingSocketMessage) => void;
    sendReject: (message: MeetingSocketMessage) => void;
    isConnected: () => boolean;
};

function normalizeRole(role?: string | null) {
    const normalizedRole = role?.trim().toUpperCase();
    return normalizedRole || null;
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

        const parsedParticipantId =
            typeof parsedBody.targetParticipantId === "number"
                ? parsedBody.targetParticipantId
                : typeof parsedBody.targetParticipantId === "string"
                    ? Number(parsedBody.targetParticipantId)
                    : null;

        return {
            meetingCode: typeof parsedBody.meetingCode === "string" ? parsedBody.meetingCode : null,
            targetParticipantId:
                typeof parsedParticipantId === "number" && Number.isFinite(parsedParticipantId)
                    ? parsedParticipantId
                    : null,
            targetName: typeof parsedBody.targetName === "string" ? parsedBody.targetName : null,
            action: typeof parsedBody.action === "string" ? parsedBody.action : null,
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
        }),
    });
}

export function decodeMeetingToken(meetingToken?: string | null) {
    const payload = decodeJwtPayload<DecodedMeetingToken>(meetingToken);
    const participantIdValue = payload?.participantId ?? payload?.sub;
    const nextParticipantId =
        typeof participantIdValue === "number"
            ? participantIdValue
            : typeof participantIdValue === "string" && participantIdValue.trim()
                ? Number(participantIdValue)
                : null;

    return {
        participantId: Number.isFinite(nextParticipantId) ? nextParticipantId : null,
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
        isConnected: () => client.connected,
    };
}
