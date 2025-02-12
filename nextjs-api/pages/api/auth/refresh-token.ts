import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../backend/middleware/authenticate";

import jwt from "jsonwebtoken";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(403).json({ error: "No refresh token provided" });

    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
      // If token is still valid, no need to refresh
      return res.status(200).json({ message: "Token still valid" });
    } catch (tokenError) {
      // Token is expired or invalid, proceed with refresh
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_SECRET as string
      ) as {
        userId: string;
        email: string;
        username: string;
      };

      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          username: decoded.username,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" }
      );
      return res.status(200).json({ accessToken: newToken });
    }
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
