import { Server as SocketIOServer, Socket } from "socket.io";
import { ObjectId } from "mongodb";
import { Message, GroupChatMessage, GroupChat, MessageRequest } from "../types/types";
import jwt from "jsonwebtoken";
import axios from "axios";
import { asId, normalizeMessage } from "../utils/ids";

interface UserSocket extends Socket {
  userId?: string;
  username?: string;
}

interface TokenPayload {
  userId?: string;
  username?: string;
}

const userSockets = new Map<string, Set<Socket>>();
const onlineUsers = new Map<string, string>();

let io: SocketIOServer | null = null;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return secret;
}

function getUserFromToken(token: string): { userId: string; username?: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded && typeof decoded !== "string" && "userId" in decoded) {
      const payload = decoded as TokenPayload;
      return {
        userId: String(payload.userId),
        username: payload.username ? String(payload.username) : undefined,
      };
    }
  } catch (error) {
    console.error("Error verifying token:", error);
  }
  return null;
}

function getUserIdFromToken(token: string): string | null {
  return getUserFromToken(token)?.userId || null;
}

function getOnlineUsersList() {
  return Array.from(onlineUsers.keys()).map((id) => ({
    userId: id,
    status: "online" as const,
  }));
}

function privateThreadId(userA: string, userB: string) {
  return [String(userA), String(userB)].sort().join(":");
}

function markUserOnline(socket: UserSocket, userId: string, username?: string) {
  socket.userId = userId;
  if (username) {
    socket.username = username;
  }
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket);
  onlineUsers.set(userId, userId);
  console.log(`User connected: ${userId} (${userSockets.get(userId)?.size} sockets)`);

  io?.emit("userStatusChanged", { userId, status: "online" });
  io?.emit("onlineUsers", getOnlineUsersList());
}

function emitToUser(userId: string, event: string, payload: unknown) {
  const sockets = userSockets.get(userId);
  if (!sockets) {
    return;
  }
  for (const userSocket of sockets) {
    if (userSocket.connected) {
      userSocket.emit(event, payload);
    }
  }
}

