import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { authenticate } from "../../../backend/middleware/authenticate";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method === "PUT") {
    try {
      const { messageId, content } = req.body;

      if (!messageId || !content) {
        return res
          .status(400)
          .json({ message: "Message ID and content are required" });
      }

      const result = await db
        .collection("messages")
        .updateOne(
          { _id: new ObjectId(messageId as string) },
          { $set: { content, timestamp: new Date() } }
        );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.status(200).json({
        message: "Message updated",
        updatedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    if (req.method !== "DELETE") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    try {
      const { messageId } = req.query;

      if (!messageId) {
        return res.status(400).json({ message: "Message ID is required" });
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
}

export default authenticate(handler);
