"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../hooks/AuthContext";
import { GroupChatMessage, Message, OnlineUser } from "../types/types";

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: OnlineUser[];
  privateMessages: Message[];
  groupMessages: GroupChatMessage[];
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { userId, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
      return;
    }

    const newSocket = io(SOCKET_SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token,
      },
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleOnlineUsers = (users: OnlineUser[] | string[]) => {
      if (!Array.isArray(users)) {
        return;
      }

      const formattedUsers = users
        .map((user) => {
          if (typeof user === "string") {
            return { userId: user, status: "online" };
          }
          if (user && typeof user === "object" && user.userId) {
            return {
              userId: String(user.userId),
              status: user.status || "online",
            };
          }
          return null;
        })
        .filter((user): user is OnlineUser => user !== null);

      setOnlineUsers(formattedUsers);
    };

    const handleUserStatusChange = ({
      userId: changedUserId,
      status,
    }: {
      userId: string;
      status: string;
    }) => {
      const normalizedId = String(changedUserId);
      setOnlineUsers((prev) => {
        const withoutUser = prev.filter(
          (user) => String(user.userId) !== normalizedId
        );
        if (status === "offline") {
          return withoutUser;
        }
        return [...withoutUser, { userId: normalizedId, status }];
      });
    };

    newSocket.on("connect", () => {
      setConnected(true);
      newSocket.emit("authenticate", token);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setConnected(false);
    });

    newSocket.on("onlineUsers", handleOnlineUsers);
    newSocket.on("userStatusChanged", handleUserStatusChange);
    newSocket.on("receivePrivateMessage", (message: Message) => {
      setPrivateMessages((prev) => [...prev, message]);
    });
    newSocket.on("receiveGroupMessage", (message: GroupChatMessage) => {
      setGroupMessages((prev) => [...prev, message]);
    });
    newSocket.on("groupConversationHistory", (messages: GroupChatMessage[]) => {
      setGroupMessages(messages);
    });

    return () => {
      newSocket.removeAllListeners();
      newSocket.disconnect();
      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
    };
  }, [userId, token]);

  const value = useMemo(
    () => ({
      socket,
      connected,
      onlineUsers,
      privateMessages,
      groupMessages,
    }),
    [socket, connected, onlineUsers, privateMessages, groupMessages]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
