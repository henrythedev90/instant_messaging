import { authenticate } from "../../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupChat, GroupMember } from "../../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId, memberId, username } = req.body;
    const userId = (req as any).user.userId;

    // Validate ObjectId format
    if (!ObjectId.isValid(groupId) || !ObjectId.isValid(memberId)) {
      return res
        .status(400)
        .json({ message: "Invalid group ID or member ID format" });
    }

    const groupChat = await db.collection("groupChats").findOne<GroupChat>({
      _id: new ObjectId(groupId as string),
    });

    if (!groupChat) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (groupChat.adminId.toString() !== userId && userId !== memberId) {
      return res
        .status(403)
        .json({ message: "You must be the admin to delete users" });
    }

    // Check if member exists in group
    const memberExists = groupChat.members.some(
      (member) => member.username === username
    );
    if (!memberExists) {
      return res.status(404).json({ message: "Member not found in group" });
    }

    const result = await db.collection("groupChats").updateOne(
      { _id: new ObjectId(groupId as string) },
      {
        $pull: {
          members: { username: username } as any,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Failed to remove member" });
    }

    res.status(200).json({ message: "Member deleted from group" });
  } catch (error) {
    console.error("Error deleting member from group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
