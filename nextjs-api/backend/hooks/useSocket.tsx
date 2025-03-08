import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { Message, GroupChatMessage, OnlineUser } from "../types/types";

const SOCKET_SERVER_URL = "http://localhost:3001";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
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

    const handleOnlineUsers = (users: OnlineUser[]) => {
      setOnlineUsers((prev) => {
        // Create a new map for faster lookup and merging logic
        const userMap = new Map(prev.map((user) => [user.userId, user]));

        users.forEach((user) => {
          userMap.set(user.userId, user); // Add or update user
        });

        return Array.from(userMap.values());
      });
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
          ? [...prev, { userId, status }]
          : prev.filter((user) => user.userId !== userId)
      );
    };
    const handlePrivateMessage = (message: Message) =>
      setPrivateMessages((prevMessages) => [...prevMessages, message]);

    const handleGroupMessage = (groupMessage: GroupChatMessage) =>
      setGroupMessages((prevMessages) => [...prevMessages, groupMessage]);

    socketInstance.on("connect", () => {
      console.log("Connected to socket server");
      setConnected(true);
      socketInstance.emit("userAuthenticated", userId);
    });

    socketInstance.on("onlineUsers", handleOnlineUsers);
    socketInstance.on("groupConversationHistory", handleGroupHistory);
    socketInstance.on("userStatusChanged", handleUserStatusChange);
    socketInstance.on("receivePrivateMessage", handlePrivateMessage);
    socketInstance.on("receiveGroupMessage", handleGroupMessage);

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from socket server");
      setConnected(false);
    });

    return () => {
      socketInstance.off("onlineUsers", handleOnlineUsers);
      socketInstance.off("groupConversationHistory", handleGroupHistory);
      socketInstance.off("userStatusChanged", handleUserStatusChange);
      socketInstance.off("receivePrivateMessage", handlePrivateMessage);
      socketInstance.off("receiveGroupMessage", handleGroupMessage);
      socketInstance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId, token]);

  return { socket, privateMessages, groupMessages, onlineUsers, connected };
};
