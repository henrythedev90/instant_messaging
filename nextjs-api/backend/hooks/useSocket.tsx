import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { Message, GroupChatMessage } from "../types/types";

const SOCKET_SERVER_URL = "http://localhost:3001";

// Define the OnlineUser type if it's not already defined in your types
interface OnlineUser {
  userId: string;
  status: "online" | "offline" | "away";
}

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const { userId, token } = useAuth();

  useEffect(() => {
    // Only create the socket connection if userId and token are present
    if (!userId || !token) {
      console.log("Missing userId or token, not connecting to socket");
      return;
    }

    // Check if we already have an active connection
    if (socket?.connected) {
      console.log("Reusing existing socket connection");
      setConnected(true);
      return;
    }

    console.log("Creating new socket connection with userId:", userId);

    // Create a socket connection WITH the auth token in the handshake
    const newSocketInstance = io(SOCKET_SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000, // Increase timeout to 10 seconds
      transports: ["websocket", "polling"],
      auth: {
        token: token,
      },
    });

    setSocket(newSocketInstance);

    // Handle errors
    newSocketInstance.on("error", (error) => {
      console.log("Socket Error:", error);
    });

    const handleOnlineUsers = (users: OnlineUser[]) => {
      console.log("Received online users:", users);
      if (!users || !Array.isArray(users)) {
        console.error("Received invalid online users data:", users);
        return;
      }
      // Handle both array of strings and array of objects
      const formattedUsers = users
        .map((user) => {
          console.log("Processing user:", user);

          if (typeof user === "string") {
            return { userId: user, status: "online" };
          }

          if (typeof user === "object" && user !== null) {
            return {
              userId: user.userId || user.userId || user.userId || "",
              status:
                user.status === "online" ||
                user.status === "offline" ||
                user.status === "away"
                  ? user.status
                  : "online",
            };
          }

          return null;
        })
        .filter(Boolean);

      console.log("Formatted online users:", formattedUsers);
      setOnlineUsers(
        formattedUsers.filter((user): user is OnlineUser => user !== null)
      );
    };

    const handleGroupHistory = (messages: GroupChatMessage[]) =>
      setGroupMessages(messages);

    const handleUserStatusChange = ({
      userId,
      status,
    }: {
      userId: string;
      status: string;
    }) => {
      setOnlineUsers((prev) =>
        status === "online" && !prev.some((user) => user.userId === userId)
          ? [
              ...prev,
              { userId, status: status as "online" | "offline" | "away" },
            ]
          : prev.filter((user) => user.userId !== userId)
      );
    };

    const handlePrivateMessage = (message: Message) =>
      setPrivateMessages((prevMessages) => [...prevMessages, message]);

    const handleGroupMessage = (groupMessage: GroupChatMessage) =>
      setGroupMessages((prevMessages) => [...prevMessages, groupMessage]);

    newSocketInstance.on("connect", () => {
      console.log("Connected to socket server in useSocket");
      setConnected(true);

      // Send the userId after successful connection
      // (token is already sent in auth handshake)
      newSocketInstance.emit("userConnected", { userId });
    });

    newSocketInstance.on("onlineUsers", handleOnlineUsers);
    newSocketInstance.on("groupConversationHistory", handleGroupHistory);
    newSocketInstance.on("userStatusChanged", handleUserStatusChange);
    newSocketInstance.on("receivePrivateMessage", handlePrivateMessage);
    newSocketInstance.on("receiveGroupMessage", handleGroupMessage);

    newSocketInstance.on("disconnect", () => {
      console.log("Disconnected from socket server");
      setConnected(false);
    });

    newSocketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setConnected(false);
    });

    // Cleanup on component unmount or when userId/token changes
    return () => {
      newSocketInstance.off("onlineUsers", handleOnlineUsers);
      newSocketInstance.off("groupConversationHistory", handleGroupHistory);
      newSocketInstance.off("userStatusChanged", handleUserStatusChange);
      newSocketInstance.off("receivePrivateMessage", handlePrivateMessage);
      newSocketInstance.off("receiveGroupMessage", handleGroupMessage);
      newSocketInstance.disconnect();
      setSocket(null);
      setConnected(false);
      if (
        window.navigator.userAgent.includes("ReactNative") ||
        document.visibilityState === "hidden"
      ) {
        console.log("App closing - disconnecting socket");
        newSocketInstance?.disconnect();
      }
    };
  }, [userId, token]); // Re-run when userId or token changes

  // Debug information
  useEffect(() => {
    console.log("useSocket state:", {
      connected,
      socketExists: !!socket,
      onlineUsersCount: onlineUsers.length,
      authState: { userId, token: token ? "exists" : "missing" },
    });
  }, [connected, socket, onlineUsers, userId, token]);

  return { socket, privateMessages, groupMessages, onlineUsers, connected };
};
