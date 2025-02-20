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

      socket.on("joinPrivateRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined private room: ${roomId}`);
      });

      socket.on("joinGroupRoom", (groupId: string) => {
        socket.join(groupId);
        console.log(`User ${socket.id} joined group room: ${groupId}`);
      });

      socket.on(
        "sendPrivateMessage",
        ({ message, roomId }: { message: Message; roomId: string }) => {
          if (io) {
            io.to(roomId).emit("receivePrivateMessage", message);
          }
        }
      );

      socket.on(
        "sendGroupMessage",
        ({
          message,
          groupId,
        }: {
          message: GroupChatMessage;
          groupId: string;
        }) => {
          if (io) {
            io.to(groupId).emit("receiveGroupMessage", message);
          }
        }
      );

      socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
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
