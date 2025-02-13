import { authenticate } from "../../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupChatMessage } from "../../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;

  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log(req.query);
    const { messageId, groupId } = req.query;
    console.log(messageId, groupId);

    if (!messageId) {
      return res.status(400).json({ message: "Message ID is required" });
    }

    const message = await db
      .collection("groupChatsMessages")
      .findOne<GroupChatMessage>({
        _id: new ObjectId(messageId as string),
        groupId: new ObjectId(groupId as string),
      });

    if (message?.senderId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the sender of this message" });
    }

    const result = await db.collection("groupChatsMessages").deleteOne({
      _id: new ObjectId(messageId as string),
    });

    return res
      .status(200)
      .json({ message: "Message deleted successfully", result });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);

// http://localhost:3000/api/messages/group/delete-single-message?messageId=67ae543ebd62161fd50fb809&groupId=67ae5342bd62161fd50fb807
