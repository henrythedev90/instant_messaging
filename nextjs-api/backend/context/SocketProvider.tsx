import { createContext, useContext, useEffect, useState } from "react";
import { Contact } from "../types/types";
import socket from "../utils/socket";
import { Socket } from "socket.io-client";

const SocketContext = createContext<{
  socket: Socket;
  onlineUser: string[];
  setOnlineUser: (contacts: string[]) => void;
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

    console.log("Emitting userOnline with userId:", userId);
    socket.emit("userOnline", userId);

    socket.on("updateOnlineContacts", (contacts: Contact[]) => {
      console.log("Received online contacts:", contacts);
      setOnlineUser(contacts.map((contact) => contact.contactUsername));
    });

    return () => {
      socket.off("updateOnlineContacts");
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, onlineUser, setOnlineUser }}>
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
