import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { DecodedToken } from "../types/types";

const JWT_SECRET = process.env.JWT_SECRET;

export function authorizeAndAuthenticate(
  handler: (req: NextApiRequest, res: NextApiResponse) => void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    try {
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }

      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      const { id } = req.query;

      if (id) {
        // Convert both `decoded.userId` and `id` to ObjectId strings for strict comparison
        const decodedUserId = new ObjectId(decoded.userId).toString();
        const requestId = new ObjectId(id as string).toString();

        console.log("Decoded User ID:", decodedUserId);
        console.log("Request ID:", requestId);
        console.log("Comparison Result:", decodedUserId === requestId);

        if (decodedUserId !== requestId) {
          return res.status(403).json({ message: "Forbidden: Access denied" });
        }
      }

      (req as any).user = decoded;
      return handler(req, res);
    } catch (err) {
      console.error("Authorization failed:", err);

      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: "Token has expired" });
      }

      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  };
}
