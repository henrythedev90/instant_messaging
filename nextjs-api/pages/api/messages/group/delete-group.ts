import { authenticate } from "../../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  const userId = (req as any).user.userId;
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const groupChat = await db
      .collection("groupChats")
      .findOne({ _id: new ObjectId(groupId as string) });

    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (userId !== groupChat.adminId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not the admin of this group" });
    }

    const result = await db
      .collection("groupChats")
      .deleteOne({ _id: new ObjectId(groupId as string) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    return res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);

// http://localhost:3000/api/group/delete-group?groupId=67aa2cf35a5b1e4d809779b6
