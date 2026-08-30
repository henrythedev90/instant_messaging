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
import axios from "axios";
import {
  GroupChatMessage,
  Message,
  MessageRequest,
  MessageRequestStatus,
  OnlineUser,
} from "../types/types";
import { asId, normalizeMessage } from "../utils/ids";

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: OnlineUser[];
  privateMessages: Message[];
  groupMessages: GroupChatMessage[];
  incomingRequests: MessageRequest[];
  requestOutcomes: Record<string, MessageRequestStatus>;
  addPrivateMessage: (message: Message) => void;
  setRequestOutcome: (userId: string, status: MessageRequestStatus) => void;
  removeIncomingRequest: (requestId: string) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { userId, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([]);
  const [requestOutcomes, setRequestOutcomes] = useState<
    Record<string, MessageRequestStatus>
  >({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
      setIncomingRequests([]);
      setRequestOutcomes({});
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
    newSocket.on("conversationHistory", (messages: Message[]) => {
      if (!Array.isArray(messages)) {
        return;
      }
      setPrivateMessages((prev) => {
        const byId = new Map(
          prev.map((item) => [asId(item._id), normalizeMessage(item)])
        );
        for (const item of messages) {
          const normalized = normalizeMessage(item);
          byId.set(asId(normalized._id), normalized);
        }
        return Array.from(byId.values()) as Message[];
      });
    });

    newSocket.on("receivePrivateMessage", (message: Message) => {
      const incoming = normalizeMessage(message);
      setPrivateMessages((prev) => {
        const incomingId = asId(incoming._id);
        if (prev.some((item) => asId(item._id) === incomingId)) {
          return prev;
        }
        return [...prev, incoming as Message];
      });
    });
    newSocket.on("receiveGroupMessage", (message: GroupChatMessage) => {
      setGroupMessages((prev) => [...prev, message]);
    });
    newSocket.on("groupConversationHistory", (messages: GroupChatMessage[]) => {
      setGroupMessages(messages);
    });
    newSocket.on("strangerMessageRequest", (request: MessageRequest) => {
      if (!request?._id) {
        return;
      }
      setIncomingRequests((prev) => {
        const incomingId = asId(request._id);
        const without = prev.filter((item) => asId(item._id) !== incomingId);
        return [...without, request];
      });
    });
    newSocket.on(
      "messageRequestResolved",
      ({
        status,
        request,
      }: {
        status: MessageRequestStatus;
        request: MessageRequest;
      }) => {
        if (!request) {
          return;
        }
        setIncomingRequests((prev) =>
          prev.filter((item) => asId(item._id) !== asId(request._id))
        );
        const otherId =
          asId(request.fromUserId) === asId(userId)
            ? asId(request.toUserId)
            : asId(request.fromUserId);
        if (otherId) {
          setRequestOutcomes((prev) => ({ ...prev, [otherId]: status }));
        }
      }
    );

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

  useEffect(() => {
    if (!token) {
      return;
    }

    axios
      .get("/api/contacts/message-requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setIncomingRequests(res.data.incoming || []);
        const outcomes: Record<string, MessageRequestStatus> = {};
        for (const item of res.data.outgoing || []) {
          outcomes[asId(item.toUserId)] = item.status;
        }
        setRequestOutcomes(outcomes);
      })
      .catch(() => {
        // Requests load again when the socket reconnects.
      });
  }, [token]);

  const addPrivateMessage = (message: Message) => {
    const incoming = normalizeMessage(message);
    setPrivateMessages((prev) => {
      const incomingId = asId(incoming._id);
      if (prev.some((item) => asId(item._id) === incomingId)) {
        return prev;
      }
      return [...prev, incoming as Message];
    });
  };

  const setRequestOutcome = (otherUserId: string, status: MessageRequestStatus) => {
    setRequestOutcomes((prev) => ({ ...prev, [asId(otherUserId)]: status }));
  };

  const removeIncomingRequest = (requestId: string) => {
    setIncomingRequests((prev) =>
      prev.filter((item) => asId(item._id) !== asId(requestId))
    );
  };

  const value = useMemo(
    () => ({
      socket,
      connected,
      onlineUsers,
      privateMessages,
      groupMessages,
      incomingRequests,
      requestOutcomes,
      addPrivateMessage,
      setRequestOutcome,
      removeIncomingRequest,
    }),
    [
      socket,
      connected,
      onlineUsers,
      privateMessages,
      groupMessages,
      incomingRequests,
      requestOutcomes,
    ]
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
