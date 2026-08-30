import { Server as SocketIOServer, Socket } from "socket.io";
import { ObjectId } from "mongodb";
import { Message, GroupChatMessage, GroupChat } from "../types/types";
import jwt from "jsonwebtoken";
import axios from "axios";

interface UserSocket extends Socket {
  userId?: string;
}

interface TokenPayload {
  userId?: string;
}

const userSockets = new Map<string, Socket>();
const onlineUsers = new Map<string, string>();

let io: SocketIOServer | null = null;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return secret;
}

function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded && typeof decoded !== "string" && "userId" in decoded) {
      return String((decoded as TokenPayload).userId);
    }
  } catch (error) {
    console.error("Error verifying token:", error);
  }
  return null;
}

function getOnlineUsersList() {
  return Array.from(onlineUsers.keys()).map((id) => ({
    userId: id,
    status: "online" as const,
  }));
}

function markUserOnline(socket: UserSocket, userId: string) {
  const existingSocket = userSockets.get(userId);
  if (existingSocket && existingSocket !== socket && existingSocket.connected) {
    existingSocket.disconnect();
  }

  socket.userId = userId;
  userSockets.set(userId, socket);
  onlineUsers.set(userId, userId);
  console.log(`User connected: ${userId}`);

  io?.emit("userStatusChanged", { userId, status: "online" });
  io?.emit("onlineUsers", getOnlineUsersList());
}

