import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Message } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";
import { normalizeMessage } from "../../../backend/utils/ids";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { receiverId } = req.query;
    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    const senderId = (req as any).user.userId;
    const conversation = await db
      .collection("messages")
      .find<Message>({
        $or: [
          {
            sender: new ObjectId(senderId as string),
            receiver: new ObjectId(receiverId as string),
          },
          {
            sender: new ObjectId(receiverId as string),
            receiver: new ObjectId(senderId as string),
          },
        ],
      })
      .sort({ timestamp: -1 })
      .toArray();

    res.status(200).json({
      conversation: conversation.map((message) => normalizeMessage(message)),
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);

// Fetch conversation with user ID "123"
// const response = await fetch('/api/messages/conversation?receiverId=123');
// const data = await response.json();
// data.conversation will contain all messages between current user and user 123
