import { Server as SocketIOServer, Socket } from "socket.io";
import { ObjectId } from "mongodb";
import { Message, GroupChatMessage, GroupChat } from "../types/types";
import jwt from "jsonwebtoken";
import axios from "axios";

interface UserSocket extends Socket {
  userId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

// Map to store user connections (userId -> socket)
const userSockets = new Map<string, Socket>();
const onlineUsers = new Map<string, string>(); // userId, userId (consistent identifier)

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
      // Don't log connection with auto-generated ID
      // Just wait for authentication before logging

      // Handle authentication - this should be the first event from client
      socket.on("authenticate", (token: string) => {
        try {
          // Verifying the token passed from the client
          const user = jwt.verify(token, JWT_SECRET);
          if (user && typeof user !== "string" && "userId" in user) {
            const userId = user.userId;

            // If this user already has a socket connection, disconnect it
            if (userSockets.has(userId)) {
              const existingSocket = userSockets.get(userId);
              if (existingSocket && existingSocket.connected) {
                // Don't log disconnection, just silently replace
                existingSocket.disconnect();
              }
            }

            // Set userId in socket object
            socket.userId = userId;

            // Store the new socket with userId as key
            userSockets.set(userId, socket);
            onlineUsers.set(userId, userId); // Use userId as consistent identifier

            // Only log once authenticated with userId
            console.log(`User connected: ${userId}`);

            // Broadcast user online status
            socket.emit("userStatusChanged", {
              userId: userId,
              status: "online",
            });

            // Send current online users list
            socket.emit(
              "onlineUsers",
              Array.from(onlineUsers.keys()).map((id) => ({
                userId: id,
                status: "online",
              }))
            );
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          socket.disconnect(); // Disconnect user if the token verification fails
        }
      });

      //Handle user authentication and online status - alternative method
      socket.on("userAuthenticated", (userId: string, token: string) => {
        try {
          const decodedUser = jwt.verify(token, JWT_SECRET);
          if (
            decodedUser &&
            typeof decodedUser !== "string" &&
            "userId" in decodedUser
          ) {
            // If this user already has a socket connection, disconnect it silently
            if (userSockets.has(userId)) {
              const existingSocket = userSockets.get(userId);
              if (existingSocket && existingSocket.connected) {
                existingSocket.disconnect();
              }
            }

            socket.userId = userId;
            userSockets.set(userId, socket);
            onlineUsers.set(userId, userId); // Use userId as consistent identifier

            // Only log once authenticated with userId
            console.log(`User connected: ${userId}`);

            io?.emit("userStatusChanged", { userId, status: "online" });

            // Send the current online users list to the newly connected user
            const onlineUsersList = Array.from(onlineUsers.keys()).map(
              (id) => ({
                userId: id,
                status: "online",
              })
            );
            socket.emit("onlineUsers", onlineUsersList);
          }
        } catch (error) {
          console.error("Token verification failed:", error);
          socket.emit("error", {
            message: "Invalid token. Please log in again.",
          });
          socket.disconnect();
        }
      });

      //Private chat room handling
      socket.on("joinPrivateRoom", async (roomId: string, token: string) => {
        if (!socket.userId) {
          socket.emit("error", {
            message: "You must be authenticated to join a room.",
          });
          return;
        }

        try {
          const res = await axios.get("http://localhost:3000/api/contacts", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

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

      //Group chat room handling
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
              const savedMessage = res.data;

              // Emit message to the room
              io.to(message.receiver.toString()).emit(
                "receivePrivateMessage",
                savedMessage
              );

              // Send notification if recipient is not in the room
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
        // Check if socket has a userId (was authenticated)
        const userId = socket.userId;
        if (userId) {
          console.log(`User ${userId} disconnected`);

          // When page refresh happens, don't immediately remove from online users
          // Instead, set a timeout to give them a chance to reconnect
          setTimeout(() => {
            // Check if the user has reconnected (would have a different socket but same userId)
            const userStillConnected = userSockets.has(userId);

            if (!userStillConnected) {
              // Only now mark them as offline if they haven't reconnected
              onlineUsers.delete(userId);

              // Broadcast user offline status
              io?.emit("userStatusChanged", {
                userId: userId,
                status: "offline",
              });

              // Update online users list
              io?.emit(
                "onlineUsers",
                Array.from(onlineUsers.keys()).map((id) => ({
                  userId: id,
                  status: "online",
                }))
              );
            }
          }, 5000); // 5 second grace period for reconnection

          // Remove this specific socket from userSockets map
          if (userSockets.get(userId) === socket) {
            userSockets.delete(userId);
          }
        }
        // Don't log disconnections for unauthenticated sockets
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

// Helper function to get a user's socket by userId
export const getUserSocket = (userId: string): Socket | undefined => {
  return userSockets.get(userId);
};