export const initSocketServer = (server: any) => {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.use((socket: UserSocket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next();
      }

      const userId = getUserIdFromToken(token);
      if (!userId) {
        return next(new Error("Authentication error"));
      }

      socket.userId = userId;
      next();
    });

    io.on("connection", (socket: UserSocket) => {
      if (socket.userId) {
        markUserOnline(socket, socket.userId);
      }

      socket.on("authenticate", (token: string) => {
        const userId = getUserIdFromToken(token);
        if (!userId) {
          socket.disconnect();
          return;
        }
        markUserOnline(socket, userId);
      });

      socket.on("userAuthenticated", (userIdOrPayload: unknown, token?: string) => {
        const tokenToVerify =
          token ||
          (typeof userIdOrPayload === "object" &&
          userIdOrPayload &&
          "token" in userIdOrPayload
            ? String((userIdOrPayload as { token?: string }).token)
            : undefined) ||
          (socket.handshake.auth?.token as string | undefined);

        const userIdFromToken = tokenToVerify
          ? getUserIdFromToken(tokenToVerify)
          : null;
        const requestedUserId =
          typeof userIdOrPayload === "string"
            ? userIdOrPayload
            : userIdOrPayload &&
                typeof userIdOrPayload === "object" &&
                "userId" in userIdOrPayload
              ? String((userIdOrPayload as { userId?: string }).userId)
              : undefined;

        if (
          !userIdFromToken ||
          (requestedUserId && userIdFromToken !== requestedUserId)
        ) {
          socket.emit("error", {
            message: "Invalid token. Please log in again.",
          });
          socket.disconnect();
          return;
        }

        markUserOnline(socket, userIdFromToken);
      });

      socket.on("joinPrivateRoom", async (roomId: string, token: string) => {
        if (!socket.userId) {
          socket.emit("error", {
            message: "You must be authenticated to join a room.",
          });
          return;
        }

        try {
          const res = await axios.get(
            "http://localhost:3000/api/contacts/get-all-contact",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const contacts = res.data.contacts;

          const isContact = contacts.some(
            (contact: { contactId: string }) =>
              contact.contactId.toString() === roomId
          );
          if (!isContact) {
            console.log(
              `Access denied: Room ${roomId} is not in user's contacts.`
            );
            socket.emit("error", {
              message: "You can only join rooms with your contacts.",
            });
            return;
          }
          socket.join(roomId);
          console.log(`User ${socket.userId} joined private room: ${roomId}`);
          const conversationResponse = await axios.get(
            `http://localhost:3000/api/messages/conversation?receiverId=${roomId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const conversation = conversationResponse.data.conversation;
          socket.emit("conversationHistory", conversation);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error(
              "Error fetching conversation:",
              error.response?.data || error.message
            );
          } else {
            console.error("Unexpected error in joinPrivateRoom:", error);
          }
        }
      });

      socket.on(
        "joinGroupRoom",
        async ({ group, token }: { group: GroupChat; token: string }) => {
          if (!socket.userId) {
            socket.emit("error", {
              message: "You must be authenticated to join a group.",
            });
            return;
          }

          const groupId = group._id.toString();
          try {
            const res = await axios.get(
              `http://localhost:3000/api/messages/group/fetch-all-messages?groupId=${groupId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const groupsData = res.data.groups;

            if (!groupsData) {
              console.log(
                `Group ${groupId} not found or no messages available.`
              );
              socket.emit("groupConversationHistory", []);
              return;
            }
            socket.join(groupId);
            console.log(`User ${socket.userId} joined group room: ${groupId}`);
            socket.emit("groupConversationHistory", groupsData.messages || []);
          } catch (error) {
            if (axios.isAxiosError(error)) {
              console.error(
                "Error fetching group messages:",
                error.response?.data || error.message
              );
            } else {
              console.error("Unexpected error in joinGroupRoom:", error);
            }
          }
        }
      );

      socket.on(
        "sendPrivateMessage",
        async ({
          message,
          roomId,
          token,
        }: {
          message: Message;
          roomId: ObjectId;
          token: string;
        }) => {
          if (!socket.userId) {
            socket.emit("error", {
              message: "You must be authenticated to send messages.",
            });
            return;
          }

          if (io) {
            try {
              const res = await axios.post(
                "http://localhost:3000/api/messages/send",
                {
                  sender: socket.userId,
                  receiver: message.receiver,
                  content: message.content,
                  timestamp: new Date(),
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const savedMessage = res.data.savedMessage || res.data;

              io.to(message.receiver.toString()).emit(
                "receivePrivateMessage",
                savedMessage
              );

              if (
                message.receiver &&
                socket.userId !== message.receiver.toString()
              ) {
                const recipientSocket = userSockets.get(
                  message.receiver.toString()
                );
                if (recipientSocket) {
                  recipientSocket.emit("newMessageNotification", {
                    senderId: socket.userId,
                    type: "private",
                    message: message.content,
                  });
                }
              }
            } catch (error) {
              if (axios.isAxiosError(error)) {
                console.error(
                  "Error saving message:",
                  error.response?.data || error.message
                );
              } else {
                console.error("Unexpected error saving message:", error);
              }
            }
          }
        }
      );

      socket.on(
        "sendGroupMessage",
        async ({
          message,
          token,
        }: {
          message: GroupChatMessage;
          token: string;
        }) => {
          if (!socket.userId) {
            socket.emit("error", {
              message: "You must be authenticated to send messages.",
            });
            return;
          }

          if (io) {
            try {
              const res = await axios.post(
                "http://localhost:3000/api/messages/group/add-message-to-group",
                {
                  groupId: message.groupId,
                  text: message.text,
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (res.status === 200 && res.data.newMessage) {
                const newMessage = res.data.newMessage;

                io.to(message.groupId.toString()).emit(
                  "receiveGroupMessage",
                  newMessage
                );
              } else {
                console.error("Failed to send message:", res.data.message);
                socket.emit("error", { message: "Failed to send message" });
              }
            } catch (error) {
              if (axios.isAxiosError(error)) {
                console.error(
                  "Error saving group message:",
                  error.response?.data || error.message
                );
              } else {
                console.error("Unexpected error saving group message:", error);
              }
            }
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
        const userId = socket.userId;
        if (userId) {
          console.log(`User ${userId} disconnected`);

          if (userSockets.get(userId) === socket) {
            userSockets.delete(userId);
          }

          setTimeout(() => {
            const userStillConnected = userSockets.has(userId);

            if (!userStillConnected) {
              onlineUsers.delete(userId);
              io?.emit("userStatusChanged", {
                userId,
                status: "offline",
              });
              io?.emit("onlineUsers", getOnlineUsersList());
            }
          }, 5000);
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

export const getUserSocket = (userId: string): Socket | undefined => {
  return userSockets.get(userId);
};