function broadcastPrivateMessage(savedMessage: Message, senderId: string) {
  const payload = normalizeMessage(savedMessage);
  const receiverId = asId(payload.receiver);
  const threadId = privateThreadId(senderId, receiverId);
  io?.to(threadId).emit("receivePrivateMessage", payload);
  emitToUser(receiverId, "receivePrivateMessage", payload);
  emitToUser(senderId, "receivePrivateMessage", payload);
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

      const user = getUserFromToken(token);
      if (!user) {
        return next(new Error("Authentication error"));
      }

      socket.userId = user.userId;
      socket.username = user.username;
      next();
    });

    io.on("connection", (socket: UserSocket) => {
      if (socket.userId) {
        markUserOnline(socket, socket.userId, socket.username);
      }

      socket.on("authenticate", (token: string) => {
        const user = getUserFromToken(token);
        if (!user) {
          socket.disconnect();
          return;
        }
        markUserOnline(socket, user.userId, user.username);
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

        markUserOnline(
          socket,
          userIdFromToken,
          tokenToVerify ? getUserFromToken(tokenToVerify)?.username : undefined
        );
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
            (contact: { contactId: string }) => asId(contact.contactId) === asId(roomId)
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
          const threadId = privateThreadId(socket.userId, roomId);
          socket.join(threadId);
          console.log(`User ${socket.userId} joined private room: ${threadId}`);
          const conversationResponse = await axios.get(
            `http://localhost:3000/api/messages/conversation?receiverId=${roomId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const conversation = (conversationResponse.data.conversation || []).map(
            (message: Message) => normalizeMessage(message)
          );
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
            socket.emit(
              "groupConversationHistory",
              groupsData.messages || []
            );
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
        "relayPrivateMessage",
        (payload: Message | {
          savedMessage?: Message;
          requiresApproval?: boolean;
          request?: MessageRequest;
        }) => {
          if (!socket.userId || !payload) {
            return;
          }

          const savedMessage =
            payload && typeof payload === "object" && "savedMessage" in payload
              ? payload.savedMessage
              : (payload as Message);
          const request =
            payload && typeof payload === "object" && "request" in payload
              ? payload.request
              : undefined;
          const requiresApproval = Boolean(
            (payload &&
              typeof payload === "object" &&
              "requiresApproval" in payload &&
              payload.requiresApproval) ||
              request?.status === "pending"
          );

          if (!savedMessage) {
            return;
          }

          if (requiresApproval && request) {
            const normalized = normalizeMessage(savedMessage);
            emitToUser(socket.userId, "receivePrivateMessage", normalized);
            emitToUser(asId(request.toUserId), "strangerMessageRequest", request);
            return;
          }

          broadcastPrivateMessage(savedMessage, socket.userId);
        }
      );

      socket.on(
        "resolveMessageRequest",
        ({
          request,
          action,
          contact,
        }: {
          request: MessageRequest;
          action: "accept" | "deny";
          contact?: unknown;
        }) => {
          if (!socket.userId || !request) {
            return;
          }

          const fromUserId = asId(request.fromUserId);
          const toUserId = asId(request.toUserId);
          if (toUserId !== socket.userId) {
            return;
          }

          const payload = {
            status: action === "accept" ? "accepted" : "denied",
            request: { ...request, status: action === "accept" ? "accepted" : "denied" },
            contact: action === "accept" ? contact : null,
          };

          emitToUser(fromUserId, "messageRequestResolved", payload);
          emitToUser(toUserId, "messageRequestResolved", payload);
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
              if (res.data.requiresApproval && res.data.request) {
                emitToUser(
                  socket.userId,
                  "receivePrivateMessage",
                  normalizeMessage(savedMessage)
                );
                emitToUser(
                  asId(res.data.request.toUserId),
                  "strangerMessageRequest",
                  res.data.request
                );
              } else {
                broadcastPrivateMessage(savedMessage, socket.userId);
                emitToUser(asId(savedMessage.receiver), "newMessageNotification", {
                  senderId: socket.userId,
                  type: "private",
                  message: message.content,
                });
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

      socket.on("announceGroup", (group: GroupChat) => {
        if (!socket.userId || !group?.members) {
          return;
        }
        const payload = group;
        for (const member of group.members) {
          emitToUser(asId(member.userId), "groupCreated", payload);
        }
      });

      socket.on(
        "relayGroupMessage",
        (payload: GroupChatMessage | { message?: GroupChatMessage; memberIds?: string[] }) => {
          const savedMessage =
            payload && typeof payload === "object" && "message" in payload
              ? payload.message
              : (payload as GroupChatMessage);
          const memberIds =
            payload && typeof payload === "object" && "memberIds" in payload
              ? payload.memberIds
              : undefined;
          if (!socket.userId || !savedMessage) {
            return;
          }
          const groupId = asId(savedMessage.groupId);
          io?.to(groupId).emit("receiveGroupMessage", savedMessage);
          const recipients = new Set([
            socket.userId,
            ...(memberIds || []).map((id) => asId(id)),
          ]);
          for (const userId of recipients) {
            emitToUser(userId, "receiveGroupMessage", savedMessage);
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

                io.to(asId(message.groupId)).emit(
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
        ({
          roomId,
          isTyping,
          threadKey,
        }: {
          roomId: string;
          isTyping: boolean;
          threadKey?: string;
        }) => {
          if (!socket.userId || !roomId) {
            return;
          }
          const isDirect =
            Boolean(threadKey?.startsWith("direct:")) || roomId.includes(":");
          const resolvedThreadKey = isDirect
            ? `direct:${socket.userId}`
            : threadKey || `group:${roomId}`;
          const payload = {
            userId: socket.userId,
            username: socket.username || "Someone",
            isTyping: Boolean(isTyping),
            threadKey: resolvedThreadKey,
            roomId,
          };
          socket.to(roomId).emit("userTyping", payload);
          if (isDirect) {
            const otherId = roomId
              .split(":")
              .find((id) => id && id !== socket.userId);
            if (otherId) {
              emitToUser(otherId, "userTyping", payload);
            }
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

          const sockets = userSockets.get(userId);
          sockets?.delete(socket);
          if (sockets && sockets.size === 0) {
            userSockets.delete(userId);
          }

          setTimeout(() => {
            const userStillConnected = (userSockets.get(userId)?.size || 0) > 0;

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
  const sockets = userSockets.get(userId);
  if (!sockets) {
    return undefined;
  }
  return Array.from(sockets).find((socket) => socket.connected);
};
