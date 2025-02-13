import { authenticate } from "../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const senderId = (req as any).user.userId;

  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { messageId } = req.query;

    if (!messageId) {
      return res.status(400).json({ message: "Message ID is required" });
    }

    const message = await db.collection("messages").findOne({
      _id: new ObjectId(messageId as string),
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    console.log("Sender ID from request:", senderId);
    console.log("Sender ID from message:", message.sender);

    if ((message.sender as ObjectId).toString() !== senderId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const result = await db.collection("messages").deleteOne({
      _id: new ObjectId(messageId as string),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.status(200).json({
      message: "Message deleted",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
