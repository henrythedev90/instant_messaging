import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { Message, GroupChatMessage, OnlineUsers } from "../types/types";
import { group } from "console";
import { flushAllTraces } from "next/dist/trace";

const SOCKET_SERVER_URL = "http://localhost:3001";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

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

    socketInstance.on("userStatusChanged", ({ userId, status }) => {
      setOnlineUsers((prev) =>
        status === "online" && !prev.includes(userId)
          ? [...prev, userId]
          : prev.filter((id) => id !== userId)
      );
    });

    socketInstance.on("receiveMessage", (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
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
      socketInstance.off("receiveMessage");
      socketInstance.off("receiveGroupMessage");
      socketInstance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId]);

  return { socket, messages, groupMessages, onlineUsers, connected };
};
