import { Server } from "socket.io";
import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Socket as NetSocket } from "net";

// Define the custom SocketServer type
interface SocketServer extends NetServer {
  io?: Server;
}

// Define the custom SocketWithIO type
interface SocketWithIO extends NetSocket {
  server: SocketServer;
  // Optionally add other properties here if needed
}

// Extend NextApiResponse to include our custom socket type
interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Check if the Socket.IO server is already running
  if (res.socket.server.io) {
    console.log("✅ Socket.IO is already running");
    res.end();
    return;
  }

  console.log("🚀 Setting up Socket.IO server...");

  // Initialize the Socket.IO server
  const socketServer = res.socket.server as SocketServer;
  const io = new Server(socketServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Attach the Socket.IO server to the socketServer
  socketServer.io = io;

  // Handle new connections to the Socket.IO server
  io.on("connection", (socket) => {
    console.log("🔌 A user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ A user disconnected:", socket.id);
    });
  });

  // End the response
  res.end();
}
