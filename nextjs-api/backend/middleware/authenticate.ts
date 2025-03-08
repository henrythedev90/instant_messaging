import { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../types/types";

let blacklistedTokens = new Set<string>();

export function authenticate(
  handler: (req: NextApiRequest, res: NextApiResponse) => void
) {
  const JWT_SECRET = process.env.JWT_SECRET;
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization;

    // Check if the Authorization header exists and starts with 'Bearer'
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: Missing token" });
    }

    // Extract the token from the Authorization header
    const token = authHeader.split(" ")[1];

    if (!token || blacklistedTokens.has(token)) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Token blacklisted" });
    }

    try {
      // Ensure JWT_SECRET is defined
      if (!JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables");
        return res.status(500).json({ message: "Internal Server Error" });
      }

      // Verify the token and decode its payload
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return res.status(401).json({ message: "Token has expired" });
      }

      // Attach the decoded user information to the request object
      (req as any).user = decoded;
      // Call the original handler with the request and response objects
      return handler(req, res);
    } catch (err) {
      console.error("JWT verification failed:", err);

      // Add more specific error handling
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "Token has expired" });
      } else if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: "Invalid token" });
      }

      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }
  };
}

// Combined socket.io setup with JWT verification
const server = require("http").createServer(); // Ensure server is defined
const io = new Server(server, {
  // Use the Server class to create a new instance
  cors: {
    origin: "http://localhost:3000", // Allow connections from your client
    methods: ["GET", "POST"],
  },
});

// Define the interface for the decoded token
interface SocketDecodedToken extends jwt.JwtPayload {
  id?: string; // Common field name for user ID
  userId?: string; // Alternative field name for user ID
  sub?: string; // Standard JWT subject field that might contain user ID
}

io.use((socket: any, next: any) => {
  const token = socket.handshake.auth.token; // Retrieve token from handshake auth object
  if (!token) {
    return next(new Error("Authentication token is required"));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return next(new Error("JWT_SECRET is not defined"));
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET) as SocketDecodedToken;

    // Try to find the user ID from various possible fields in the token
    const userId = decoded.userId || decoded.id || decoded.sub;

    if (!userId) {
      return next(new Error("User ID not found in token"));
    }

    // Attach user ID to the socket for later use
    socket.userId = userId;
    return next();
  } catch (err) {
    console.error("Socket authentication error:", err);
    return next(new Error("Authentication error"));
  }
});

io.on("connection", (socket: any) => {
  console.log("User connected with ID:", socket.userId);
  // Handle other events...
});

// Export the io instance if needed elsewhere
export { io, server };
