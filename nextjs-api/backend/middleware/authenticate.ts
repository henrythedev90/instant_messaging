import { NextApiRequest, NextApiResponse } from "next";
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
