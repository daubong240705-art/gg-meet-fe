"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  connectMeetingSocket,
  type ConnectMeetingSocketParams,
  type MeetingSocketConnection,
  type MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";

type MeetingSocketContextValue = {
  isConnected: boolean;
  error: Error | null;
  connect: (params: ConnectMeetingSocketParams) => MeetingSocketConnection;
  disconnect: (connection?: MeetingSocketConnection | null) => void;
  isSocketConnected: () => boolean;
  sendJoinRequest: (message: MeetingSocketMessage) => void;
  sendAccept: (message: MeetingSocketMessage) => void;
  sendReject: (message: MeetingSocketMessage) => void;
  sendCancel: (message: MeetingSocketMessage) => void;
};

const MeetingSocketContext = createContext<MeetingSocketContextValue | null>(null);

function getActiveConnection(
  connection: MeetingSocketConnection | null,
): MeetingSocketConnection {
  if (!connection) {
    throw new Error("Meeting socket is not connected.");
  }

  return connection;
}

export function MeetingSocketProvider({ children }: { children: ReactNode }) {
  const connectionRef = useRef<MeetingSocketConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnect = useCallback((connection?: MeetingSocketConnection | null) => {
    const activeConnection = connectionRef.current;
    const shouldDisconnect = !connection || activeConnection === connection;

    if (!shouldDisconnect) {
      return;
    }

    activeConnection?.disconnect();
    connectionRef.current = null;
    setIsConnected(false);
  }, []);

  const connect = useCallback((params: ConnectMeetingSocketParams) => {
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setIsConnected(false);
    setError(null);

    const nextConnection = connectMeetingSocket({
      ...params,
      onConnect: () => {
        if (connectionRef.current === nextConnection) {
          setIsConnected(true);
          setError(null);
        }

        params.onConnect?.();
      },
      onDisconnect: () => {
        if (connectionRef.current === nextConnection) {
          setIsConnected(false);
        }

        params.onDisconnect?.();
      },
      onError: (nextError) => {
        if (connectionRef.current === nextConnection) {
          setError(nextError);
          setIsConnected(false);
        }

        params.onError?.(nextError);
      },
    });
    connectionRef.current = nextConnection;

    return nextConnection;
  }, []);

  const isSocketConnected = useCallback(() => {
    return Boolean(connectionRef.current?.isConnected());
  }, []);

  const sendJoinRequest = useCallback((message: MeetingSocketMessage) => {
    getActiveConnection(connectionRef.current).sendJoinRequest(message);
  }, []);

  const sendAccept = useCallback((message: MeetingSocketMessage) => {
    getActiveConnection(connectionRef.current).sendAccept(message);
  }, []);

  const sendReject = useCallback((message: MeetingSocketMessage) => {
    getActiveConnection(connectionRef.current).sendReject(message);
  }, []);

  const sendCancel = useCallback((message: MeetingSocketMessage) => {
    getActiveConnection(connectionRef.current).sendCancel(message);
  }, []);

  useEffect(() => {
    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, []);

  const value = useMemo<MeetingSocketContextValue>(() => ({
    isConnected,
    error,
    connect,
    disconnect,
    isSocketConnected,
    sendJoinRequest,
    sendAccept,
    sendReject,
    sendCancel,
  }), [
    connect,
    disconnect,
    error,
    isConnected,
    isSocketConnected,
    sendAccept,
    sendCancel,
    sendJoinRequest,
    sendReject,
  ]);

  return (
    <MeetingSocketContext.Provider value={value}>
      {children}
    </MeetingSocketContext.Provider>
  );
}

export function useMeetingSocket() {
  const context = useContext(MeetingSocketContext);

  if (!context) {
    throw new Error("useMeetingSocket must be used inside MeetingSocketProvider.");
  }

  return context;
}

export type { MeetingSocketMessage };
