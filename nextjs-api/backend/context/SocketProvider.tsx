"use client";
import {
  createContext,
  useCallback,
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
  GroupChat,
  GroupChatMessage,
  Message,
  MessageRequest,
  MessageRequestStatus,
  OnlineUser,
} from "../types/types";
import { asId, normalizeMessage } from "../utils/ids";
import { serializeGroup, serializeGroupMessage } from "../utils/groups";

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export interface MessageAlert {
  threadKey: string;
  title: string;
  preview: string;
}

export interface TypingUser {
  userId: string;
  username: string;
}

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: OnlineUser[];
  privateMessages: Message[];
  groupMessages: GroupChatMessage[];
  groups: GroupChat[];
  incomingRequests: MessageRequest[];
  requestOutcomes: Record<string, MessageRequestStatus>;
  unreadByThread: Record<string, number>;
  messageAlert: MessageAlert | null;
  typingByThread: Record<string, TypingUser[]>;
  addPrivateMessage: (message: Message) => void;
  addGroupMessage: (message: GroupChatMessage) => void;
  addGroup: (group: GroupChat) => void;
  setActiveThread: (threadKey: string | null) => void;
  dismissAlert: () => void;
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
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([]);
  const [requestOutcomes, setRequestOutcomes] = useState<
    Record<string, MessageRequestStatus>
  >({});
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>(
    {}
  );
  const [messageAlert, setMessageAlert] = useState<MessageAlert | null>(null);
  const [typingByThread, setTypingByThread] = useState<
    Record<string, TypingUser[]>
  >({});
  const socketRef = useRef<Socket | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const knownMessageIds = useRef(new Set<string>());
  const groupsRef = useRef<GroupChat[]>([]);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  groupsRef.current = groups;

  useEffect(() => {
    if (!userId || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
      setIncomingRequests([]);
      setRequestOutcomes({});
      setGroups([]);
      setGroupMessages([]);
      setUnreadByThread({});
      setMessageAlert(null);
      setTypingByThread({});
      knownMessageIds.current = new Set();
      activeThreadRef.current = null;
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
    const rememberId = (id: string) => {
      if (knownMessageIds.current.has(id)) {
        return false;
      }
      knownMessageIds.current.add(id);
      return true;
    };

    const clearTyper = (threadKey: string, typerId: string) => {
      const timerKey = `${threadKey}:${typerId}`;
      if (typingTimers.current[timerKey]) {
        clearTimeout(typingTimers.current[timerKey]);
        delete typingTimers.current[timerKey];
      }
      setTypingByThread((prev) => {
        const current = prev[threadKey] || [];
        const next = current.filter((item) => asId(item.userId) !== typerId);
        if (next.length === current.length) {
          return prev;
        }
        if (next.length === 0) {
          const copy = { ...prev };
          delete copy[threadKey];
          return copy;
        }
        return { ...prev, [threadKey]: next };
      });
    };

    const raiseAlert = (threadKey: string, title: string, preview: string) => {
      if (activeThreadRef.current === threadKey) {
        return;
      }
      setUnreadByThread((prev) => ({
        ...prev,
        [threadKey]: (prev[threadKey] || 0) + 1,
      }));
      setMessageAlert({ threadKey, title, preview });
    };

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
          const id = asId(normalized._id);
          knownMessageIds.current.add(id);
          byId.set(id, normalized);
        }
        return Array.from(byId.values()) as Message[];
      });
    });

    newSocket.on("receivePrivateMessage", (message: Message) => {
      const incoming = normalizeMessage(message);
      const incomingId = asId(incoming._id);
      if (!rememberId(incomingId)) {
        return;
      }
      setPrivateMessages((prev) => [...prev, incoming as Message]);
      if (asId(incoming.sender) !== asId(userId)) {
        clearTyper(`direct:${asId(incoming.sender)}`, asId(incoming.sender));
        raiseAlert(
          `direct:${asId(incoming.sender)}`,
          "New message",
          String(incoming.content || "")
        );
      }
    });
    newSocket.on("receiveGroupMessage", (message: GroupChatMessage) => {
      const incoming = serializeGroupMessage(message);
      const incomingId = asId(incoming._id);
      if (!rememberId(incomingId)) {
        return;
      }
      setGroupMessages((prev) => [...prev, incoming]);
      if (asId(incoming.senderId) !== asId(userId)) {
        const group = groupsRef.current.find(
          (item) => asId(item._id) === asId(incoming.groupId)
        );
        clearTyper(`group:${asId(incoming.groupId)}`, asId(incoming.senderId));
        raiseAlert(
          `group:${asId(incoming.groupId)}`,
          group?.groupName || "Group",
          `${incoming.senderUsername}: ${incoming.text}`
        );
      }
    });
    newSocket.on("groupConversationHistory", (messages: GroupChatMessage[]) => {
      if (!Array.isArray(messages)) {
        return;
      }
      setGroupMessages((prev) => {
        const byId = new Map(
          prev.map((item) => [asId(item._id), serializeGroupMessage(item)])
        );
        for (const item of messages) {
          const normalized = serializeGroupMessage(item);
          const id = asId(normalized._id);
          knownMessageIds.current.add(id);
          byId.set(id, normalized);
        }
        return Array.from(byId.values());
      });
    });
    newSocket.on("groupCreated", (group: GroupChat) => {
      if (!group?._id) {
        return;
      }
      const incoming = serializeGroup(group);
      setGroups((prev) => {
        const incomingId = asId(incoming._id);
        if (prev.some((item) => asId(item._id) === incomingId)) {
          return prev;
        }
        return [incoming, ...prev];
      });
    });
    newSocket.on(
      "userTyping",
      ({
        userId: typerId,
        username,
        isTyping,
        threadKey,
      }: {
        userId: string;
        username?: string;
        isTyping: boolean;
        threadKey?: string;
      }) => {
        const id = asId(typerId);
        const rawKey = threadKey || "";
        const key = rawKey.startsWith("direct:")
          ? `direct:${id}`
          : rawKey;
        if (!key || !id || id === asId(userId)) {
          return;
        }
        if (!isTyping) {
          clearTyper(key, id);
          return;
        }
        setTypingByThread((prev) => {
          const current = prev[key] || [];
          if (current.some((item) => asId(item.userId) === id)) {
            return prev;
          }
          return {
            ...prev,
            [key]: [...current, { userId: id, username: username || "Someone" }],
          };
        });
        const timerKey = `${key}:${id}`;
        if (typingTimers.current[timerKey]) {
          clearTimeout(typingTimers.current[timerKey]);
        }
        typingTimers.current[timerKey] = setTimeout(() => {
          clearTyper(key, id);
        }, 3000);
      }
    );
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

    axios
      .get("/api/messages/group/fetch-all-messages", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const list = Array.isArray(res.data.groups) ? res.data.groups : [];
        setGroups(list.map((group: GroupChat) => serializeGroup(group)));
      })
      .catch(() => {
        // Groups load again on the next visit.
      });
  }, [token]);

  const addGroupMessage = (message: GroupChatMessage) => {
    const incoming = serializeGroupMessage(message);
    const incomingId = asId(incoming._id);
    if (!knownMessageIds.current.has(incomingId)) {
      knownMessageIds.current.add(incomingId);
    }
    setGroupMessages((prev) => {
      if (prev.some((item) => asId(item._id) === incomingId)) {
        return prev;
      }
      return [...prev, incoming];
    });
  };

  const addGroup = (group: GroupChat) => {
    const incoming = serializeGroup(group);
    setGroups((prev) => {
      const incomingId = asId(incoming._id);
      if (prev.some((item) => asId(item._id) === incomingId)) {
        return prev;
      }
      return [incoming, ...prev];
    });
  };

  const addPrivateMessage = (message: Message) => {
    const incoming = normalizeMessage(message);
    const incomingId = asId(incoming._id);
    if (!knownMessageIds.current.has(incomingId)) {
      knownMessageIds.current.add(incomingId);
    }
    setPrivateMessages((prev) => {
      if (prev.some((item) => asId(item._id) === incomingId)) {
        return prev;
      }
      return [...prev, incoming as Message];
    });
  };

  const setActiveThread = useCallback((threadKey: string | null) => {
    activeThreadRef.current = threadKey;
    if (!threadKey) {
      return;
    }
    setUnreadByThread((prev) => {
      if (!prev[threadKey]) {
        return prev;
      }
      const next = { ...prev };
      delete next[threadKey];
      return next;
    });
    setMessageAlert((current) =>
      current?.threadKey === threadKey ? null : current
    );
  }, []);

  const dismissAlert = useCallback(() => {
    setMessageAlert(null);
  }, []);

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
      groups,
      incomingRequests,
      requestOutcomes,
      unreadByThread,
      messageAlert,
      typingByThread,
      addPrivateMessage,
      addGroupMessage,
      addGroup,
      setActiveThread,
      dismissAlert,
      setRequestOutcome,
      removeIncomingRequest,
    }),
    [
      socket,
      connected,
      onlineUsers,
      privateMessages,
      groupMessages,
      groups,
      incomingRequests,
      requestOutcomes,
      unreadByThread,
      messageAlert,
      typingByThread,
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
