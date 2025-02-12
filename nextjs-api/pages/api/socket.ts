import { Server } from "socket.io";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Socket as NetSocket } from "net";
import { Socket } from "socket.io";
import { GroupChatMessage, Message } from "../../backend/types/types";
import clientPromise from "../../backend/config/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { io } from "socket.io-client";

const JWT_SECRET = process.env.JWT_SECRET;
// Strong typing for JWT payload
interface JWTPayload {
  userId: string;
  username: string;
  // Add other relevant fields
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NetSocket & {
    server: NetServer & {
      io?: Server;
    };
  };
}

// Centralized error handling
const handleError = (error: Error, socket: any) => {
  console.error(`Socket Error: ${error.message}`, error);
  socket.emit("error", { message: "An error occurred" });
};

// Store online users with typescript Map
const onlineUsers = new Map<string, string>();

// Helper functions
const updateOnlineStatus = (io: Server, userId: string, socketId: string) => {
  onlineUsers.set(userId, socketId);
  io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
};

const removeOnlineUser = (io: Server, socketId: string) => {
  for (const [userId, id] of onlineUsers.entries()) {
    if (id === socketId) {
      onlineUsers.delete(userId);
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
      break;
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  try {
    const client = await clientPromise;
    const db = client.db("Cluster0");

    // ... existing Socket.IO initialization code ...

    if (res.socket.server.io) {
      console.log("Socket server already running");
      return res.end();
    }

    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    // Enhanced authentication middleware
    io.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth?.token;
        const userId = socket.handshake.query.userId as string;

        if (!token || !userId) {
          return next(new Error("Missing authentication credentials"));
        }

        const decodedToken = jwt.verify(
          token,
          JWT_SECRET as string
        ) as JWTPayload;

        if (decodedToken.userId !== userId) {
          return next(new Error("Invalid user credentials"));
        }

        const userContacts = await db
          .collection("contacts")
          .find({ ownerId: new ObjectId(userId) })
          .project({
            contactId: 1,
            contactUsername: 1,
            nickname: 1,
            addedAt: 1,
          })
          .toArray();

        const contactIds = userContacts.map((contact) =>
          contact.contactId.toString()
        );

        const onlineContacts = contactIds.filter((id) => onlineUsers.has(id));

        socket.emit("updateOnlineContacts", onlineContacts);
        socket.data.user = decodedToken;
        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    io.on("connection", (socket: Socket) => {
      console.log("🔌 User connected:", socket.id);

      socket.on("userOnline", (userId: string) => {
        updateOnlineStatus(io, userId, socket.id);
      });

      socket.on("sendMessage", async (message: Message) => {
        try {
          const savedMessage = await db.collection("messages").insertOne({
            ...message,
            timestamp: new Date(),
            status: "delivered",
          });

          io.to(message.receiver.toString()).emit("receiveMessage", {
            ...message,
            _id: savedMessage.insertedId,
          });
        } catch (error) {
          handleError(error as Error, socket);
        }
      });

      socket.on("sendGroupMessage", async (message: GroupChatMessage) => {
        try {
          const result = await db.collection("groupChats").updateOne(
            { _id: new ObjectId(message.groupId) },
            {
              $push: {
                messages: {
                  ...message,
                  timestamp: new Date(),
                  status: "delivered",
                },
              } as any,
            }
          );

          if (result.modifiedCount === 0) {
            throw new Error("Group chat not found");
          }

          io.to(message.groupId.toString()).emit(
            "receiveGroupMessage",
            message
          );
        } catch (error) {
          handleError(error as Error, socket);
        }
      });

      socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
        removeOnlineUser(io, socket.id);
      });
    });

    res.end();
  } catch (error) {
    console.error("Socket initialization error:", error);
    res.status(500).end();
  }
}
