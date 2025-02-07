import { NextApiRequest, NextApiResponse } from "next";
import { authenticate } from "../../../backend/middleware/authenticate";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
let blacklistTokens: Set<string> = new Set();

function blacklistTokenTracker(token: string) {
  blacklistTokens.add(token);

  const decode = jwt.decode(token) as { exp: number };
  if (decode?.exp) {
    setTimeout(
      () => {
        blacklistTokens.delete(token);
      },
      (decode.exp - Date.now()) * 1000
    );
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user) {
      blacklistTokenTracker(token);
      return res.status(200).json({
        message: "Logged out successfully",
      });
    }
  } catch (error) {
    console.error("Error logging out:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
