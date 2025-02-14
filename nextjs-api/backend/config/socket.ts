import { Server as SocketIOServer } from "socket.io";
import { Message, GroupChatMessage } from "../types/types";

let io: SocketIOServer | null = null;

export const initSocketServer = (server: any) => {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on("joinRoom", (roomId: string) => {
        socket.join(roomId);
      });

      socket.on("sendMessage", (message: Message) => {
        if (io) {
          io.to(message.receiver.toString()).emit("receiveMessage", message);
        }
      });

      socket.on("sendGroupMessage", (message: GroupChatMessage) => {
        if (io) {
          io.to(message.groupId.toString()).emit(
            "receiveGroupMessage",
            message
          );
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  return io;
};

export const getSocketServer = () => {
  if (!io) {
    throw new Error("Socket.io server is not initialized.");
  }
  return io;
};
