import { Server as SocketIOServer, Socket } from "socket.io";
import { Message, GroupChatMessage } from "../types/types";

interface UserSocket extends Socket {
  userId?: string;
}

const onlineUsers = new Map<string, string>(); // userId, socketId

let io: SocketIOServer | null = null;

export const initSocketServer = (server: any) => {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket: UserSocket) => {
      console.log(`User connected: ${socket.id}`);

      //Handle user authentication and online status
      socket.on("userAuthenticated", (userId: string) => {
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        //Broadcast user's online status to all connected clients
        io?.emit("userStatusChanged", { userId, status: "online" });
        // Send the current online users list to the newly connected user
        const onlineUsersList = Array.from(onlineUsers.keys());
        socket.emit("onlineUsers", onlineUsersList);
      });
      //Private chat room handling
      socket.on("joinPrivateRoom", (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined private room: ${roomId}`);
      });

      //Group chat room handling
      socket.on("joinGroupRoom", (groupId: string) => {
        socket.join(groupId);
        console.log(`User ${socket.id} joined group room: ${groupId}`);
      });

      socket.on(
        "sendPrivateMessage",
        ({ message, roomId }: { message: Message; roomId: string }) => {
          if (io) {
            //Remember to store message in the database through my API

            //Emit message to the room
            io.to(roomId).emit("receivePrivateMessage", message);
            // Send notification if recipient is not in the room
            if (
              message.receiver &&
              socket.userId !== message.receiver.toString()
            ) {
              const recipientSocketId = onlineUsers.get(
                message.receiver.toString()
              );
              if (recipientSocketId) {
                io.to(recipientSocketId).emit("newMessageNotification", {
                  senderId: socket.userId,
                  type: "private",
                  message: message.content,
                });
              }
            }
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

      socket.on(
        "typing",
        ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
          if (socket.userId) {
            socket.to(roomId).emit("userTyping", {
              userId: socket.userId,
              isTyping,
            });
          }
        }
      );

      socket.on(
        "markAsRead",
        ({ messageId, roomId }: { messageId: string; roomId: string }) => {
          if (socket.userId) {
            socket.to(roomId).emit("messageRead", {
              messageId,
              userId: socket.userId,
              timestamp: new Date(),
            });
          }
        }
      );

      socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
        if (socket.userId) {
          onlineUsers.delete(socket.userId);
          io?.emit("userStatusChanged", {
            userId: socket.userId,
            status: "offline",
          });
        }
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
