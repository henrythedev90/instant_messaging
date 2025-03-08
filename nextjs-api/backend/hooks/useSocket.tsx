import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { Message, GroupChatMessage, OnlineUsers } from "../types/types";

const SOCKET_SERVER_URL = "http://localhost:3001";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const { userId, token } = useAuth();

  useEffect(() => {
    if (!userId || !token) return;

    const socketInstance = io(SOCKET_SERVER_URL, {
      reconnection: true,
      transports: ["websocket"],
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("Connected to socket server");
      setConnected(true);
      socketInstance.emit("userAuthenticated", userId);
    });

    socketInstance.on("onlineUsers", (users: OnlineUsers[]) => {
      setOnlineUsers(users);
    });

    socketInstance.on("groupConversationHistory", (messages) => {
      setGroupMessages(messages);
    });

    socketInstance.on("userStatusChanged", ({ userId, status }) => {
      setOnlineUsers((prev) =>
        status === "online" && !prev.includes(userId)
          ? [...prev, userId]
          : prev.filter((id) => id !== userId)
      );
    });

    socketInstance.on("receivePrivateMessage", (message: Message) => {
      setPrivateMessages((prevMessages) => [...prevMessages, message]);
    });

    socketInstance.on(
      "receiveGroupMessage",
      (groupMessage: GroupChatMessage) => {
        setGroupMessages((prevMessages) => [...prevMessages, groupMessage]);
      }
    );
    socketInstance.on("disconnect", () => {
      console.log("Disconnected from socket server");
      setConnected(false);
    });

    return () => {
      socketInstance.off("receivePrivateMessage");
      socketInstance.off("receiveGroupMessage");
      socketInstance.off("groupConversationHistory");
      socketInstance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId]);

  return { socket, privateMessages, groupMessages, onlineUsers, connected };
};
