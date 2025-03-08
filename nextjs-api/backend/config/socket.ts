import { Server as SocketIOServer, Socket } from "socket.io";
import { Message, GroupChatMessage } from "../types/types";
import { useAuth } from "../hooks/AuthContext";
import axios from "axios";

interface UserSocket extends Socket {
  userId?: string;
}

const onlineUsers = new Map<string, string>(); // userId, socketId

let io: SocketIOServer | null = null;

export const initSocketServer = (server: any) => {
  let { token } = useAuth();
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
      socket.on("joinPrivateRoom", async (roomId: string) => {
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
          console.log(`User ${socket.id} joined private room: ${roomId}`);
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
              "Error saving message:",
              error.response?.data || error.message
            );
          } else {
            console.error("Unexpected error saving message:", error);
          }
        }
      });

      //Group chat room handling
      socket.on("joinGroupRoom", async (groupId: string) => {
        try {
          const res = await axios.get(
            `http://localhost:3000/api/messages/group/fetch-all-messages?groupId=${groupId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const groupsData = res.data.groups;

          if (!groupsData) {
            console.log(`Group ${groupId} not found or no messages available.`);
            socket.emit("groupConversationHistory", []);
            return;
          }
          socket.join(groupId);
          console.log(`User ${socket.id} joined group room: ${groupId}`);
          socket.emit("groupConversationHistory", groupsData.messages || []);
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
      });

      socket.on(
        "sendPrivateMessage",
        async ({ message, roomId }: { message: Message; roomId: string }) => {
          if (io) {
            // Remember to store message in the database through my API
            try {
              const res = await axios.post(
                "http://localhost:3000/api/messages/send",
                {
                  sender: socket.userId,
                  receiver: message.receiver,
                  content: message.content,
                  timestamp: new Date(),
                }
              );
              const savedMessage = res.data;
              //Emit message to the room
              io.to(roomId).emit("receivePrivateMessage", savedMessage);
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
          groupId,
        }: {
          message: GroupChatMessage;
          groupId: string;
        }) => {
          if (io) {
            try {
              const res = await axios.post(
                "http://localhost:3000/api/messages/group/add-message-to-group",
                {
                  groupId,
                  text: message.text,
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`, // Ensure token is passed for authentication
                  },
                }
              );

              if (res.status === 200 && res.data.newMessage) {
                const newMessage = res.data.newMessage;

                io.to(groupId).emit("receiveGroupMessage", newMessage);
              } else {
                console.error("Failed to send message:", res.data.message);
                socket.emit("error", { message: "Failed to send message" });
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
