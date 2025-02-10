import { authenticate } from "../../../../backend/middleware/authenticate";
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../../../backend/config/mongodb";
import { ObjectId } from "mongodb";
import { GroupMember } from "../../../../backend/types/types";
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("Cluster0");

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { groupId, newAdmin } = req.body;
    const currentUser = (req as any).user.username;

    const groupChat = await db
      .collection("groupChats")
      .findOne({ _id: new ObjectId(groupId as string) });
    if (!groupChat) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    const isMember = await db
      .collection("imUsers")
      .findOne({ username: newAdmin });

    if (!isMember) {
      return res.status(404).json({ message: "New admin not found" });
    }

    if (currentUser !== groupChat.admin.username) {
      return res
        .status(403)
        .json({ message: "You are not the admin of this group" });
    }
    if (newAdmin === currentUser) {
      return res
        .status(400)
        .json({ message: "You cannot change the admin to yourself" });
    }
    if (
      !groupChat.members.some(
        (member: GroupMember) => member.username === newAdmin
      )
    ) {
      return res.status(400).json({
        message: "You cannot change the admin to a non-member of the group",
      });
    }

    await db
      .collection("groupChats")
      .updateOne(
        { _id: new ObjectId(groupId as string) },
        { $set: { admin: { _id: isMember._id, username: isMember.username } } }
      );

    return res.status(200).json({ message: "Admin updated successfully" });
  } catch (error) {
    console.error("Error updating admin:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default authenticate(handler);
