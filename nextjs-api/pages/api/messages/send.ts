import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { Message } from "../../../backend/types/types";
import { authenticate } from "../../../backend/middleware/authenticate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { receiverId, content } = req.body;
    const senderId = (req as any).user.userId;
    const message: Message = {
      _id: new ObjectId(),
      senderId,
      receiverId: new ObjectId(receiverId as string),
      content,
      timestamp: new Date(),
    };

    await db.collection("messages").insertOne(message);
    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
export default authenticate(handler);
