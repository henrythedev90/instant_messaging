import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Message, GroupChatMessage } from "../types/types";

const SOCKET_SERVER_URL = "http://localhost:3001";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupChatMessage[]>([]);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      reconnection: true,
      transports: ["websocket"],
    });

    setSocket(newSocket);

    const handleReceiveMessage = (message: Message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    const handleReceiveGroupMessage = (groupMessage: GroupChatMessage) => {
      setGroupMessages((prevMessages) => [...prevMessages, groupMessage]);
    };

    newSocket.on("receiveMessage", handleReceiveMessage);
    newSocket.on("receiveGroupMessage", handleReceiveGroupMessage);

    return () => {
      newSocket.off("receiveMessage", handleReceiveMessage);
      newSocket.off("receiveGroupMessage", handleReceiveGroupMessage);
      newSocket.disconnect();
    };
  }, []);

  return { socket, messages, groupMessages };
};
