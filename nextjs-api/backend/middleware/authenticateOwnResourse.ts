import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { UserDecodedToken } from "../types/types";
// Define the structure of the decoded token

const JWT_SECRET = process.env.JWT_SECRET;

export function authorizeOwnResource(
  handler: (req: NextApiRequest, res: NextApiResponse) => void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];

    try {
      // Verify the token
      if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
      }

      const decoded = jwt.verify(token, JWT_SECRET) as UserDecodedToken;
      console.log(decoded, "this is the decoded token");

      // Extract the `id` from the URL and `userId` from the token
      const { id } = req.query;
      if (decoded.id !== id) {
        return res.status(403).json({ message: "Forbidden: Access denied" });
      }

      // Attach the decoded user to the request for further use
      (req as any).user = decoded;

      // Pass control to the original handler
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
