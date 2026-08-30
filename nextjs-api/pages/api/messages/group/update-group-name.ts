import { authenticate } from "../../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId, newGroupName } = req.body;
    const userId = (req as any).user.userId;

    if (!groupId || !newGroupName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const groupChat = await db
      .collection("groupChats")
      .findOne({ _id: new ObjectId(groupId as string) });

    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    if (groupChat.adminId.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not the admin of this group" });
    }

    // Then update the group name
    await db
      .collection("groupChats")
      .updateOne(
        { _id: new ObjectId(groupId as string) },
        { $set: { groupName: newGroupName } }
      );

    return res.status(200).json({ message: "Group name updated successfully" });
  } catch (error) {
    console.error("Error updating group name:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);

// http://localhost:3000/api/group/update-group-name?groupId=67aa2cf35a5b1e4d809779b6&newGroupName=NewGroupName
