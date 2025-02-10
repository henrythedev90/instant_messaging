import { authenticate } from "../../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupChat, GroupMember } from "../../../../backend/types/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId, memberId } = req.body;
    const userId = (req as any).user.userId;

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

    if (groupChat.admin._id.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You must be the admin to add members" });
    }

    const isMember = groupChat.members.some(
      (member) => member.userId.toString() === memberId
    );

    if (isMember) {
      return res
        .status(400)
        .json({ message: "User is already a member of the group" });
    }

    const user = await db.collection("imUsers").findOne({
      _id: new ObjectId(memberId as string),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.collection("groupChats").updateOne(
      { _id: new ObjectId(groupId as string) },
      {
        $addToSet: {
          members: {
            userId: new ObjectId(memberId as string),
            username: user.username,
            joinedAt: new Date().toLocaleString(),
          },
        },
      }
    );

    res.status(200).json({ message: "Member added to group" });
  } catch (error) {
    console.error("Error adding member to group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
