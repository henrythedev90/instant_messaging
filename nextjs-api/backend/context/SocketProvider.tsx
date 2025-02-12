import { createContext, useContext, useEffect, useState } from "react";
import socket from "../utils/socket";
import { Socket } from "socket.io-client";

const SocketContext = createContext<{
  socket: Socket;
  onlineUser: string[];
} | null>(null);

export const SocketProvider = ({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) => {
  const [onlineUser, setOnlineUser] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    socket.emit("userOnline", userId);

    socket.on("updateOnlineContacts", (contacts: string[]) => {
      setOnlineUser(contacts);
    });

    return () => {
      socket.off("updateOnlineContacts");
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, onlineUser }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useSocket must be used within a SocketProvider");
  return context;
};
